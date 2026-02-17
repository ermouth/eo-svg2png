// THIS PLUGIN IS DEPRECATED SINCE v2

// Adds 3% margin, just mutates dim object

// Returns {svg, dim}

module.exports = exports = function addMargin(svg, dim){

  var margin = Math.min(dim.width, dim.height) * 0.03 | 0;

  // add 5% more canvas space
  dim.x = (dim.x - margin) | 0;
  dim.width = dim.width + margin * 2  | 0;

  dim.y = (dim.y - margin) | 0;
  dim.height = dim.height + margin * 2 | 0;

  return {svg, dim}
}
