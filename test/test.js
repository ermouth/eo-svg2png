const {renderSVGtoImage} = require('../index.js');

var opts = {
  width:  500,
  font:   'OpenGost Type B TT'
};

// The test should produce 3 PNG files out of SVG sources

(async function test(){

  let tests = [
    {
      name:     'Drainage with invalid XYWH, fixed by filter and rendered',
      viewBoxAsXYWH: true,
      filters:  ['fixDrainage'],  
      fname:    __dirname + '/dr1.svg',
    },
    {
      name:     'Drainage with invalid viewBox, fixed by filter and rendered',
      filters:  ['fixDrainage'],  
      fname:    __dirname + '/dr2.svg',
    },
    {
      name:       'Another invalid viewBox drain, fixed by filter and rendered hires',
      width:      1000,
      background: [255, 255, 255, 128],
      filters:    ['fixDrainage'],  
      fname:    __dirname + '/dr3.svg',
    },
    { 
      name:       'Hires map with a little text, render to over-compressed JPG',
      width:      2500,
      font:       '', 
      format:     'jpg',
      quality:    30,
      fname:      __dirname + '/re.svg' 
    },
    { 
      name:       'Same hires map, but to default PNG and 2x resolution',
      width:      5000, 
      font:       '', 
      fname:      __dirname + '/re.svg' 
    },
    { 
      name:       'Renderer fixes XYWH, adds margin, and also sharpens, bg is CSS string',
      viewBoxAsXYWH: true, 
      width:      1500, 
      sharpen:    0.1, 
      background: 'aliceblue',
      filters:    ['addMargin3percent'], 
      fname:      __dirname + '/s0.svg' 
    },
    { 
      name:       'Renderer fixes invalid viewBox, adds font, margins and bg',
      width:      1500, 
      background: [240, 248, 255, 129],
      filters:    ['addMargin3percent'], 
      fname:      __dirname + '/s1.svg' 
    },
    { 
      name:       'Renders to hires, fixes invalid viewBox, adds Fira font, margins and bg',
      width:      3000, 
      background: 'white', 
      font:       'Fira Sans Condensed',
      filters:    ['addMargin3percent'], 
      fname:      __dirname + '/s2.svg' 
    },
    { 
      name:       'Hires avatar render on transparent bg',
      width:      3000,
      background: [0,0,0,0],
      fname:      __dirname + '/i0.svg' 
    },
    { 
      name:       'Render external font over 8-bit background PNG embedded',
      width:      2000,
      format:     'jpg',
      font:       'UTM Agin',
      filters:    ['forceFont'],
      fname:      __dirname + '/old.svg',
      fontBuffers: require('fs').readFileSync(__dirname + '/UtmAgin.ttf')
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
