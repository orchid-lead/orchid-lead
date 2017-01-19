# Orchid Lead

Orchid Lead is a program focused on doing one thing well: generating HTML† files from templates and data, in this case, [Handlebars][handlebars] templates and JSON data. Orchid Lead is a static site generator, without all the cruft and requirements of other static site generators because it focuses on the HTML and the data.

Notably, Orchid Lead doesn't dictate a particular build tool. It integrates with your current build tools like [Gulp][gulp], [Brunch][brunch], [NPM][npm-build-tool], or even [make][make]. It gathers the data and runs it through the Handlebars template, along with helpers, partials, and [layouts][waxon] to generate the final output file in the build folder.

While Orchid Lead can copy static assets from the source folder to the build folder, it doesn't do that by default because there are already excellent tools for handling JavaScript and CSS, like [Babel][babel] and [PostCSS][postcss].

Orchid lead also focuses on speed, especially, speed of development. With an off-the-shelf file system watcher, the excellent [Chokidar][chokidar], Orchid Lead is able to quickly and reliably rebuild output files as the sources change. This feature is best paired with [Browsersync][browsersync] or [LiveReload][livereload] so the changes appear instantly in your browser.

† HTML is the primary use case, but any text file will work.


## Install

If you already have node.js installed, then simply use npm to install orchid-lead. Note, installing the command globally makes setting up a new project easier, but is not required.

```shell
npm install orchid-lead --global
```


## Setup

If Orchid Lead is installed globally and you don't want to change the defaults then setting up a new project is as easy as:

```shell
orchid-lead init new-dirname
cd new-dirname
```

Or, initialize and existing directory:

```shell
cd existing-dirname
orchid-lead init
```

This will install the default starter kit into new-dirname and existing-dirname, respectfully. If you'd like to use a different starter kit then just add the `--with` argument and a github repo reference.

```shell
orchid-lead init --with orchid-lead/starter-kit-default new-dirname
cd new-dirname
```


## Usage

For regular development use the `watch` sub-command and it will monitor the source files for changes and regenerate the output files on-demand.

```shell
orchid-lead watch
```

Or, generate the output files once with the `build` sub-command.

```shell
orchid-lead build
````

Optionally, you can specify the specific source files to regenerate with a [glob][glob] pattern.

```shell
orchid-lead build "site/pages/**/*.hbs"
````

Or, a normal file path.

```shell
orchid-lead build site/pages/index.hbs
````


### Handlebars Templates

All templates should be written in [Handlebars][handlebars].

> Handlebars provides the power necessary to let you build semantic templates effectively with no frustration.

The default build will look for all Handlebars files with the `hbs` extension and execute them with their related [data context][#data-context].

Handlebar templates with filenames that exactly match their parent directory name will be output as `index.html` files.

Note, templates do not have to be HTML, any plain text file can be templated with Handlebars. For example, use `robots.txt.hbs` to generate `robots.txt` from a template with a dynamic data context.

Orchid Lead automatically registers all helper files in `site/helpers` (default) and all partial files in `site/partials` (default), so those helpers and partials are available in every tempalte. Orchid Lead also includes the [Wax On][wax-on] Handlebars helpers to allow templates to be extended with other templates, known as layouts. All layout files are found in `site/layouts` by default.


### Data Context

Orchid Lead builds the a data context for each template it executes. It will pull in data from the following locations:

1. A YAML block at the top of the tempalte file (a.k.a. front matter)
1. A nearby data file
1. The site-wide data file

Front matter is the easiest way to associate data with a template. The front matter must be formatted as a YAML block. Here's an example:

```yaml
    ---
    title: Welcome to Company, Inc.
    description: At Company, we make the best gadgets.
    ---
```

Note, the data context is shared with Handlebars layouts and partials, so front matter is a great way to share data specific to template with a layout or a partial. Don't forget, Orchid Lead includes the [Wax On][wax-on] Handlebars helpers to extend templates and layouts with template inheritance.

Orchid Lead will also look for a nearby data file. The data file may be a static JSON data file or a dynamic JavaScript data file. The data file should have the same basename as the template, but end in either `data.json` or `data.js`. The JavaScript data file must be a node module that returns a plain-old JavaScript object or a Promise.

#### Sample data.js file (sync)

```js
    // data.js (sync)
    
    function calc() {
        return 2 + 2;
    }
    
    module.exports = {
    	result: calc()
    };
```

#### Sample data.js file (async)

```js
    // data.js (async with promies)
    var request = require("request");

    module.exports = new Promise((resolve, reject) => {
        let data = {};
        
        request("http://www.google.com", function (error, response, body) {
            if (err) {
                reject(err);
            } else {
                if (response.statusCode == 200) {
                    data.googleHtml = body;
                    resolve(data);
                } else {
                    reject(new Error(`Invalid status code ${response.statusCode}`));
                }
            }
        })
    });
```

Site wide data is pulled in from `site/data.js`. All site-wide data is available under the `site` object in the Handlebars data context. The nearby data file and the front matter are merged together and available under the `page` object in the Hanldebars data context.


## Configuration

The `orchid-lead` command accepts the following arguments.

    -C, --config <path>  path to config file
    --output <path>      path where output files are saved
    --site <path>        path to site
    --helpers <path>     path to helpers
    --layouts <path>     path to layouts
    --pages <path>       path to pages
    --partials <path>    path to partials

The default config filename is `.orchidleadrc` and the default location is in the project folder. The file is saved in JSON format. Note, command line arguments override the config file settings.


## Todo

* remove sync functions and use more Promises
* fix bug reading `.orchidleadrc` file from alternate path
* allow default config to be overridden
* ask user where they'd like their files to be during `init`
* add `.orchidleadrc` file support for storing configuration
* add `clean` sub-command for removing generated files
* test performance
* consolidate functions between the `build` and `watch` sub-commands
* create JS API to ease use with Gulp
* test with node 4.5.x
* check for existing install before initializing

Please create a new issue if you find a bug or would like to recommend a new feature.


## Change Log

The Orchid Lead change log can be found in the [CHANGELOG.md][2] file within the project.


## License

Orchid Lead is available under the [MIT License][1].

[1]: https://github.com/orchid-lead/orchid-lead/blob/master/LICENSE
[2]: https://github.com/orchid-lead/orchid-lead/blob/master/CHANGELOG.md
[handlebars]: http://handlebarsjs.com
[npm-build-tool]: https://www.keithcirkel.co.uk/how-to-use-npm-as-a-build-tool/
[wax-on]: https://www.npmjs.com/package/wax-on
[postcss]: http://postcss.org
[babel]: http://babeljs.io
[chokidar]: https://github.com/paulmillr/chokidar
[livereload]: https://github.com/livereload/livereload-js
[browsersync]: https://www.browsersync.io
[gulp]: http://gulpjs.com
[brunch]: http://brunch.io
[make]: https://www.gnu.org/software/make/
