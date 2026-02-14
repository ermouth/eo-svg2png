const { DOMParser, XMLSerializer } = require('@xmldom/xmldom'),
      { Jimp, JimpMime } = require('jimp'),
      { Resvg } = require('@resvg/resvg-js');

// Converts SVG document string into bitmap buffer,
// returns Promise which is resolved with Buffer.

// Fixes inconsistent x,y,width,height,viewBox 
// in root <svg> node

module.exports = {
  default: renderSVGtoImage,
  renderSVGtoImage,
  preprocessSVG,
  renderSVGToBuffer,
  bufferToImage
};

// =======================

function renderSVGtoImage(svgString, opts0){
  let opts = {
    format:  'png',          // output format, png/jpg, former is default, jpg is ~5x slower
    width:   500,            // default target bitmap width
    background: [255,255,255,255],  // background color, RGBA array or CSS3 color srtring
    font:    'OpenGost Type B TT',  // default font, enforced by fixDrainage and forceFont plugins
                            
    filters: [],             // array of SVG preprocessors to run (see /filters folder)
    quality: 60,             // default JPEG quality
    sharpen: 0,              // sharpen -2…2, negatives do strange things, 3…20x slower if !=0,
                             // also modifies bg color into alfa-blend mode if non-zero 
    viewBoxAsXYWH: false,    // if viewBox is present use for as w,y,width,height 
    viewBoxCheck: false,     // apply viewBox check if w,y,width,height <svg> attrs present
    fname:   '',             // non-empty is for testing, takes a file from fs and saves to fs
    ...opts0
  };

  opts.width = typeof opts.width != 'number' ? 500 : _clamp(opts.width, 10, 5000) | 0;
  opts.format = /^jp[e]?g$/i.test(opts.format+'') ? 'jpeg' : 'png';

  var fname = opts.fname,
      svgString = !fname ? svgString 
      : require('fs').readFileSync(fname, {encoding: 'utf8'});
  
  return preprocessSVG(svgString, opts)
  .then(renderSVGToBuffer)
  .then(bufferToImage)
  .then(buf => {
    if (fname) require('fs').writeFileSync(
      fname.replace(/\.svg$/i,'.'+opts.format), buf
    );
    return buf;
  });
}

// =======================

async function preprocessSVG(svgString, opts){
  // get root node and dimensions
  let rootString = svgString.match(/<svg [^>]+>/)[0],
      props = [...rootString.matchAll(/(x|y|width|height)\s?=\s?"(-?[0-9\.]+)[^"]{0,4}"/g)],
      dim = {x:0, y:0},
      vbox = []; 
  // source dimensions raw
  props.forEach(e => dim[e[1]] = Math.round(parseFloat(e[2])));

  // get current viewBox
  let root = rootString.match(/viewBox="([^"]+)"/);
  if (root) vbox = rootString.match(/viewBox="([^"]+)"/)[1].split(/[, ]+/).map(n=>Math.round(+n));
  if (vbox.length && vbox.length != 4) throw new TypeError('Incomplete SVG viewBox');

  // check if we already have reasonable viewBox
  if (
    opts.viewBoxCheck && dim.height && vbox.length && vbox[3] 
    && Math.abs((dim.width/dim.height) - (vbox[2]/vbox[3])) < 0.001
  ) {
    dim = {x:vbox[0], y:vbox[1], width:vbox[2], height:vbox[3]};
  }
  else if (
    opts.viewBoxAsXYWH || dim.x == null || dim.y == null 
    || dim.width == null || dim.height == null
  ){
    if (!vbox.length) throw new TypeError('Wrong SVG: no x,y,width,height and no viewBox');
    dim = {x:vbox[0], y:vbox[1], width:vbox[2], height:vbox[3]};
  }

  let newSVG = svgString;

  if (opts.filters && opts.filters.length) {
    // filters require SVG DOM
    let svg = new DOMParser().parseFromString(svgString,'text/xml');
    // run filters one by one
    opts.filters.forEach(filterName => {
      ({svg,dim} = require('./filters/'+filterName+'.js')(svg, dim, opts));
    });
    // back to string
    newSVG = new XMLSerializer().serializeToString(svg);
  }

  // rebuild SVG root node, no x and y attributes
  let k = opts.width / dim.width;
  let d1 = {
    width:  Math.round(dim.width  * k), 
    height: Math.round(dim.height * k)
  };
  
  let newroot = '<svg xmlns="http://www.w3.org/2000/svg" ' 
      + 'xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" ' 
      + `viewBox="${dim.x},${dim.y},${dim.width},${dim.height}" `
      + `width="${d1.width}" height="${d1.height}">`;

  newSVG = newSVG.replace(/<svg [^>]+>/, newroot);

  return {svg:newSVG, dim:d1, opts};
}

// =======================

async function renderSVGToBuffer({svg, opts}) {
  let clr, bg = opts?.background || [0,0,0,0];
  if (!Array.isArray(bg)) clr = bg; else {
    bg = bg.length == 3 ? bg.concat([255]) : bg,
    clr = `rgba(${bg[0]},${bg[1]},${bg[2]},${bg[3]/255})`;
  }
  let reopts = {
    background: clr,
    fitTo: { mode:'width', value:opts.width },
    font:{
      fontFiles:[
        './fonts/Asket-Narrow-Light.ttf',
        './fonts/FiraSansCondensed-Regular.ttf',
        './fonts/OpenGostTypeB.ttf',
      ].concat(opts.fontFiles || []),
      loadSystemFonts: false
    }
  };
  if (opts.font) reopts.font.defaultFontFamily = opts.font;
  if (opts.fontBuffers) reopts.font.fontBuffers = opts.fontBuffers;

  const resvg = new Resvg(svg, reopts),
        img = resvg.render(),
        buf = img.pixels,
        dim = {width:img.width, height:img.height},
        png = opts.format=='png' && !opts.sharpen 
            ? img.asPng() : null;

  return {png, dim, buf, opts};
}

// =======================

function bufferToImage({png, buf, dim, opts}){
  var fmt = JimpMime[opts.format || 'png'],
      iopts = {};

  if (fmt == JimpMime.png && !opts.sharpen) {
    // do nothing, resolve with ready-to-use image
    return Promise.resolve(png);
  }
  else {
    let img = new Jimp({data:buf, ...dim}),
        sa = -_clamp(+opts.sharpen || 0, -2, 2);
    //sharpen image
    if (sa) img.convolute([
      [sa,  sa,     sa], 
      [sa, -sa*8+1, sa], 
      [sa,  sa,     sa]
    ]);
    //get output
    if (fmt == JimpMime.jpeg) {
      iopts.quality = _clamp(opts.quality || 90, 1, 100);
    }
    return img.getBuffer(fmt, iopts)
  }
}

// =======================

function _clamp(x, a, b) {return Math.max(a, Math.min(x, b))}

