var gulp = require('gulp');
var fs = require("fs");

// Include plugins
var plugins = require('gulp-load-plugins')(); // lazy-loading of plugins specified in package.json

// Variables
var source = './src'; // working directory
var destination = './dist'; // build folder
var node_modules_path = './node_modules';
var tmp = './tmp';

/**********************************************
 * CSS
 *********************************************/

// Export css files to build folder
gulp.task('css', function () {

    gulp.src(destination + '/assets/css/**/*.css', {read: false, force: true})
        .pipe(plugins.clean());

    return gulp.src(source + '/assets/css/styles.scss')
        .pipe(plugins.sass())
        .pipe(plugins.csscomb())
        .pipe(plugins.cssbeautify({indent: '  '}))
        .pipe(plugins.autoprefixer())
        .pipe(gulp.dest(destination + '/assets/css/'));
});

// Minify CSS (destination -> destination)
gulp.task('minify-css', ['css'], function () {
    return gulp.src(destination + '/assets/css/*.css')
        .pipe(plugins.csso())
        .pipe(plugins.rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(destination + '/assets/css/'));
});

// SASS Watcher
gulp.task('watch', function () {
    gulp.watch(source + '/assets/css/*.scss', ['minify-css']);
    gulp.watch(source + '/media/**/*', ['media']);
    gulp.watch(source + '/templates/**/*.jade', ['build-summary', 'build-categories-summary', 'build-content', 'build-pages']);
    gulp.watch(source + '/content/**/*.md', ['build-content', 'build-summary', 'build-categories-summary']);
});

/**********************************************
 * Fonts
 *********************************************/
// Copy fonts used with materialize
gulp.task('copy-fonts', function () {
    return gulp.src(node_modules_path + '/materialize-css/fonts/*/**')
        .pipe(gulp.dest(destination + '/assets/fonts/'));
});


/**********************************************
 * Assets
 *********************************************/
// Copy fonts used with materialize
gulp.task('copy-assets', function () {
    return gulp.src(source + '/assets/images/*')
        .pipe(gulp.dest(destination + '/assets/images/'));
});

/**********************************************
 * Gulp misc tasks
 *********************************************/
// Start a local webserver
gulp.task('webserver', function() {
    gulp.src(destination)
        .pipe(plugins.serverLivereload({
            livereload: true,
            directoryListing: false,
            open: true
        }));
});

gulp.task('vendors', function() {

    var vendors = [];
    vendors.push(node_modules_path+'/jquery/dist/jquery.min.js');
    vendors.push(node_modules_path+'/materialize-css/dist/js/materialize.min.js');
    vendors.push(node_modules_path+'/highlight.js/lib/highlight.js');

    return gulp.src(vendors)
        .pipe(plugins.concatSourcemap('vendors.js'))
        .pipe(gulp.dest(destination+'/vendors/js/'));

});

gulp.task('minify-vendors', ['vendors'], function() {

    return gulp.src(destination+'/vendors/js/vendors.js')
        .pipe(plugins.uglify())
        .pipe(plugins.rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest(destination+'/vendors/js/'));

});


// Link CSS and JS with index.html
gulp.task('index', ['parse-categories'], function () {

    return gulp.src(source + '/templates/index.jade')
        .pipe(plugins.data(function(file) {

            // Add categories list :
            file.frontMatter = {
                categories: contentCategories
            };

            return file.frontMatter;

        }))
        .pipe(plugins.jade({
            pretty: true
        }))
   //     .pipe(plugins.inject(gulp.src(destination+'/vendors/js/**.*.min.js', {read: false}), {name: 'vendor', relative: true}))
        .pipe(plugins.inject(gulp.src([destination+'/assets/css/**/*.min.css', destination+'/assets/css/**/*.min.js'], {read: false}), {ignorePath: 'dist'}))
        .pipe(gulp.dest(destination));
});

//gulp.task('markdown-meta-extract', function(){
//
//    var markdown = require('gulp-markdown-to-json');
//    return gulp.src(source + '/content/**/*.md')
//        .pipe(markdown(
//            {
//                pedantic: true,
//                smartypants: true,
//                pretty: true
//            }
//        ))
//        .pipe(gulp.dest(tmp + '/content/'));
//
//});



var contentCategories = [];
gulp.task('parse-categories', function(){
    contentCategories = [];

    // Source : http://stackoverflow.com/a/24594123
    function getDirectories(srcpath) {

        var fs = require('fs');
        var    path = require('path');

        return fs.readdirSync(srcpath).filter(function(file) {
            return fs.statSync(path.join(srcpath, file)).isDirectory();
        });
    }

    function getFiles(srcpath) {

        var fs = require('fs');
        var    path = require('path');

        return fs.readdirSync(srcpath).filter(function(file) {
            return fs.statSync(path.join(srcpath, file)).isFile();
        });
    }

    var categoriesLabel = getDirectories(source + '/content/');

    for(var i=0; i<categoriesLabel.length; i++) {

        var catArticles = getFiles(source + '/content/' + categoriesLabel[i]);

        contentCategories[i] = {
            label: categoriesLabel[i],
            count: catArticles.length,
            articles: catArticles
        }
    }

});

