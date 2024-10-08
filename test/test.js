const {renderSVGtoImage} = require('../index.js');

var opts = {
  width:  500,
  font:   'OpenGost Type B TT'
};

// The test should produce 3 PNG files out of SVG sources

(async function test(){
  await renderSVGtoImage('', {...opts, ...{
    filters:  ['fixDrainage'],  
    fname:    __dirname + '/dr2.svg',
  }})
  .then(_ => console.log('Test 1: Done drainage fix by filter and render'))
  .catch(err => console.log(`Test 1 render failed: ${err}`));

  await renderSVGtoImage('', {...opts, ...{ 
    width:      1500, 
    sharpen:    0, 
    background: [240, 248, 255, 200],
    font:       'Ubuntu,Arial',
    filters:    ['addMargin3percent'], 
    fname:      __dirname + '/s0.svg' 
  }})
  .then(_ => console.log('Test 2: Done hires window + margins render on custom background'))
  .catch(err => console.log(`Test 2 render failed: ${err}`));

  await renderSVGtoImage('', {...opts, ...{ fname:  __dirname + '/s1.svg' }})
  .then(_ => console.log('Test 3: Done door with fixed viewBox render'))
  .catch(err => console.log(`Test 3 render failed: ${err}`));

  await renderSVGtoImage('', {...opts, ...{ 
    sharpen:    0, 
    background: [0,0,0,0],
    fname:  __dirname + '/i0.svg' 
  }})
  .then(_ => console.log('Test 4: Done avatar on transparent bg render'))
  .catch(err => console.log(`Test 4 render failed: ${err}`));
})();