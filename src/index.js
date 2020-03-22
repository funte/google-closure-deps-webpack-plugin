const validateOptions = require('schema-utils');
const fs = require('fs');
const path = require('path');
const defaultsDeep = require('lodash.defaultsdeep');
const shell = require('shelljs');
const pig = require('slim-pig');

// schema for options object
const schema = {
  type: 'object',
  properties: {
    output: { type: 'string', },
    source: {
      type: 'object',
      properties: {
        roots: {
          'anyOf': [{ type: 'array' }, { type: 'string' }]
        },
        jsPaths: {
          'anyOf': [{ type: 'array' }, { type: 'string' }]
        },
        excludes: {
          'anyOf': [{ type: 'array' }, { type: 'string' }]
        }
      }
    },
    goog: { type: 'string' },
    python: { type: 'string' }
  }
};

const pluginName = 'GoogleClosureDepsPlugin';

class GoogleClosureDepsPlugin {
  constructor(options = {}) {
    options = defaultsDeep(options, {
      output: '',
      source: { roots: [], jsPaths: [], excludes: [] },
      goog: 'node_modules/google-closure-library/closure/goog/base.js',
      python: 'python'
    })
    validateOptions(schema, options, { name: 'GoogleClosureDepsPlugin' });

    this.output_ = path.resolve(options.output);
    this.goog_ = path.resolve(options.goog);
    this.python_ = options.python;

    // cache source files and provides
    this.sources_ = {};
    this.excludes_ = options.source.excludes.map(item => path.resolve(item));
    this.roots_ = options.source.roots.map(item => path.resolve(item));
    this.roots_.forEach(root => {
      root = path.resolve(root);
      pig.fs.walkSync(root, file => this.addSource_(file));
    });
    this.jsPaths_ = options.source.jsPaths.map(item => path.resolve(item));
    this.jsPaths_.forEach(file => this.addSource_(file));

    this.makeCmd_();
  }

  apply(compiler) {
    compiler.hooks.beforeRun.tap(pluginName, compilation => {
      this.makeDepsFile_();
    });

    compiler.hooks.watchRun.tap(pluginName, compilation => {
      var changedFiles = Object.keys(compiler.watchFileSystem.watcher.mtimes);
      if (!changedFiles.length) {
        this.makeDepsFile_();
      }
      // check if source file changed
      if (this.isSourceChange_(changedFiles)) {
        this.makeDepsFile_();
      }
    });
  }

  makeDepsFile_() {
    if (shell.exec(this.cmd_).code !== 0) {
      shell.echo('Error: Failed to run \"makedeps.py\"');
      shell.exit(1);
    }
  }

  makeCmd_() {
    var tokens = [this.python_];
    tokens.push(path.resolve(__dirname, '../', 'tools/makedeps.py'));
    tokens.push('-o');
    tokens.push(this.output_);
    if (this.roots_.length) {
      tokens.push('-r');
      this.roots_.forEach(root => tokens.push(root));
    }
    if (this.jsPaths_.length) {
      tokens.push('-j');
      this.jsPaths_.forEach(source => tokens.push(source));
    }
    if (this.excludes_.length) {
      tokens.push('-e');
      this.excludes_.forEach(item => tokens.push(item));
    }
    tokens.push('-g');
    tokens.push(this.goog_);

    this.cmd_ = tokens.join(' ');
  }

  isSourceChange_(files) {
    var changed = false;
    var SourceChangedException = {};

    try {
      files.forEach(file => {
        file = path.resolve(file);
        if (!this.excludes_.includes(file) && this.isWatchingFile_(file)) {
          // 检查 provides 是否变化
          var newProvides = this.checkProvides_(file);
          if (newProvides && 0 != newProvides.length) {
            this.sources_[file] = newProvides;
            changed = true;
            throw SourceChangedException;
          }
        }
      });
    } catch (e) {
      if (e != SourceChangedException) throw e;
    }

    return changed;
  }

  isWatchingFile_(file) {
    return Object.keys(this.sources_).includes(file);
  }

  checkProvides_(file) {
    var provides = this.getProvides_(file);

    if (provides.length != this.sources_[file].length) {
      return provides;
    } else {
      for (var i = 0; i != provides.length; ++i) {
        if (provides[i] != this.sources_[file][i]) {
          return provides;
        }
      }
    }
  }

  getProvides_(file) {
    var provides = [];
    var regex = /goog.provide\([\'\"]([\w.]+)[\'\"]\);/g;
    var source = fs.readFileSync(file).toString();
    var matches;
    while ((matches = regex.exec(source)) !== null) {
      if (matches.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      provides.push(matches[1]);
    }
    provides.sort();

    return provides;
  }

  addSource_(file) {
    var filter = /^.+\.jsx*$/gm;
    filter.lastIndex = 0;
    if (filter.test(file))
      this.sources_[file] = this.getProvides_(file);
  }
}

module.exports = GoogleClosureDepsPlugin;