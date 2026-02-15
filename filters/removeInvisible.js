const xpath = require('xpath');

// Удаляет невидимки
// Возвращает {svg, dim}

module.exports = exports = function removeInvisible(svg, dim, opts){
  let xfind = xpath.useNamespaces({ v:'http://www.w3.org/2000/svg' });

  // Remove invisibles
  [
    '//v:*[@visibility="hidden"]',
    '//v:path[@d=""]'
  ].forEach(xpath => {
    let textNodes = xfind(xpath, svg) || [];
    //console.log('Invis '+xpath, textNodes.length)
    textNodes.forEach(node => node.parentNode.removeChild(node));
  });

  return {svg, dim};
}

