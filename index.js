const sevruga = require('sevruga');
const fs = require('fs');
const Jimp = require('jimp');
const deferred = require('deferred');
const {DOMParser, XMLSerializer} = require('@xmldom/xmldom');
const xpath = require('xpath');

// Converts SVG document string into bitmap buffer,
// returns Promise which is resolved with Buffer.

// Fixes inconsistent x,y,width,height,viewBox 
// in root <svg> node

function renderSVGtoImage(svgString, opts){
  var opts = {
    fname:      '',             // non-empty is for testing, takes a file from fs and saves to fs
    width:      500,            // default target bitmap width
    filters:    [],             // array of names of SVG filters to call (see /filters folder)
    font:       'GOST type B',  // default font
    background: [255,255,255,255],  // background color, RGBA
    format:     'png',          // output format, png/jpg, former is default
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
      props = [...rootString.matchAll(/(x|y|width|height)\s?=\s?"(-?[0-9\.]+)[^"]{0,4}"/g)],
      dim = {}; 
  // source dimensions raw
  props.forEach(e => dim[e[1]] = Math.round(parseFloat(e[2])));

  // get current viewBox
  var vbox = rootString.match(/viewBox="([^"]+)"/)[1].split(/[, ]+/).map(n=>Math.round(+n));
  if (vbox.length && vbox.length != 4) throw new TypeError('Incomplete SVG viewBox');

  // check if we already have reasonable viewBox
  if (
    dim.height && vbox.length && vbox[3] 
    && Math.abs((dim.width/dim.height) - (vbox[2]/vbox[3])) < 0.005
  ) {
    dim = {x:vbox[0], y:vbox[1], width:vbox[2], height:vbox[3]};
  }
  else if (dim.x == null || dim.y == null ||  dim.width == null ||  dim.height == null){
    throw new TypeError('Incomplete SVG x,y,width,height');
  }

  var newSVG = svgString;

  if (opts.filters && opts.filters.length) {
    // filters require SVG DOM
    var svg = new DOMParser().parseFromString(svgString,'text/xml');

    // run filters one by one
    opts.filters.forEach(function(filterName){
      ({svg,dim} = require('./filters/'+filterName+'.js')(svg, dim, opts));
    });

    // back to string
    var newSVG = new XMLSerializer().serializeToString(svg);
  }

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
  var buf = Buffer.alloc((dim.width | 0) * (dim.height | 0) * 4),
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

function _clamp(x, a, b) {
  return Math.max(a, Math.min(x, b));
}

module.exports = {
  default: renderSVGtoImage,
  renderSVGtoImage,
  preprocessSVG,
  renderSVGToBuf,
  bufferToImage
};