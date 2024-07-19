const sevruga = require('sevruga');
const fs = require('fs');
const Jimp = require('jimp');
const deferred = require('deferred');
const {DOMParser, XMLSerializer} = require('@xmldom/xmldom');
const xpath = require('xpath');

// Converts SVG document string into PNG buffer,
// returns Promise which is resolved with Buffer.

// Fixes inconsistent x,y,width,height,viewBox 
// in root <svg> node, also fixes special
// cases like drainage sketch quirks.

function renderSVGtoImage(svgString, opts){
  var opts = {
    fname:      '',             // non-empty is for testing, takes a file from fs and saves to fs
    width:      500,            // default target PNG width
    isDrainage: false,          // is source SVG a drainage sketch
    font:       'GOST type B',  // default font
    background: [255,255,255,255],  // background color, RGBA
    format:     'png',          // output format, png,jpg or any other for Canvas Buffer
    sharpen:    0.1,            // sharpen result bitmap, 0…1
    ...opts
  };

  opts.width = typeof opts.width != 'number' ? 500 : _clamp(opts.width, 10, 3000) | 0;

  var fname = opts.fname,
      svgString = !fname ? svgString : fs.readFileSync(fname, {encoding: 'utf8'});
  
  return preprocessSVG(svgString, opts)
  .then(renderSVGToBuf)
  .then(bufferToImage)
  .then(buf => {
    if (fname) fs.writeFileSync(fname.replace(/\.svg$/i,'.'+opts.format), buf);
    return buf;
  });
}


// =======================

async function preprocessSVG(svgString, opts){
  // get root node and dimensions
  var rootString = svgString.match(/<svg [^>]+>/)[0],
      props = [...rootString.matchAll(/(x|y|width|height)="(-?[0-9\.]+)"/g)],
      dim = {}; 
  // source dimensions raw
  props.forEach(e=>dim[e[1]]=+e[2]|0);

  // get current viewBox
  var vbox = rootString.match(/viewBox="([^"]+)"/)[1].split(/[, ]+/).map(n=>Math.round(+n));
  if (vbox.length != 4) throw new TypeError('Incomplete SVG viewBox');

  // check if we already have reasonable viewBox
  if (dim.height && vbox[3] && Math.abs((dim.width/dim.height) - (vbox[2]/vbox[3])) < 0.05) {
    dim = {x:vbox[0], y:vbox[1], width:vbox[2], height:vbox[3]};
  }

  // go with SVG DOM then
  var svg = new DOMParser().parseFromString(svgString,'text/xml');

  // Fix drainage sketch gaps
  if (opts.isDrainage) {
    ({svg,dim} = fixDrainageQuirks(svg, dim, opts));
  }

  // Here we can add more contextual SVG processors

  // back to string
  var newSVG = new XMLSerializer().serializeToString(svg);

  // rebuild SVG root node, no x and y attributes
  var k = opts.width / dim.width,
  d1 = {width:Math.round(dim.width*k), height:Math.round(dim.height*k)};
  
  var newroot = `<svg xmlns="http://www.w3.org/2000/svg" 
  xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" 
  viewBox="${dim.x},${dim.y},${dim.width},${dim.height}"
  width="${d1.width}" height="${d1.height}">`;

  newSVG = newSVG.replace(/<svg [^>]+>/, newroot);

  // fix missing font-family
  if (newSVG.indexOf('font-family="') == -1) {
    newSVG = newSVG.replace(/<g>/g, `<g font-family="${opts.font}">`)
  }
  return {svg:newSVG, dim:d1, opts};
}

// =======================

async function renderSVGToBuf({svg, dim, opts}) {
  var buf = Buffer.alloc(dim.width * dim.height * 4),
      b = (opts || {}).background || [0,0,0,0];
  
  // Set background and render
  buf.fill(Buffer.from([b[2],b[1],b[0],b[3]]));
  await sevruga.renderSVG(svg, buf, dim);

  // shuffle OpenGL style ARGB LE result
  // into more common Canvas style RGBA BE
  for (var pix, i=0; i<buf.length; i+=4) {
    pix = buf.readInt32LE(i) & 0xffffff;
    buf.writeInt32BE(pix << 8 | buf[i+3], i);
  }

  return {buf, dim, opts};
}

