const namespaces = {v:'http://www.w3.org/2000/svg'},
      xpath = require('xpath');

// Removes invisibles, runs first implicitly if opts.crop==true
// Returns {svg, dim}

module.exports = exports = function removeInvisible(svg, dim){

  // Remove invisibles
  findVoids(svg).forEach(node => {
    node.parentNode && node.parentNode.removeChild(node)
  });

  return {svg, dim};
}

// =======================

// List of XPath selectors to pre-compile
const xpaths = [
  '//v:*[@visibility="hidden"]',
  '//v:path[@d=""]',
  '//v:g[not(node())]'
].map(s => xpath.parse(s));

function findVoids(node) {
  return xpaths.flatMap(xp => xp.select({node, namespaces}));
}
