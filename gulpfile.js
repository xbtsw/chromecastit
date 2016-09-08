var gulp = require('gulp');
var bookmarkletify = require('bookmarkletify');
var pump = require('pump');
var fs = require('fs');
var path = require('path');
var uglify = require('gulp-uglify');
var ghPages = require('gulp-gh-pages');
var _ = require('lodash');
var webserver = require('gulp-webserver');

var prod_endpoint = '//xbtsw.github.io/chromecastit/chromecastit.js';
var dev_endpoint = '//localhost:4567/chromecastit.js';

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
  fs.writeFileSync(path.join(__dirname, 'dist/index.html'), indexCode);
}

function buildJs(isDev) {
  var pipes = [];
  pipes.push(gulp.src('./src/chromecastit.js'));
  if (!isDev) {
    pipes.push(uglify());
  }
  pipes.push(gulp.dest('./dist'));
  pump(pipes);
}

gulp.task('local', function() {
  buildHtml(true);
  buildJs(true);
  pump([
    gulp.src('./dist'),
    webserver({open: true, port: 4567})
  ])
});

gulp.task('deploy', function() {
  buildHtml(false);
  buildJs(false);
  pump([
    gulp.src('./dist/**/*'),
    ghPages()
  ]);
});
