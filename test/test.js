const {renderSVGtoPNG} = require('../index.js');

var opts = {
  width:  500,
  font:   'OpenGost Type B TT'
};

// The test should produce 3 PNG files out of SVG sources

(async function test(){
  await renderSVGtoPNG('', {...opts, ...{
    isDrainage: true,  
    fname:  __dirname + '/dr1.svg',
  }})
  .then(_ => console.log('Tests 1: Done drainage render'))
  .catch(err => console.log(`Test 1 render failed: ${err}`));

  await renderSVGtoPNG('', {...opts, ...{ fname:  __dirname + '/s0.svg' }})
  .then(_ => console.log('Tests 2: Done full window render'))
  .catch(err => console.log(`Test 2 render failed: ${err}`));

  await renderSVGtoPNG('', {...opts, ...{ fname:  __dirname + '/s1.svg' }})
  .then(_ => console.log('Tests 3: Done door render'))
  .catch(err => console.log(`Test 3 render failed: ${err}`));
})();