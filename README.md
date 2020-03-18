# google-closure-deps-webpack-plugin
Webpack plugin for generating Google Closure deps, work with [closure-webpack-plugin](https://www.npmjs.com/package/closure-webpack-plugin).  

<b>Note</b>: donnot use Google Closure in babel js file(end with `jsx`)!! But if you stick it, just replace the regex with `r'^.+\.jsx?$'`, this code is under `<your project>/node_modules/google-closure-library/closure/bin/build/treescan.py`:  
```py
# Matches a .js file path.
_JS_FILE_REGEX = re.compile(r'^.+\.js$')
```

## usage
Case these files in your project are written with Google Closure:  
```js
// <your project>/src/foo.js
goog.provide('foo');
goog.require('bar');

// <your project>/src/bar.js
goog.provide('bar');
```

Config webpack with:
```js
module.exports = {
  // ...
  plugins: [
      new GCCDepsPlugin({
        output: '.tmp/deps.js',
        source: {
          roots: ['src'],
        },
        goog: 'node_modules/google-closure-library/closure/goog/base.js',
        python: 'python'
      }),
      new ClosurePlugin.LibraryPlugin({
        closureLibraryBase: require.resolve(
          'google-closure-library/closure/goog/base'
        ),
        deps: [
          require.resolve('google-closure-library/closure/goog/deps'),
          // path for generated depenencies file.
          '.tmp/deps.js',
        ],
      })
    ]
}
```


## example
- [template-closure-webpack-plugin-2](https://github.com/funte/template-closure-webpack-plugin-2)  
  Use plugins `google-closure-deps-webpack-plugin` and `closure-webpack-plugin` support [Closure Library](https://developers.google.com/closure/library) in webpack.  

## options
- output  
  Full path for Closure deps.js file  
- source  
  + roos  
    Directories list for search dependencies  
  + jsPaths  
    JavaScript sources files for search dependencies  
  + excludes  
    Excludes files list  
- goog  
  Path to Closure Library bootstrap file base.js  
- python  
  "python3", "/usr/bin/python3" or something  

More visit https://developers.google.com/closure/library.  