// Create last articles (index) page
var articles = [];
gulp.task('parse-articles', function(){

    articles = [];
    var path = require('path');
    return gulp.src(source + '/content/**/*.md')
        .pipe(plugins.foreach(function(stream, file){


            return stream
                .pipe(plugins.frontMatter({
                    remove: true // remove front-matter header
                }))
                .pipe(plugins.data(function(file) {

                    var categoryFolder = path.dirname(file.path).split(path.sep).pop();
                    if(categoryFolder && categoryFolder!== 'content'){

                        file.frontMatter.categoryLabel = categoryFolder;
                    }

                    var fileLink = path.win32.basename(file.path, '.md') + ".html";
                    if(fileLink) {

                        var link = '/content';

                        if(file.frontMatter.categoryLabel){
                            link = link + '/' + file.frontMatter.categoryLabel;
                        }
                        file.frontMatter.link = link + '/' + fileLink;
                    }

                    articles.push(file.frontMatter);
                }))
        }));
});

gulp.task('build-summary', ['parse-categories', 'parse-articles'], function(){

    // Retrive all articles
    // TODO: ordered by smtg
    return gulp.src(source + '/templates/index.jade')
        .pipe(plugins.data(function(file) {

            // Add categories list :
            file.frontMatter = {
                categories: contentCategories,
                articles: articles
            };

            return file.frontMatter;

        }))
        .pipe(plugins.jade({
            pretty: true
        }))
        //     .pipe(plugins.inject(gulp.src(destination+'/vendors/js/**.*.min.js', {read: false}), {name: 'vendor', relative: true}))
        .pipe(plugins.inject(gulp.src([destination+'/assets/css/**/*.min.css', destination+'/assets/css/**/*.min.js'], {read: false}), {ignorePath: 'dist'}))
        .pipe(gulp.dest(destination));

});


gulp.task('build-categories-summary', ['parse-categories', 'parse-articles'], function(){
    // Retrive all articles
    // TODO: ordered by smtg

    contentCategories.forEach(function(category){
        gulp.src(source + '/templates/filterby-category.jade')
            .pipe(plugins.data(function(file) {
                var categoryArticles = [];


                for(var j=0; j<articles.length; j++) {
                    var currentArticle = articles[j];

                    if(currentArticle && currentArticle.categoryLabel)
                    {
                        if(currentArticle.categoryLabel == category.label) {
                            categoryArticles.push(currentArticle);
                        }
                    }

                }

                // Add categories list :
                file.frontMatter = {
                    categories: contentCategories,
                    articles: categoryArticles,
                    categoryLabel: category.label
                };

                return file.frontMatter;

            }))
            .pipe(plugins.jade({
                pretty: true
            }))
            //     .pipe(plugins.inject(gulp.src(destination+'/vendors/js/**.*.min.js', {read: false}), {name: 'vendor', relative: true}))
            .pipe(plugins.inject(gulp.src([destination+'/assets/css/**/*.min.css', destination+'/assets/css/**/*.min.js'], {read: false}), {ignorePath: 'dist'}))
            .pipe(plugins.rename('index.html'))
            .pipe(gulp.dest(destination + '/content/' + category.label))
    });

});

gulp.task('build-content', ['parse-categories'], function(){

    var layout = require('gulp-layout');
    var path = require('path');



    return gulp.src(source + '/content/**/*.md')
        .pipe(plugins.frontMatter({
            remove: true // remove front-matter header
        }))
        .pipe(plugins.markdown({
            highlight: function (code) {
                return require('highlight.js').highlightAuto(code).value;
            }
        }))

        .pipe(layout(function(file) {
            // Convert layout to jade file path
            file.frontMatter.layout = source + '/templates/layout/' + file.frontMatter.layout + '.jade';

            // Add article category
            var categoryFolder = path.dirname(file.path).split(path.sep).pop();
            file.frontMatter.categoryLabel = categoryFolder;

            // Add categories list :
            file.frontMatter.categories = contentCategories;

            return file.frontMatter;
        }))

        //.pipe(layout({
        //  title: 'A super title',
        //    layout: source + '/templates/layout/article.jade'
        //}))
        .pipe(gulp.dest(destination + '/content/'));

});

gulp.task('build-pages', function(){

    return gulp.src(source + '/templates/pages/**/*.jade')
        .pipe(plugins.jade({
            pretty: true
        }))
        .pipe(gulp.dest(destination + '/pages/'));

});

// Copy and optimize images
gulp.task('media', function(){

    return gulp.src([source + '/media/**/*.jpg', source + '/media/**/*.png', source + '/media/**/*.gif', source + '/media/**/*.svg'])
        //.pipe(plugins.image({
        //    pngquant: true,
        //    optipng: false,
        //    zopflipng: true,
        //    jpegRecompress: false,
        //    jpegoptim: true,
        //    mozjpeg: true,
        //    gifsicle: true,
        //    svgo: true
        //}))
        .pipe(gulp.dest(destination + '/media/'));
});


/**********************************************
 * Gulp main tasks
 *********************************************/

gulp.task('clean', function () {
    return gulp.src(destination, {read: false, force: true})
        .pipe(plugins.clean());
});

// Build for dev
gulp.task('resources', ['css', 'vendors', 'copy-fonts']);

// Build for prod = Build + minify-css
gulp.task('build', plugins.sequence('clean', 'resources',  'media', 'minify-css', 'minify-vendors', 'copy-assets', 'build-content', 'build-summary', 'build-categories-summary', 'build-pages'));

// Tâche par défaut
gulp.task('default', plugins.sequence('clean', 'resources',  'media', 'minify-css', 'minify-vendors', 'copy-assets', 'build-content', 'build-summary', 'build-categories-summary', 'build-pages', 'watch', 'webserver'));

