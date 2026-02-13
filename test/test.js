const {renderSVGtoImage} = require('../index.js');

var opts = {
  width:  500,
  font:   'OpenGost Type B TT'
};

// The test should produce 3 PNG files out of SVG sources

(async function test(){

  let tests = [
    {
      name:     'Drainage with invalid viewBox, fixed by filter and rendered',
      filters:  ['fixDrainage'],  
      fname:    __dirname + '/dr1.svg',
      useViewboxAsXYWH:  true
    },
    {
      name:     'Next drainage with invalid viewBox, fixed by filter and rendered',
      filters:  ['fixDrainage'],  
      fname:    __dirname + '/dr2.svg',
    },
    {
      name:       'Another drainage with invalid viewBox, fixed by filter and rendered hires',
      width:      1000,
      background: [255, 255, 255, 255],
      filters:    ['fixDrainage'],  
      fname:    __dirname + '/dr3.svg',
    },
    { 
      name:       'Hires map with a little text, render to JPG',
      width:      2500, 
      format:     'jpg',
      fname:      __dirname + '/re.svg' 
    },
    { 
      name:       'Same hires map, but to default PNG and 2x resolution',
      width:      5000, 
      fname:      __dirname + '/re.svg' 
    },
    { 
      name:       'Window with invalid XYWH, render adds margin and font, sharpens, adds bg',
      useViewboxAsXYWH: true, 
      width:      1500, 
      sharpen:    0.1, 
      background: [240, 248, 255, 200],
      filters:    ['addMargin3percent', 'forceFont'], 
      fname:      __dirname + '/s0.svg' 
    },
    { 
      name:       'Hires door with invalid viewBox, render adds font, margins and bg',
      width:      1500, 
      background: [200, 210, 255, 30],
      filters:    ['addMargin3percent', 'forceFont'], 
      fname:      __dirname + '/s1.svg' 
    },
    { 
      name:       'Hires avatar render on transparent bg',
      width:      3000,
      background: [0,0,0,0],
      fname:  __dirname + '/i0.svg' 
    }
  ];

  let i = 0;
  for (let t of tests) {
    let t0 = Date.now();
    await renderSVGtoImage('', {...opts, ...t})
    .then(_ => console.log(`Test ${++i}: ${t.name}; done in ${Date.now()-t0}ms`))
    .catch(err => console.log(`Test ${++i} FAILED:`, err));
  }
  console.log('\nFinished eo-svg2png tests.\n')
})();
