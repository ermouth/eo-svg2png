const xpath = require('xpath');

// Энфорсит шрифт из opts.font всем текстам
// Возвращает {svg, dim}

module.exports = exports = function forceFont(svg, dim, opts){
  let xfind = xpath.useNamespaces({ v:'http://www.w3.org/2000/svg' });

  // Fix font-family
  ['//v:text', '//v:tspan'].forEach(xpath => {
    let textNodes = xfind(xpath, svg) || [];
    textNodes.forEach(node => _attrs(node, {'font-family': opts.font || null}));
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
