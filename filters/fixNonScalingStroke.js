const namespaces = {v:'http://www.w3.org/2000/svg'},
      xpath = require('xpath');

// Unfolds vector-effect="non-scaling-stroke" into ordinary strokes
// Returns {svg, dim}

const sSW = 'stroke-width', 
      sDA = 'stroke-dasharray',
      sDO = 'stroke-dashoffset';

module.exports = exports = function fixNonScalingStroke(svg, dim, opts){
  let k = Math.max(
    null != opts.height ? dim.height / opts.height : -1, 
    dim.width / opts.width
  );

  // Search for nodes
  let figs = findFigs(svg);

  // Apply modded line width and dashes for them
  (figs||[]).forEach(n=>{
    let nHas_SW = findStroke(n);
    if (nHas_SW) {
      let w = parseFloat(nHas_SW.getAttribute(sSW)) * k;
      if (w) n.setAttribute(sSW, w);
      else n.removeAttribute(sSW);
    }
    let nHas_DA = findDash(n);
    if (nHas_DA) {
      let aDash = nHas_DA.getAttribute(sDA).split(/[, ]+/).map(e=>+e.trim()*k);
      if (aDash.length) n.setAttribute(sDA, aDash.map(e=>r2(e)).join(' '));
      else n.removeAttribute(nDA);
      let aOffset = +nHas_DA.getAttribute(sDO);
      if (aOffset) n.setAttribute(sDO, aOffset*k);
    }
  });

  // Remove vector-effect attributes
  killVEnodes(svg);

  return {svg, dim};
}

// =======================

// Build XPath executors for figs which have ancestors with vector-effect attr
const sShapes = 'path circle ellipse rect line polygon'.split(' '),
      aVE_NSS = '@vector-effect="non-scaling-stroke"',
      pHas_VE_Ancestors = `./ancestor-or-self::*[${aVE_NSS}]`,
      tShapes = sShapes.map(e=>'self::v:'+e),
      xpVE_Touched_Figs = `//*[${tShapes.join(' or ')}][${pHas_VE_Ancestors}]`,
      xFindFigs = xpath.parse(xpVE_Touched_Figs),
      xFindVE = xpath.parse(`//v:*[${aVE_NSS}]`);
// Build XPath executors for stroke-width and stroke-dasharray
const xFindStroke = xpath.parse(`./ancestor-or-self::v:*[@${sSW}!="none"]`),
      xFindDash = xpath.parse(`./ancestor-or-self::v:*[@${sDA}!=""]`);

function findFigs (node) {
  return xFindFigs.select({node, namespaces});
}

function killVEnodes (node) {
  xFindVE.select({node, namespaces})
  .forEach(n => n.removeAttribute('vector-effect'));
};

function findStroke (node) {
  return xFindStroke.select({node, namespaces}).at(-1);
}

function findDash (node) {
  return xFindDash.select({node, namespaces}).at(-1);
}

function r2(a) {return Math.round(a*100)/100}
function r0(a) {return Math.round(a)}