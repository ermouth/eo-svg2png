const {renderSVGtoImage} = require('../index.js');

var opts = {
  width:  500,
  font:   'OpenGost Type B TT',
  fontFiles: [
    __dirname + '/../fonts/Asket-Narrow-Light.ttf',
    __dirname + '/../fonts/OpenGostTypeB.ttf',
  ]
};

// The test suite creates several PNG and JPEG files using SVG sources

(async function test(){

  let tests = [
    {
      name:     'Image with invalid XYWH, fixed by filter and rendered',
      viewBoxAsXYWH: true,
      filters:  ['fixDrainage', {fixThinLines:{minLineWidth: 1.5}}],  
      fname:    __dirname + '/dr1.svg',
    },
    {
      name:     'Fixes invalid viewBox, crops and adds bleed',
      filters:  ['fixDrainage'], 
      crop:       true,
      bleed:      20, 
      fname:    __dirname + '/dr2.svg',
    },
    {
      name:       'Another invalid viewBox, fixed and limited by height',
      width:      1000,
      height:     1000,
      background: 'transparent',
      filters:    ['fixDrainage'],  
      fname:    __dirname + '/dr3.svg',
    },
    { 
      name:       'A map with a little text, render to over-compressed JPG',
      width:      1000,
      font:       '', 
      format:     'jpg',
      quality:    30,
      fname:      __dirname + '/re.svg' 
    },
    { 
      name:       '…same map, but to default PNG and 2x resolution',
      width:      2000, 
      font:       '', 
      fname:      __dirname + '/re.svg' 
    },
    { 
      name:       'Fixes XYWH, adds margin with plugin, sharpens, adds bg as CSS string',
      viewBoxAsXYWH: true, 
      width:      1000, 
      sharpen:    0.2, 
      background: 'aliceblue',
      filters:    [
        'addMargin3percent', //  deprecated
        'fixNonScalingStroke'
      ],  
      fname:      __dirname + '/s0.svg' 
    },
    { 
      name:       'Fixed viewBox, thicker lines + large margins and semi-transparent bg',
      width:      1500,
      height:     1500, 
      background: [240, 248, 255, 129],
      filters:    ['fixNonScalingStroke', {fixThinLines:{minLineWidth: 2}}],
      crop:       true,
      bleed:      100,
      fname:      __dirname + '/s1.svg' 
    },
    { 
      name:       'Fixes viewBox, sets Asket font, margins and bg, fixes thin lines',
      width:      1000, 
      background: 'white', 
      font:       'Asket Narrow',
      filters:    ['fixNonScalingStroke' , 'forceFont', {fixThinLines:{minLineWidth: 1}}], 
      crop:       true,
      bleed:      5,
      fname:      __dirname + '/s2.svg' 
    },
    { 
      name:       'Crops, fixes non-scaling strokes and makes thin lines very thick',
      width:      1000, 
      filters:    [
        //'removeInvisible',
        'fixNonScalingStroke', {fixThinLines:{minLineWidth: 10}}
      ],
      crop:       true,
      bleed:      10,
      fname:      __dirname + '/s3.svg' 
    },
    { 
      name:       'Fixes dashed non-scaling strokes and thin lines, renders to low-res',
      width:      500, 
      filters:    ['fixNonScalingStroke', {fixThinLines:{minLineWidth: 0.5}}],
      crop:       true,
      bleed:      10,
      fname:      __dirname + '/s4.svg' 
    },
    { 
      name:       'Hires avatar render on transparent bg, no crop',
      width:      3000,
      background: [0,0,0,0],
      fname:      __dirname + '/i0.svg' 
    },
    { 
      name:       'Renders font from Buffer over embedded 8-bit background PNG',
      width:      2000,
      format:     'jpg',
      font:       'UTM Agin',
      filters:    ['forceFont'],
      fname:      __dirname + '/old.svg',
      fontFiles:  null,
      fontBuffers: require('fs').readFileSync(__dirname + '/../fonts/UtmAgin.ttf')
    }
  ];

  let i = 0;
  console.time('\nFull eo-svg2png tests duration');
  for (let t of tests) {
    let t0 = Date.now();
    await renderSVGtoImage('', {...opts, ...t})
    .then(_ => {
      let tn = `Test ${++i}    `.substr(0,8),
          td = `    ${Date.now()-t0}ms`.substr(-7);
      console.log(`${tn}${td}   ${t.name}`)
    })
    .catch(err => console.log(`Test ${++i} FAILED:`, err));
  }
  console.timeEnd('\nFull eo-svg2png tests duration');
  console.log('\nFinished eo-svg2png tests.\n');

})();