// =======================

function bufferToImage({buf, dim, opts}){
  var future = deferred(),
      fmt = /^jp[e]?g$/i.test((opts||{}).format+'') 
            ? Jimp.MIME_JPEG 
            : Jimp.MIME_PNG
  
  // make output
  new Jimp({data: buf, ...dim}, (err,img) => {
    if (err) future.reject(err);

    // sharpen image
    var sa = -_clamp(+opts.sharpen, -1, 1);
    if (sa) img.convolute([[sa,sa,sa], [sa,-sa*8+1,sa], [sa,sa,sa]]);
    
    // send/write output
    img.getBuffer(fmt, (err, dataBuf) => {
      if (err) future.reject(err);
      else future.resolve(dataBuf);
    });
  });

  return future.promise;
}

// =======================

function fixDrainageQuirks(svg, dim, opts){
  var xfind = xpath.useNamespaces({ v:'http://www.w3.org/2000/svg' }),
      titleNode = xfind('//v:g[@id="text"]/v:text[1]', svg)[0],
      lineNode = xfind('//v:g[@id="sectionals"]/v:g/v:path', svg)[0];

  // likely not a drainage
  if (!lineNode || !titleNode) return {svg, dim, opts};

  // detect bounding box of the drainage contour 
  var coordStringPairs = [...lineNode.getAttribute('d').matchAll(/\w[0-9\-\.,\s]+/g)],
      bbox = [1e6,1e6,-1e6,-1e6],
      px, py;
  
  coordStringPairs.map(_=>_[0]).forEach(function(s,i){
    var cmd = s[0], v = s.substr(1).split(/[, ]+/).map(Number);
    if (!i || /[A-Z]/.test(cmd)) px = v[0], py = v[1];
    else px += v[0], py += v[1];
    if (px < bbox[0]) bbox[0] = px; else if (px > bbox[2]) bbox[2] = px;
    if (py < bbox[1]) bbox[1] = py; else if (py > bbox[3]) bbox[3] = py;
  });

  // thicker line
  _attrs(lineNode, {
    'stroke-width': 5,
    'stroke-linejoin': 'round',
    'stroke-miterlimit': 0.5,
    'vector-effect': null
  });

  // make non-title text bit smaller to reduce
  // probability of dim texts overlap
  var textNodes = xfind('//v:g[@id="text"]/v:text', svg);
  textNodes.forEach((node, i) => {
    // skip title and long lines which are likely not dimensions
    if (!i || node.textContent.length > 6) return; 
    _attrs(node, {'font-size': node.getAttribute('font-size') * 0.8 | 0})
  });

  // move title text
  var titleY = +titleNode.getAttribute('y'),
      newY = bbox[1] - 300, // new title baseline
      dY = Math.abs(titleY - newY);
  
  _attrs(titleNode, {x:bbox[0] + 150, y:newY});

  // change dim
  dim.height = dim.height - dY;
  dim.y = dim.y + dY;

  // add 2.5% more canvas space left and right
  dim.x = (dim.x - dim.width * 0.025) | 0;
  dim.width = dim.width * 1.05 | 0;

  return {svg, dim}
}

// =======================

function _clamp(x, a, b) {
  return Math.max(a, Math.min(x, b));
}

// =======================

function _attrs(node, attrs) {
  Object.entries(attrs).forEach(([k,v]) => {
    if (v==null) node.removeAttribute(k);
    else node.setAttribute(k, v+'');
  });
  return node;
}

module.exports = {
  default: renderSVGtoImage,
  renderSVGtoImage,
  preprocessSVG,
  renderSVGToBuf,
  bufferToImage
};