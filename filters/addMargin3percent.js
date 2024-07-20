
// Добавляет 3% полей от наименьшего из ширины или высоты. 
// Поля добавляются со всех сторон

// svg – SVG DOM object, не используется,
// dim – {x,y,width,height}, фильтр меняет именно его,
// opts – не используется

// Возвращает {svg, dim}

module.exports = exports = function addMargin(svg, dim, opts){

  var margin = Math.min(dim.width, dim.height) * 0.03 | 0;

  // add 5% more canvas space
  dim.x = (dim.x - margin) | 0;
  dim.width = dim.width + margin * 2  | 0;

  dim.y = (dim.y - margin) | 0;
  dim.height = dim.height + margin * 2 | 0;

  return {svg, dim}
}
