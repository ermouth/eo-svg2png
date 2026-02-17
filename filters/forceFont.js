const namespaces = {v:'http://www.w3.org/2000/svg'},
      xpath = require('xpath');

// Sets opts.font for all texts and tspans
// Returns {svg, dim}

module.exports = exports = function forceFont(svg, dim, opts){

  // Fix font-family
  findTexts(svg).forEach(node => _attrs(node, {'font-family': opts.font || null}));

  return {svg, dim};
}

// =======================

// List of XPath selectors to pre-compile
const xpaths = ['//v:text', '//v:tspan'].map(s => xpath.parse(s));

function findTexts(node) {
  return xpaths.flatMap(xp => xp.select({node, namespaces}));
}

function _attrs(node, attrs) {
  Object.entries(attrs).forEach(([k,v]) => {
    if (v==null) node.removeAttribute(k);
    else node.setAttribute(k, v+'');
  });
  return node;
}
