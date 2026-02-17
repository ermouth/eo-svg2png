const namespaces = {v:'http://www.w3.org/2000/svg'},
      xpath = require('xpath');

// Makes too thin strokes thicker, optionally adds miter limit to them
// Returns {svg, dim}

module.exports = exports = function fixThinLines(svg, dim, opts, params){

  let popts = Object.assign({
    minLineWidth: 1,
    miterLimit: 2
  }, params||{});

  let k = Math.max(
    null != opts.height ? dim.height / opts.height : -1, 
    dim.width / opts.width
  );

  let lw = r2(popts.minLineWidth * k);

  // Fix strokes
  findStrokes(svg).forEach(n => {
    let w = parseFloat(n.getAttribute('stroke-width')) || 0;
    if (w && w < lw) {
      n.setAttribute('stroke-width', lw);
      if (popts.miterLimit) n.setAttribute(
        'stroke-miterlimit', 
        popts.miterLimit
      );
    }
  });

  return {svg, dim};
}

// =======================

const xFindStrokes = xpath.parse('//v:*[@stroke-width]');

function findStrokes (node) {
  return xFindStrokes.select({node, namespaces});
}

function r2(a) {return Math.round(a*100)/100}