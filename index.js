'use strict';

var path = require('path');
var through = require('through2');
var sloc  = require('sloc');
var gutil = require('gulp-util');
var _ = require('underscore');
var PluginError = gutil.PluginError;
var File = gutil.File;
var log = gutil.log;
var colors = gutil.colors;

const PLUGIN_NAME = 'gulp-sloc';

function gulpSloc(options) {

  options = _.extend({
    tolerant: false,
    reportType: 'stdout',
    reportFile: 'sloc.json'
  }, (options || {}));

  if (options.reportType === 'json' && _.isEmpty(options.reportFile)) {
    throw new PluginError(PLUGIN_NAME, 'Invalid report file. Provide a valid file name for reportFile in options.');
    return;
  }

  var totals = {};
  totals.fileCount = 0;

  return through.obj(function(file, enc, cb) {
    if (file.isNull()) {
      // return empty file
      return cb(null, file);
    }
    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
      return cb();
    }
    if (file.isBuffer()) {

      var ext = path.extname(file.path);
      ext = (ext.charAt(0) === '.') ? ext.substr(1, ext.length) : ext;

      if(sloc.extensions.indexOf(ext) < 0 && options.tolerant) {
        ext = 'js'; // Default to JS
      }
      else if (sloc.extensions.indexOf(ext) < 0) {
        this.emit('error', new PluginError(PLUGIN_NAME, 'Unsupported extension ' + file.path ));
        return cb();
      }
      var stats = sloc(file.contents.toString('utf8'), ext);

      for(var prop in stats) {
        if(totals[prop] === undefined) totals[prop] = 0;
        totals[prop] += stats[prop];
      }
    }

    totals.fileCount++;
    cb(null, file);
  }, (options.reportType === 'json' ? writeJsonReport : printReport));

  function printReport(cb) {
    log('-------------------------------');
    log('        physical lines: ' + colors.green(String(totals.total)));
    log('  lines of source code: ' + colors.green(String(totals.source)));
    log('         total comment: ' + colors.cyan(String(totals.comment)));
    log('            singleline: ' + String(totals.single));
    log('             multiline: ' + String(totals.block));
    log('                 mixed: ' + String(totals.mixed));
    log('                 empty: ' + colors.red(String(totals.empty)));
    log('');
    log('  number of files read: ' + colors.green(String(totals.fileCount)));

    var modeMessage = options.tolerant ?
                  colors.yellow('         tolerant mode ') :
                  colors.red('           strict mode ');

    log(modeMessage);
    log('-------------------------------');

    cb();
  }

  function writeJsonReport(cb) {
    var reportFile = new File({
      path: options.reportFile,
      contents: new Buffer(JSON.stringify(totals))
    });

    this.push(reportFile);

    cb();
  }
}

// Exporting the plugin main function
module.exports = gulpSloc;