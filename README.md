# SVG to bitmap converter

Converts SVG string into PNG, JPG or Canvas RGBA Buffer. The lib was 
written for private use and contains several specialized filters which 
may be ignored. Better works with `yarn`.

The lib is not intended for browsers.

## Fit SVG into bitmap image of predefined width

SVG root must have either valid `width`, `height`, `x` and `y`.
If only valid `viewBox` is present, use option `viewBoxAsXYWH` 
to restore metrics from `viewBox`.

Result image width is taken from `opts.width` param, 
not from SVG root `width` attribute. If `opts.height` 
is defined result image height wouldn’t exceed it.

Both width and height define max image dimensions.

```js
const {renderSVGtoImage} = require('eo-svg2png');
const opts = {
  width:      1000,       // Required, result image width, default is 500
  height:     1000,       // Max image height, shrinks width if needed
  viewBoxAsXYWH: false,   // Take dimensions from viewBox, not from SVG
                          // attributes x,y,width,height
  background: [0,0,0,255],// RGBA array or CSS3 name
  format:     'jpeg',     // Default is png
  sharpen:    0.1,        // Default is 0, slows down 3…15x
  filters:    [],         // List of filters to apply to SVG DOM
                          // before render, see /test and /filters 
  crop:       false,      // Trim void SVG space before processing
  bleed:      2,          // Add padding after crop, should be < width/2
  expand:     false,      // Expand to fit width+height, img is centered

  font:       'SomeFont', // Default font name
  fontFiles:  [],         // List of font files on filesystem
  fontBuffers:            // Emits font data as a buffer       
              require('fs').readFileSync('SomeFont.ttf')
};

renderSVGtoImage(sourceSVGstring, opts).then(buf => {
  /* buf contains data ready to be saved or sent */
});
```

Add `fname` key with a file name into options to load 
SVG from a file. If `fname` is provided the result image 
also goes to a file with the same name but different extension.

### Fonts

The lib doesn’t use host OS fonts. If SVG to render has texts you must
either provide list of font file locaions, or pass an array of Buffers 
with font data.

### Filters

Filters are located in `/filters` folder. Each filter exports a single 
function which receives SVG DOM, dimensions and options. A filter 
must return object with two props: `svg` which is new SVG DOM, 
and `dim` which is dimensions. 

It’s ok for a filter to mutate given svg and dim directly without 
prior cloning. To freeze dimensions a filter must set `dim.frozen` 
to `true`.

Sequence of filters for a given SVG is defined in `opts.filters` 
array. An external function can be passed as a filter, it receives 
`this` with DOMParser, XMLSerializer, Resvg and xpath props.

There are several filter application examples in `/test/test.js`.

Built-in non-special filters:

* **`fixNonScalingStroke`** – converts strokes with undesired 
  vector-effect attribute to standard strokes which is rendered 
  in intended stroke width for a given image size
* **`removeInvisible`** – removes invisible objects, implicit and
  always runs first if `opts.crop` is true
* **`fixThinLines`** – set lower bound for line thickness, good 
  for low-res rendering, helps to avoid too faint strokes
* **`forceFont`** – changes `font-family` attribute for all texts.

## Convert SVG to bitmap as is

If SVG root has valid `width`, `height` and `viewBox` attributes
there’s no need to pre-process it, SVG string can be rendered directly 
into JPEG or PNG.

Result dimensions will be taken from `dim` and if they don’t match 
original SVG `width` and `height` the result image is truncated.

```js
const {renderSVGToBuffer, bufferToImage} = require('eo-svg2png');
renderSVGToBuffer({
  svg:  sourceSVGstring,    // required
  dim:  {
    width:  bufferWidth,    // required, int from SVG width
    height: bufferHeight    // required, int from SVG height
  },
  opts: {
    background: [0,0,0,0],  // optional RGBA, default is white
    format:     'jpg',      // optional, default is png
    sharpen:    0.1         // optional, default is 0
  }
})
.then(bufferToImage).then(buf => {
  /* buf contains data ready to be saved or sent */
});
```

## Convert SVG to Canvas-style RGBA buffer

SVG root must have valid `width`, `height` and `viewBox` attributes. 
Result dimensions will be taken from `dim` and if they don’t match 
original SVG `width` and `height` the result image is truncated.

```js
const {renderSVGToBuffer} = require('eo-svg2png');
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

## Sanitize SVG

Function `preprocessSVGSync(svgString, opts)` takes SVG and preprocesses
it according to opts. It returns `{svg,dim,bbox}` object which contains
sanitized SVG as string, dimensions (attributes width and height of the
result), and also bbox object, which is bounding box before scaling.

## Tests

The `test` folder contains several SVG images which are rendered 
to PNG/JPEG files on successful `yarn test`. Timings show performance and
its dependency on different settings.

---

(c) 2026 ermouth, eo-svg2png is MIT-licensed, fonts are SIL-licensed