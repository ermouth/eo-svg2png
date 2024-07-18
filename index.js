const sevruga = require('sevruga');
const fs = require('fs');
const Jimp = require('jimp');
const deferred = require('deferred');
const {DOMParser, XMLSerializer} = require('@xmldom/xmldom');
const xpath = require('xpath');

var opts = {
  width:      800,
  isDrainage: true,
  fname:      __dirname + '/dr1.svg',
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

  var svg = !opts.fname ? svgString : fs.readFileSync(opts.fname, {encoding: 'utf8'}),
      width = typeof opts.width != 'number' ? 500 : _clamp(opts.width, 10, 3000) | 0;

  return svgRenderToBuf(svg)
  .then(imageBufferToPNG)
  .then(pngBuf => {
    if (opts.fname) fs.writeFileSync(opts.fname.replace(/\.svg$/i,'.png'), pngBuf);
    return pngBuf;
  })
  .catch();

  
  // =======================
  
  async function svgRenderToBuf(svg) {
    // get root node and dimensions
    var root = svg.match(/<svg [^>]+>/)[0],
        props = [...root.matchAll(/(x|y|width|height)="(-?[0-9\.]+)"/g)],
        dim = {}; 
    // source dimensions raw
    props.forEach(e=>dim[e[1]]=+e[2]|0);

    // get current viewBox
    var vbox = root.match(/viewBox="([^"]+)"/)[1].split(/[, ]+/).map(n=>Math.round(+n));
    if (vbox.length != 4) throw new TypeError('Incomplete SVG viewBox');

    //console.log(vbox, dim);

    // check if we already have nearly good viewBox
    if (dim.width && dim.height && Math.abs((dim.width/dim.height) - (vbox[2]/vbox[3])) < 0.05) {
      // we likely have a valid viewBox
      dim = {x:vbox[0],y:vbox[1],width:vbox[2],height:vbox[3]};
    }

    var k = width / dim.width,
        d1 = {width:Math.round(dim.width*k), height:Math.round(dim.height*k)};

    // Fix drainage
    if (opts.isDrainage) {
      ({svg,dim} = fixDrainageQuirks(svg, dim));
    }

    var k = width / dim.width,
        d1 = {width:Math.round(dim.width*k), height:Math.round(dim.height*k)};
  
    // rebuild SVG root node, no x and y attributes
    var newroot = `<svg xmlns="http://www.w3.org/2000/svg" 
    xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" 
    viewBox="${dim.x},${dim.y},${dim.width},${dim.height}"
    width="${d1.width}" height="${d1.height}">`;
    svg = svg.replace(root, newroot);

    // fix no font-family defined
    if (svg.indexOf('font-family="') == -1) {
      svg = svg.replace(/<g>/g, `<g font-family="${opts.font}">`)
    }

    // svg = fixLines(svg); // fix lines maybe
  
    // create buf and fill it with white
    var renderBuf = Buffer.alloc(d1.width * d1.height * 4);
    renderBuf.fill(255);
  
    await sevruga.renderSVG(svg, renderBuf, d1);
    return {buf:renderBuf, dim:d1, scale:k};
  }

  // =======================

  function fixDrainageQuirks(svg, dim){
    // add 2.5% more canvas space left and right
    dim.x = (dim.x - dim.width * 0.025) | 0;
    dim.width = dim.width * 1.05 | 0;
    // manipulate XML DOM then
    var doc = new DOMParser().parseFromString(svg,'text/xml'),
        xfind = xpath.useNamespaces({"v": "http://www.w3.org/2000/svg"}),
        titleNode = xfind('//v:g[@id="text"]/v:text[1]', doc)[0],
        lineNode = xfind('//v:g[@id="sectionals"]/v:g/v:path', doc)[0];

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
        newY = bbox[1] - 300; // new title baseline
    
    titleNode.setAttribute('y', newY);
    titleNode.setAttribute('x', bbox[0] + 150);

    // change dim
    dim.height = dim.height - Math.abs(titleY - newY);
    dim.y = dim.y + Math.abs(titleY - newY);

    //console.log(titleNode.textContent, bbox);
    var newSVG = new XMLSerializer().serializeToString(doc);
    return {svg:newSVG, dim}
  }


  // =======================

  function imageBufferToPNG ({buf, dim, scale}){
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
      if (scale<1 && dim.width<1000) {
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

  function fixLines(svg) {
    var svg = svg;
    // drop non-scaling strokes, they produce too faint lines
    svg = svg.replace(/vector-effect="non-scaling-stroke"/g,'');
    // fix too narrow linewidths
    if (k<1) svg = svg.replace(/stroke\-width="1"/g,`stroke-width="${k<0.5?10:5}"`);
    return svg;
  }

  // =======================

  function _clamp(x, a, b) {
    return Math.max(a, Math.min(x, b));
  }
}