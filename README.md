# Orchid Lead

Orchid Lead is a program focused on doing one thing well: generating HTML† files from templates and data, in this case, [Handlebars][3] templates and JSON data. Orchid Lead is a static site generator, without all the cruft and requirements of other static site generators because it focuses on the HTML and the data.

Notably, Orchid Lead doesn't dictate a particular build tool. It integrates with your current build tools like [Gulp][gulp], [Brunch][brunch], [NPM][npm-build-tool], and [make][make]. It gathers the data and runs it through the Handlebars template, along with helpers, partials, and [layouts][waxon] to generate the final output file in the build folder.

While Orchid Lead can copy static assets from the source folder to the build folder, it doesn't do that by default because there are already excellent tools for handling JavaScript and CSS, like [Babel][babel] and [PostCSS][postcss].

Orchid lead also focuses on speed, especially, speed of development. With a built-in file system watcher, the excellent [Chokidar][chokidar], Orchid Lead is able to quickly and reliably rebuild output files as the sources change. This feature is best paired with [Browsersync][browsersync] or [LiveReload][livereload] so the changes appea

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

This will install the default starter kit into new-dirname and existing-dirname, respectfully. If you'd like to use a different starter kit then just add the watch argument with a github repo reference.

```shell
orchid-lead init --with orchid-lead/starter-kit-default new-dirname
cd new-dirname
```

## Usage

For regular development use the `watch` sub-command and it will monitor the sources files for changes and regenerate the output files on-demand.

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

* fix bug reading `.orchidleadrc` file from alternate path
* allow default config to be overridden
* ask user where they'd like their files to be during `init`
* add `.orchidleadrc` file support for storing configuration
* add `clean` sub-command for removing generated files
* test performance
* consolidate functions between the `build` and `watch` sub-commands
* create JS API to ease use with Gulp
* remove sync functions and use more Promises
* test with node 4.5.x
* check for existing install before initializing

Please create a new issue if you find a bug or would like to recommend a new feature.

## Change Log

The Orchid Lead change log can be found in the [CHANGELOG.md][2] file within the project.

## License

Orchid Lead is available under the [MIT License][1].

[1]: https://github.com/keithws/orchid-lead/blob/master/LICENSE
[2]: https://github.com/keithws/orchid-lead/blob/master/CHANGELOG.md
[3]: http://handlebarsjs.com
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
