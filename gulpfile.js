var gulp = require('gulp');
var bookmarkletify = require('bookmarkletify');
var pump = require('pump');
var fs = require('fs');
var path = require('path');
var uglify = require('gulp-uglify');
var ghPages = require('gulp-gh-pages');
var _ = require('lodash');
var webserver = require('gulp-webserver');
var mkdirp = require('mkdirp');
var gulpFile = require('gulp-file');

var prod_endpoint = '//xbtsw.github.io/chromecastit/chromecastit.js';
var dev_endpoint = '//  localhost:4567/chromecastit.js';

function buildBookmarklet(isDev) {
  var endpoint;
  if (isDev) {
    endpoint = dev_endpoint;
  } else {
    endpoint = prod_endpoint;
  }
  var bookmarkletTemplate = fs.readFileSync(path.join(__dirname, 'src/bookmarklet.js'), 'utf-8');
  return bookmarkletify(_.template(bookmarkletTemplate)({'bookmarklet_endpoint': endpoint}));
}

function buildHtml(isDev) {
  var bookmarkletCode = buildBookmarklet(isDev);

  var indexTemplate = fs.readFileSync(path.join(__dirname, 'src/index.html'), 'utf-8');
  var indexCode = _.template(indexTemplate)({'bookmarklet_code': bookmarkletCode});
  return gulpFile('index.html', indexCode);
}

function buildJs(isDev) {
  var pipes = [];
  pipes.push(gulp.src('./src/chromecastit.js'));
  if (!isDev) {
    pipes.push(uglify());
    return pump(pipes);
  }
  return pipes[0];
}

gulp.task('writeFile:dev', function() {
  return pump([
    buildHtml(true),
    buildJs(true),
    gulp.dest('./dist')
  ]);
});

gulp.task('writeFile:prod', function() {
  return pump([
    buildHtml(true),
    buildJs(true),
    gulp.dest('./dist')
  ]);
});

gulp.task('local', ['writeFile:dev'], function() {
  return pump([
    gulp.src('./dist'),
    webserver({open: true, port: 4567})
  ]);
});

gulp.task('deploy', ['writeFile:prod'], function() {
  return pump([
    gulp.src('./dist/**/*'),
    ghPages()
  ]);
});
