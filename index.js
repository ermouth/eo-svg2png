const { DOMParser, XMLSerializer } = require('@xmldom/xmldom'),
      { Jimp, JimpMime } = require('jimp'),
      { Resvg } = require('@resvg/resvg-js'),
      { round, abs, min, max } = Math,
      { assign, keys } = Object;

// Converts SVG document string into bitmap buffer,
// returns Promise which is resolved with Buffer.

// Fixes inconsistent x,y,width,height,viewBox 
// in root <svg> node

module.exports = {
  default: renderSVGtoImage,
  renderSVGtoImage,
  preprocessSVG,
  preprocessSVGSync,
  renderSVGToBuffer,
  bufferToImage
};

// =======================

function renderSVGtoImage(svgString, opts0){
  let opts = {
    format:  'png',          // output format, png/jpg, former is default, jpg is ~5x slower
    width:   500,            // default target bitmap width, pixels
    height:  null,           // max height, width is reduced if height is exceeded
    background: [255,255,255,255],  // background color, RGBA array or CSS3 color srtring
    font:    'OpenGost Type B TT',  // default font, enforced by fixDrainage and forceFont plugins
                            
    filters: [],             // array of SVG preprocessors to run (see /filters folder)

    crop:    false,          // crop empty margins, better used with 'removeInvisible' filter
    bleed:   2,              // padding for cropped image, pixels, should be < width/2
    
    quality: 60,             // default JPEG quality
    sharpen: 0,              // sharpen -2…2, negatives do strange things, 3…20x slower if !=0,
                             // also modifies bg color into alfa-blend mode if non-zero 
    viewBoxAsXYWH: false,    // if viewBox is present use for as w,y,width,height 
    viewBoxCheck: false,     // apply viewBox check if w,y,width,height <svg> attrs present
    fname:   '',             // non-empty is for testing, takes a file from fs and saves to fs
    ...opts0
  };

  opts.width = typeof opts.width != 'number' ? 500 : clamp(opts.width, 10, 5000) | 0;
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
  let res = preprocessSVGSync(svgString, opts);
  return res;
}

// =======================

function preprocessSVGSync(svgString, opts){
  // get root node and dimensions
  let rootString = svgString.replace(/[\r\n]/g,' ').match(/<svg [^>]+>/s)[0],
      props = [...rootString.matchAll(/(x|y|width|height)\s?=\s?"(-?[0-9\.]+)[^"]{0,4}"/g)],
      hasFilters = opts.filters && opts.filters.length,
      dim = {},
      vbox = []; 
  // source dimensions raw
  props.forEach(e => dim[e[1]] = round(parseFloat(e[2])));

  // get current viewBox
  let root = rootString.match(/viewBox="([^"]+)"/s);
  if (root) vbox = rootString.match(/viewBox="([^"]+)"/)[1].split(/[, ]+/).map(n=>round(+n));
  if (vbox.length && vbox.length != 4) throw new TypeError('Incomplete SVG viewBox');

  // check if we already have reasonable viewBox
  if (
    opts.viewBoxCheck && dim.height && vbox.length && vbox[3] 
    && abs((dim.width/dim.height) - (vbox[2]/vbox[3])) < 0.001
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

  let newSVG = svgString,
      svg = null;

  // remove invisibles and pre-crop
  if (opts.crop) {
    svg = SVGtoDOM(svgString);
    ({svg} = require('./filters/removeInvisible.js')(svg, dim));
    newSVG = new XMLSerializer().serializeToString(svg);
    dim = getCroppedDims(newSVG, opts) || dim;
  }

  if (hasFilters) {
    // filters require SVG DOM
    svg = svg || SVGtoDOM(svgString);
    // run filters one by one
    opts.filters.forEach(filter => {
      let t = typeof filter,
          filterName = '', 
          params = {}, 
          fn = function(svg,dim){return{svg,dim}};
      if (t == 'function') fn = filter;
      else {
        if (t == 'string') filterName = filter;
        else {
          filterName = keys(filter)[0];
          params = filter[filterName];
        }
        if (!filterName) return;
        fn = require('./filters/'+filterName+'.js');
      }
      ({svg,dim} = fn(svg, dim, opts, params));
    });
    // back to string
    newSVG = new XMLSerializer().serializeToString(svg);
  }

  // try to re-crop after plugins
  if (opts.crop && hasFilters) {
    dim = getCroppedDims(newSVG, opts) || dim;
  }

  // Calculate scaling factor
  let k = 1 / max(
    null != opts.height ? dim.height / opts.height : -1, 
    dim.width / opts.width
  );

  // rebuild SVG root node, no x and y attributes
  let d1 = {
    width:  round(dim.width  * k), 
    height: round(dim.height * k)
  };
  
  let newroot = '<svg xmlns="http://www.w3.org/2000/svg" ' 
      + 'xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" ' 
      + `viewBox="${dim.x},${dim.y},${dim.width},${dim.height}" `
      + `width="${d1.width}" height="${d1.height}">`;

  newSVG = newSVG.replace(/<svg [^>]+>/, newroot);
  return {svg:newSVG, dim:d1, bbox:dim, opts};
}

