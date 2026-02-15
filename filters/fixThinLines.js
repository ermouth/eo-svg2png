const xpath = require('xpath');

// Энфорсит шрифт из opts.font всем текстам
// Возвращает {svg, dim}

module.exports = exports = function fixThinLines(svg, dim, opts, params){
  let xfind = xpath.useNamespaces({ v:'http://www.w3.org/2000/svg' }),
      popts = Object.assign({
        minLineWidth: 1
      }, params||{});

  let lw = popts.minLineWidth * dim.width / opts.width;

  // Fix font-family
  ['//*[@stroke-width]'].forEach(xpath => {
    let textNodes = xfind(xpath, svg) || [];
    textNodes.forEach(node => {
      let w = parseInt(node.getAttribute('stroke-width')) || 0;
      if (w < lw) _attrs(node, {'stroke-width': lw+''})
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