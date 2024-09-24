const {DOMParser, XMLSerializer} = require('@xmldom/xmldom');
const xpath = require('xpath');

// Исправляет SVG водоотливов: придвигает заголовок, 
// чуть расширяет поля справа-слева, задаёт шрифт,
// а также утолщает линию профиля

// svg – SVG DOM object, фильтр его изменяет,
// dim – {x,y,width,height}, также мутируются,
// opts – как в головной либе

// Возвращает {svg, dim}

module.exports = exports = function fixDrainage(svg, dim, opts){
  var xfind = xpath.useNamespaces({ v:'http://www.w3.org/2000/svg' }),
      titleNode, 
      titleNodeTextLength = 0,
      lineNode = xfind('//v:g[@id="sectionals"]/v:g/v:path', svg)[0];

  // likely not a drainage
  if (!lineNode) return {svg, dim};

  // detect bounding box of the drainage contour 
  var coordStringPairs = [...lineNode.getAttribute('d').matchAll(/\w[0-9\-\.,\s]+/g)],
      bbox = [1e6,1e6,-1e6,-1e6],
      px, py;
  
  coordStringPairs.map(_=>_[0]).forEach(function(s,i){
    var cmd = s[0], v = s.substr(1).split(/[, ]+/).map(Number);
    if (!i || /[A-Z]/.test(cmd)) px = v[0], py = v[1];
    else px += v[0], py += v[1];
    if (px < bbox[0]) bbox[0] = px; else if (px > bbox[2]) bbox[2] = px;
    if (py < bbox[1]) bbox[1] = py; else if (py > bbox[3]) bbox[3] = py;
  });

  // thicker line
  _attrs(lineNode, {
    'stroke-width': 5,
    'stroke-linejoin': 'round',
    'stroke-miterlimit': 0.5,
    'vector-effect': null
  });

  // make non-title text bit smaller to reduce
  // probability of dim texts overlap
  var textNodes = xfind('//v:g[@id="text"]/v:text', svg);
  textNodes.forEach((node, i) => {
    // skip title and long lines which are likely not dimensions
    if (node.textContent.length > 6) {
      titleNode = node;
      titleNodeTextLength = node.textContent.length;
    }
    else {
      _attrs(node, {'font-size': node.getAttribute('font-size') * 0.8 | 0});
    }
  });

  if (titleNode) {
    // move title text
    var titleY = +titleNode.getAttribute('y');

    // text on top of drawing
    if (titleY < bbox[1]) {
      
      // new title baseline
      var newY = bbox[1] - 250, 
          dY =  newY - _clamp(titleY, dim.y + 100, dim.y + dim.height - 20);

      _attrs(titleNode, {x:bbox[0] + 10, y:newY});

      // change dim
      dim.height = dim.height - dY;
      dim.y = dim.y + dY;
    }

    // text below drawing
    else if (titleY > bbox[3]) {
      // new title baseline
      var newY = bbox[3] + 250, 
          dY =  _clamp(titleY, dim.y + 100, dim.y + dim.height - 20) - newY;

      _attrs(titleNode, {x:bbox[0] + 10, y:newY});

      // change dim
      dim.height = dim.height - dY;
    }
  }

  // Fix too narrow or small images
  // where title text is truncated
  
  if (dim.width < 30 + titleNodeTextLength * 44) {
    dim.width = 30 + titleNodeTextLength * 44;
  }

  // add 2.5% more canvas space left and right
  dim.x = (dim.x - dim.width * 0.025) | 0;
  dim.width = dim.width * 1.05 | 0;

  return {svg, dim}
}

// =======================

function _attrs(node, attrs) {
  Object.entries(attrs).forEach(([k,v]) => {
    if (v==null) node.removeAttribute(k);
    else node.setAttribute(k, v+'');
  });
  return node;
}

// =======================

function _clamp(x, a, b) {
  return Math.max(a, Math.min(x, b));
}