// =======================

async function renderSVGToBuffer({svg, opts, dim}) {
  let resvg = new Resvg(svg, getReSVGOpts(assign({}, opts, dim))),
      img = resvg.render(),
      buf = img.pixels,
      dim1 = {width:img.width, height:img.height},
      png = opts.format=='png' && !opts.sharpen 
          ? img.asPng() : null;
  return {png, dim:dim1, buf, opts, resvg};
}

// =======================

async function bufferToImage({png, buf, dim, opts}){
  var fmt = JimpMime[opts.format || 'png'];

  if (fmt == JimpMime.png && !opts.sharpen) {
    // do nothing, resolve with ready-to-use image
    return Promise.resolve(png);
  }
  else {
    let img = new Jimp({data:buf, ...dim}),
        sa = -clamp(+opts.sharpen || 0, -2, 2);
    //sharpen image
    if (sa) img.convolute([
      [sa,  sa,     sa], 
      [sa, -sa*8+1, sa], 
      [sa,  sa,     sa]
    ]);
    //get output
    let iopts = {};
    if (fmt == JimpMime.jpeg) {
      iopts.quality = clamp(opts.quality || 90, 1, 100);
    }
    return img.getBuffer(fmt, iopts)
  }
}

// =======================

function getCroppedDims(svg, opts){
  let bb = new Resvg(svg, getReSVGOpts(opts)).getBBox(),
      bleed = opts.bleed || 0,
      dim = null;
  if (bb.width) {
    let d = bleed * Math.max(
      opts.height ? bb.height/(opts.height - bleed*2) : -1,
      bb.width/(opts.width - bleed*2)
    );
    dim = {
      x: round(bb.x-d), 
      y: round(bb.y-d),
      width:  round(bb.width+d*2), 
      height: round(bb.height+d*2)
    };
  }
  return dim; 
}

// =======================

function getReSVGOpts(opts) {
  let clr, bg = opts?.background || [0,0,0,0];
  if (!Array.isArray(bg)) clr = bg; else {
    bg = bg.length == 3 ? bg.concat([255]) : bg,
    clr = `rgba(${bg[0]},${bg[1]},${bg[2]},${bg[3]/255})`;
  }
  let o = {
    background: clr,
    //fitTo: { mode:'width', value:opts.width },
    font:  { loadSystemFonts: false }
  };
  if (opts.fontFiles && opts.fontFiles.length) {
    o.font.fontFiles = opts.fontFiles;
  }
  if (opts.font) o.font.defaultFontFamily = opts.font;
  if (opts.fontBuffers) o.font.fontBuffers = opts.fontBuffers;
  return o;
}

// =======================

function SVGtoDOM(s){
  return new DOMParser().parseFromString(s,'text/xml');
}
function clamp(x, a, b) {return max(a, min(x, b))}


