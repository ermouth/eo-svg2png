const xpath = require('xpath');

// Энфорсит шрифт из opts.font всем текстам
// Возвращает {svg, dim}

module.exports = exports = function fixDrainage(svg, dim, opts){
  var xfind = xpath.useNamespaces({ v:'http://www.w3.org/2000/svg' });

  // find texts
  var textNodes = xfind('//v:text', svg) || [];
  textNodes.forEach((node) => _attrs(node, {'font-family': opts.font}));
  var textNodes = xfind('//v:tspan', svg) || [];
  textNodes.forEach((node) => _attrs(node, {'font-family': opts.font}));

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
