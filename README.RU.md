# Конвертер SVG в растровое изображение

Конвертирует строку SVG в PNG, JPG или RGBA Buffer. Библиотека
написана для частного использования и содержит несколько 
специальных фильтров, которые можно проигнорировать.

## Перед установкой

Конвертер преимущественно предназначен для использования под Ubuntu. 
Для успешной установки под Ubuntu желательно предустановить ключевую 
зависимость вручную во избежание ошибок во время `npm install`:

```bash
sudo apt-get install librsvg2-dev
```

Для установки под другой ОС нужно прочесть и выполнить инструкции 
по установке [sevruga](https://github.com/Streampunk/sevruga), 
основной библиотеки под капотом `eo-svg2png`.

## Обработка и ресайз SVG в битмап указанной ширины

Корневой эл-т SVG должен иметь корректные `width`, `height`, `x` и `y`,
либо корректный `viewBox`. Если соотношение сторон из viewBox и размерных
атрибутов не совпадает, считается, что viewBox неверный, и он
перестраивается из размерных атрибутов.

Ширина картинки на выходе, тем не менее, определяется не атрибутами 
в SVG, а параметром `opts.width`. Высота итогового изображения также 
будет пропорционально изменена.

```javascript
const {renderSVGtoImage} = require('eo-svg2png');

var opts = {
  width:      1000,       // ширина битмапа на выходе, 500 по умолчанию
  background: [0,0,0,0],  // optional, по умолчанию белый фон
  format:     'jpg',      // optional, по умолчанию png
  sharpen:    0,          // optional, по умолчанию 0.1
  filters:    [],         // optional, массив имён фильтров для модификации
                          // SVG, примеры в /test
  font:       ''          // если в док-те ни одного атрибута font-family 
                          // подставляется этот шрифт
};

renderSVGtoImage(sourceSVGstring, opts)
.then(buf => {
  /* buf содержит данные готовые к отправке или сохранению */
});
```

Если добавить в `opts` ключ `fname` c именем SVG-файла,
параметр с SVG-строкой будет проигнорирован и данные взяты из файла.
После обработки рядом с исходным файлом будет создан файл
изображения с таким же именем, но другим расширением.

### Фильтры

Фильтры расположены в папке `/filters`. Каждый фильтр экспортирует 
единственную функцию, которая должна принимать SVG XML DOM объект,
объект с размерами, а также опции.

Фильтр должен возвратить объект `{svg, dim}`, где svg – обработанный 
фильтром SVG DOM object, и dim – обработанный размерный объект.

Фильтр может мутировать исходные объекты.

Цепочка фильтров, которые нужно применить, определяется в 
`opts.filters` при вызове конвертера.

## Конверсия SVG в битмап с размерами из SVG

Если в SVG уже заданы корректные `width`, `height`, `viewBox`
и не нужны фильтры, можно применить сокращённую схему вызова.

Передаётся только SVG-строка, размеры буфера и некоторые опции. 
Размер результирующего изображения берётся из атрибутов `width` 
и `height` исходного SVG. Эти размеры должны быть продублированы 
в `dim.width` и `dim.height` как целые числа.

```javascript
const {renderSVGToBuf, bufferToImage} = require('eo-svg2png');

renderSVGToBuf({
  svg:  sourceSVGstring,    // required, SVG строка
  dim:  {
    width:  bufferWidth,    // required, int из SVG width
    height: bufferHeight    // required, int из SVG height
  },
  opts: {
    background: [0,0,0,0],  // optional RGBA, по умолчанию белый
    format:     'jpg',      // optional, по умолчанию png
    sharpen:    0           // optional, по умолчанию 0.1
  }
})
.then(bufferToImage)
.then(buf => {
  /* buf содержит данные готовые к отправке или сохранению */
});
```

## Конверсия SVG в Canvas-style RGBA buffer

Если в SVG уже заданы корректные `width`, `height` и `viewBox`, 
и не нужны фильтры и упаковка, можно применить минимальную схему вызова.

Передаётся только SVG-строка, размеры буфера и некоторые параметры. 
Размер результирующего изображения берётся из атрибутов `width` 
и `height` исходного SVG. Эти размеры должны быть продублированы 
в `dim.width` и `dim.height` как целые числа.

```javascript
const {renderSVGToBuf} = require('eo-svg2png');

renderSVGToBuf({
  svg:  sourceSVGstring,    // required
  dim:  {
    width:  bufferWidth,    // required, int из SVG width
    height: bufferHeight    // required, int из SVG height
  },
  opts: {
    background: [0,0,0,0],  // optional RGBA, по умолчанию белый
  }
})
.then(({buf}) => {
  /* buf содержит RGBA Buffer изображения */
});
```

## Шрифты

Шрифты, внедрённые в SVG, игнорируются. Для использования кастомных 
шрифтов они должны быть установлены в хостовой ОС.

## Тесты

Фолдер `test` содержит несколько SVG док-тов. При запуске `npm test`
они должны быть преобразованы в PNG в том же фолдере. 