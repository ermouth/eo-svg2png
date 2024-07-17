const sevruga = require('sevruga');
const fs = require('fs');
const Jimp = require('jimp');

var width = 800,
    inFile = 's1.svg';

var svg = fs.readFileSync(`${__dirname}/${inFile}`, {encoding: 'utf8'});

svgRenderToBuf(svg).then(function({buf, dim, scale}){
  var outArr = [];
  // shuffle bgra into rgba
  for (var i=0; i<buf.length; i+=4) {
    var r = buf[i+2],
        g = buf[i+1],
        b = buf[i],
        a = buf[i+3];
    outArr.push(r,g,b,a);
  }
  var outBuf = Buffer.from(outArr);
  
  new Jimp({data: outBuf, ...dim}, (err,res) => {
    if (err) return console.log('Invalid buffer', err);

    // if a small image sharpen it a little
    if (scale<1 && dim.width<1000) {
      var sa = -0.1, kernel = [[sa,sa,sa], [sa,-sa*8+1,sa],[sa,sa,sa]];
      res.convolute(kernel);
    }
    
    // send/write output
    res.getBuffer(Jimp.MIME_PNG, (err, pngBuf) => {
      if (err) return console.log(err);

      // here we should send a response 
      // instead of writing a file
      fs.writeFile(inFile.replace('.svg','.png'), pngBuf, function(){})
      console.log('Done');
    })
  });
})  
.catch(err => console.log(`Render failed: ${err}`));

// =======================

async function svgRenderToBuf(svg) {
  // get root node and dimensions
  var root = svg.match(/<svg [^>]+>/)[0],
      props = [...root.matchAll(/(x|y|width|height)="(-?[0-9\.]+)"/g)],
      dim = {}; // source dimensions
  props.forEach(e=>dim[e[1]]=+e[2]|0);
  var k = width / dim.width,
      d1 = {width:Math.round(dim.width*k), height:Math.round(dim.height*k)};

  // rebuild SVG root node, no x and y attributes
  var newroot = `<svg xmlns="http://www.w3.org/2000/svg" 
  xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" 
  viewBox="${dim.x},${dim.y},${dim.width},${dim.height}"
  width="${d1.width}" height="${d1.height}">`;
  svg = svg.replace(root, newroot);

  // create buf and fill it with white
  var renderBuf = Buffer.alloc(d1.width * d1.height * 4);
  renderBuf.fill(255);

  await sevruga.renderSVG(svg, renderBuf, d1);
  return {buf:renderBuf, dim:d1, scale:k};
}

