# SVG to bitmap converter

Converts SVG string into PNG, JPG or Canvas RGBA Buffer. The lib was 
written for private use and contains several special filters which 
may be ignored. Better works with `yarn`.

## Fit SVG into bitmap image of predefined width

SVG root must have either valid `width`, `height`, `x` and `y`.
If only valid `viewBox` is present, use option `viewBoxAsXYWH` 
to restore metrics from `viewBox`.

Result image width is taken from `opts.width` param, 
not from SVG root `width` attribute. Result image height is 
scaled accordingly.

```js
const {renderSVGtoImage} = require('eo-svg2png');

var opts = {
  width:      1000,       // Result image width, default is 500
  background: [0,0,0,0],  // Optional, default is white
  format:     'jpeg',     // Optional, default is png
  sharpen:    0.1,        // Optional, default is 0
  filters:    [],         // Optional list of filters to apply to SVG DOM
                          // before render, see /test and /filters 
  font:       'SomeFont', // Optional, default font name
  fontBuffers:            // Optional, emits a font into render cycle
  require('fs').readFileSync('SomeFont.ttf')
};

renderSVGtoImage(sourceSVGstring, opts)
.then(buf => {
  /* buf contains data ready to be saved or sent */
});
```

Add `fname` key with a file name into options to load 
SVG from a file. If `fname` is provided the result image 
also goes to a file with the same name but different extension.

### Filters

Filters are located in `/filters` folder. Each filter exports a single 
function which receives SVG DOM, dimensions and options. A filter 
must return object with two props: `svg` which is new SVG DOM, 
and `dim` which is dimensions.

It’s ok for a filter to mutate given svg and dim directly without 
prior cloning. 

Sequence of filters for a given SVG is defined in `opts.filters` 
array.

## Convert SVG to bitmap as is

If SVG root has valid `width`, `height` and `viewBox` attributes
there’s no need to pre-process it, SVG string can be rendered directly 
into JPEG or PNG.

Result dimensions will be taken from `dim` and if they don’t match 
original SVG `width` and `height` the result image is truncated.

```javascript
const {renderSVGToBuf, bufferToImage} = require('eo-svg2png');

renderSVGToBuffer({
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

```js
const {renderSVGToBuf} = require('eo-svg2png');

renderSVGToBuffer({
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
to PNG/JPEG files on successful `yarn test`. Timings show performance and
its dependency on different settings.