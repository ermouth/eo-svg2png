const sevruga = require('sevruga');
const fs = require('fs');
const Jimp = require('jimp');
const deferred = require('deferred');
const {DOMParser, XMLSerializer} = require('@xmldom/xmldom');
const xpath = require('xpath');

var opts = {
  width:      800,
  isDrainage: true,  // key showing we have drainage sketch
  fname:      __dirname + '/s3.svg',
  font:       'OpenGost Type B TT',  // font-family=
};

svgRender('', opts)
.then(_ => console.log('Done'))
.catch(err => console.log(`Render failed: ${err}`));


function svgRender(svgString, opts){
  var opts = {
    fname:      '',             // non-empty is for testing, takes a file from fs and saves to fs
    width:      500,            // default target PNG width
    isDrainage: false,          // is source SVG a drainage sketch
    font:       'GOST type B',  // default font
    ...opts
  };

  var svgString = !opts.fname ? svgString : fs.readFileSync(opts.fname, {encoding: 'utf8'}),
      width = typeof opts.width != 'number' ? 500 : _clamp(opts.width, 10, 3000) | 0;

  return preprocessSVG(svgString)
  .then (renderSVGToBuf)
  .then(bufferToPNG)
  .then(pngBuf => {
    if (opts.fname) fs.writeFileSync(opts.fname.replace(/\.svg$/i,'.png'), pngBuf);
    return pngBuf;
  });

  // =======================

  async function preprocessSVG(svgString){
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
      ({svg,dim} = fixDrainageQuirks(svg, dim));
    }

    // Here we can add more contextual SVG processors

    // back to string
    var newSVG = new XMLSerializer().serializeToString(svg);

    // rebuild SVG root node, no x and y attributes
    var k = width / dim.width,
    d1 = {width:Math.round(dim.width*k), height:Math.round(dim.height*k)};
    
    var newroot = `<svg xmlns="http://www.w3.org/2000/svg" 
    xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" 
    viewBox="${dim.x},${dim.y},${dim.width},${dim.height}"
    width="${d1.width}" height="${d1.height}">`;

    newSVG = newSVG.replace(/<svg [^>]+>/, newroot);

    // fix no font-family defined
    if (newSVG.indexOf('font-family="') == -1) {
      newSVG = newSVG.replace(/<g>/g, `<g font-family="${opts.font}">`)
    }
    return {svg:newSVG, dim:d1};
  }

  // =======================
  
  async function renderSVGToBuf({svg, dim}) {
    var renderBuf = Buffer.alloc(dim.width * dim.height * 4);
    renderBuf.fill(255);
    await sevruga.renderSVG(svg, renderBuf, dim);
    return {buf:renderBuf, dim};
  }


  // =======================

  function bufferToPNG({buf, dim}){
    var future = deferred(),
        outArr = [];
    // shuffle bgra into rgba
    for (var r,g,b,a,i=0; i<buf.length; i+=4) {
      r = buf[i+2]; g = buf[i+1]; b = buf[i]; a = buf[i+3];
      outArr.push(r,g,b,a);
    }
    
    new Jimp({data: Buffer.from(outArr), ...dim}, (err,res) => {
      if (err) future.reject(err);

      // if a small image sharpen it a little
      if (dim.width<1000) {
        var sa = -0.1, kernel = [[sa,sa,sa], [sa,-sa*8+1,sa], [sa,sa,sa]];
        res.convolute(kernel);
      }
      
      // send/write output
      res.getBuffer(Jimp.MIME_PNG, (err, pngBuf) => {
        if (err) future.reject(err);
        else future.resolve(pngBuf);
      });
    });

    return future.promise;
  }

  // =======================

  function fixDrainageQuirks(svg, dim){
    var xfind = xpath.useNamespaces({"v": "http://www.w3.org/2000/svg"}),
        titleNode = xfind('//v:g[@id="text"]/v:text[1]', svg)[0],
        lineNode = xfind('//v:g[@id="sectionals"]/v:g/v:path', svg)[0];

    // likely not a drainage
    if (!lineNode || !titleNode) return {svg, dim};

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

    // move title text
    var titleY = +titleNode.getAttribute('y'),
        newY = bbox[1] - 300, // new title baseline
        dY = Math.abs(titleY - newY);
    
    titleNode.setAttribute('y', newY);
    titleNode.setAttribute('x', bbox[0] + 150);

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
}