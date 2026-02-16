const xpath = require('xpath');

// Энфорсит шрифт из opts.font всем текстам
// Возвращает {svg, dim}

module.exports = exports = function fixThinLines(svg, dim, opts, params){
  const { assign } = Object;
  let xfind = xpath.useNamespaces({ v:'http://www.w3.org/2000/svg' });
  let popts = Object.assign({
        minLineWidth: 1,
        miterLimit: 2,
        removeVectorEffect: true
      }, params||{});

  let lw = popts.minLineWidth * dim.width / opts.width;
  let opts2 = {'stroke-miterlimit': popts.miterLimit};
  if (popts.removeVectorEffect) opts2['vector-effect'] = null;
  let opts1 = {'stroke-width': lw+'', ...opts2};

  // Fix stroke
  ['//v:*[@stroke-width]'].forEach(xpath => {
    let textNodes = xfind(xpath, svg) || [];
    textNodes.forEach(node => {
      let w = parseInt(node.getAttribute('stroke-width')) || 0;
      if (w < lw) {
        _attrs(node, opts1);
        let unscale = xfind('//v:*[@vector-effect="non-scaling-stroke"]',node) || [];
        unscale.forEach(u => _attrs(u, opts2));
      }
    });
  });

  return {svg, dim};
}

// =======================

function _attrs(node, attrs) {
  Object.entries(attrs).forEach(([k,v]) => {
    if (v==null) node.removeAttribute(k);
    else node.setAttribute(k, v+'');
  });
  return node;
}