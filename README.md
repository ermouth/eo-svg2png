# SVG to image converter

Converts SVG string into PNG, JPG or Canvas RGBA Buffer.

The lib was written for private use and contains several 
special functions which may be ignored.

## Fit SVG into bitmap image of predefined width

SVG root must have either valid `width`, `height`, `x` and `y`,
or valid `viewBox` attributes. If they disagree `viewBox` is 
rebuilt according to values of dimensional attributes.

Result image width however will be driven by `opts.width` param, 
not by SVG root `width` attribute. Result image height is 
scaled accordingly.

```javascript
const {renderSVGtoImage} = require('eo-svg2png/index.js');

var opts = {
  width:      1000,       // result image width, default is 500
  background: [0,0,0,0],  // optional, default is white
  format:     'jpg',      // optional, default is png
  sharpen:    0,          // optional, default is 0.1
  font:       ''          // fixes default font if no single font-family 
                          // attribute was found in SVG,
                          // pass empty space to avoid font fixing
};

renderSVGtoImage(sourceSVGstring, opts)
.then(buf => {
  /* buf contains data ready to be saved or sent */
});
```

Add `fname` key with a file name into options to load 
SVG from a file. If `fname` is provided the result image 
also goes to a file with the same name but different extension.


## Convert SVG to image as is

SVG root must have valid `width`, `height` and `viewBox` attributes. 
Result dimensions will be taken from `dim` and if they don’t match 
original SVG `width` and `height` the result image is truncated.

```javascript
const {renderSVGToBuf, bufferToImage} = require('eo-svg2png/index.js');

renderSVGToBuf({
  svg:  sourceSVGstring,    // required
  dim:  {
    width:  bufferWidth,    // required, int from SVG width
    height: bufferHeight    // required, int from SVG height
  },
  opts: {
    background: [0,0,0,0],  // optional RGBA, default is white
    format:     'jpg',      // optional, default is png
    sharpen:    0           // optional, default is 0.1
  }
})
.then(bufferToImage)
.then(buf => {
  /* buf contains data ready to be saved or sent */
});
```

## Convert SVG to Canvas-style RGBA buffer

SVG root must have valid `width`, `height` and `viewBox` attributes. 
Result dimensions will be taken from `dim` and if they don’t match 
original SVG `width` and `height` the result image is truncated.

```javascript
const {renderSVGToBuf} = require('eo-svg2png/index.js');

renderSVGToBuf({
  svg:  sourceSVGstring,    // required
  dim:  {
    width:  bufferWidth,    // required, int from SVG width
    height: bufferHeight    // required, int from SVG height
  },
  opts: {
    background: [0,0,0,0],  // optional, default is white
  }
})
.then(({buf}) => {
  /* buf contains raw pixels in RGBA format */
});
```

## Tests

The `test` folder contains several SVG images which are rendered 
to PNG files on successful `npm test`. 