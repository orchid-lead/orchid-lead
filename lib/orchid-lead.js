/*
 * orchid-lead: generate HTML
 * Copyright © 2015 Keith W. Shaw <keith.w.shaw@gmail.com>
 * MIT Licensed
 */

"use strict";

// import modules

const fs = require("fs");
const path = require("path");

const fm = require("front-matter");
const findup = require("findup-sync");
const _ = require("lodash");
const Handlebars = require("handlebars");
const mkdirp = require("mkdirp");
const vacuum = require("fs-vacuum");
const wax = require("wax-on");
const glob = require("glob");

const logger = require("eazy-logger").Logger({
    "prefix": "[{gray:OL}] ",
    "useLevelPrefixes": false
});

// private helper functions
function requireDir(dirpath) {

    let results, pattern, files;

    results = {};
    pattern = path.join(dirpath, "**/*.js");
    files = glob.sync(pattern);
    if (files !== [pattern]) {

        files.forEach(function (file) {

            let basename = path.basename(file, ".js");
            results[basename] = require(file);

        });

    }

    return results;
}

// module to export
class OrchidLead {
    constructor (options) {
        let self = this;

        // load saved options from file
        let rcfile = this.loadOptions(options.config);

        this.options = _.defaults(options, rcfile, {
            output: "./build",
            site: "./site",
            helpers: "{{site}}/helpers",
            layouts: "{{site}}/layouts",
            pages: "{{site}}/pages",
            partials: "{{site}}/partials",
        });
        delete this.options.config;
        _.forOwn(self.options, function (value, key, object) {

            // replace {{site}} placeholder with site value
            object[key] = value.replace("{{site}}", self.options.site);

        });
        let root = path.dirname(findup(this.options.site));
        this.path = {
            root: root,
            output: path.resolve(root, this.options.output),
            site: path.resolve(root, this.options.site),
            helpers: path.resolve(root, this.options.helpers),
            layouts: path.resolve(root, this.options.layouts),
            pages: path.resolve(root, this.options.pages),
            partials: path.resolve(root, this.options.partials)
        };

        // save options
        this.saveOptions(options.config);

        // register Handlebars helpers
        this.registerHelpers();

        // register Handlebars partials
        this.registerPartials();

    }
    loadOptions (file) {

        let options, rcfile;

        options = {};
        if (!file) {

            let filename = ".orchidleadrc";
            try {

                file = findup(path.resolve(filename));

            } catch (err) {

                logger.error("{yellow:Config file not found: %s}", filename);

            }

        }
        if (file) {

            try {

                rcfile = fs.readFileSync(path.resolve(file), "utf8");
                options = JSON.parse(rcfile);

            } catch (err) {

                logger.warn(`{yellow:${err.message}}`);

            }

        }

        return options;

    }
    saveOptions (file) {

        file = file || path.join(this.path.root, ".orchidleadrc");
        try {

            fs.writeFileSync(file, JSON.stringify(this.options, null, 4));

        } catch (err) {

            logger.error(err);

        }

    }
    registerHelpers () {

        // register Wax On helpers
        wax.on(Handlebars);
        wax.setLayoutPath(this.path.layouts);

        // register site helpers
        fs.accessSync(this.path.helpers, fs.constants.R_OK);
        Handlebars.registerHelper(requireDir(this.path.helpers));
    }
    registerPartials () {

        let partials = this.recursivePartialFind(this.path.partials);
        Handlebars.registerPartial(partials);

    }
    recursivePartialFind (dir, prefix) {

        var partials = {};

        fs.accessSync(dir, fs.constants.R_OK);
        let files = fs.readdirSync(dir);
        if (files) {
            let dirs = [];
            files.map(function (file) {
                return path.join(dir, file);
            }).filter(function (file) {
                let stat = fs.statSync(file);
                if (stat.isDirectory()) {
                    dirs.push(file);
                }
                return stat.isFile();
            }).forEach(function (file) {

                let content = fs.readFileSync(file, { encoding: "utf8" });
                let key = path.basename(file, ".hbs");
                key = path.basename(key, ".svg");
                if (prefix) {
                    key = prefix + "/" + key;
                }
                partials[key] = content;

            });
            if (dirs) {

                dirs.forEach(function (nextDir) {

                    let prefix = _.trim(nextDir.replace(dir, ""), "/");
                    _.assign(partials, this.recursivePartialFind(nextDir, prefix));

                }.bind(this));

            }
        }

        return partials;
    }
    create (filePath) {

        // extract front-matter from view source
        let {data, source} = this.splitSource(filePath);

        // gather context
        let context = this.gatherContext(data, filePath);

        // compile source to template
        let template = this.compile(source);

        if (Array.isArray(context)) {

            let that = this;

            // output a page per data context with same template
            context.forEach(function (item) {

                let dirname = path.dirname(filePath);
                if (!item.page.filename) {
                    const crypto = require("crypto");
                    const hash = crypto.createHash("sha1");
                    hash.update(item.page);
                    item.page.filename = hash.digest("hex").slice(-7);
                }
                let itemPath = path.join(dirname, item.page.filename);

                that.outputTemplate(itemPath, item, template);

            });

        } else {

            this.outputTemplate(filePath, context, template);

        }

    }
    /**
     * outputTemplate - evaluate template with context and output to file path
     * @arg {String} filePath The source path used to determin the output path
     * @arg {Object} context The data context to render the template
     * @returns {undefined}
     */
    outputTemplate (filePath, context, template) {

        // check if this should be built
        if (!this.shouldBeBuilt(filePath, context.page)) {
            return;
        }

        // compile template and context to HTML
        let html = template(context);

        // output html
        this.output(html, filePath);

    }
    /**
     * should be built
     * allow page data to control weather it is built or not
     * @param page {Object} page object from data context
     * @return {boolean} to build or not to build
     */
    shouldBeBuilt (filePath, page) {

        var result = true;

        // build everything in dev
        if (process.env.NODE_ENV === "production") {

            // don't build items marked as draft
            if (page.draft) {
                result = false;
            }

            // don't build items with publication dates in the future
            if (page.publication_date) {

                let publication_date = new Date(page.publication_date);
                let now = new Date();

                if (isNaN(publication_date.getTime())) {
                    
                    result = false;
                    logger.warn("Invalid publication date in %s", filePath);

                } else if (publication_date.getTime() > now.getTime()) {

                    result = false;

                }

            }

        }

        return result;

    }
    destroy (filePath) {

        // remove corresponding build files
        let outputPath = this.getOutputPath(filePath);
        fs.unlinkSync(outputPath);

        // clean up empty directories
        vacuum(path.dirname(outputPath), { base: this.path.root }, function (err) {
            if (err) {
                throw err;
            }
            logger.info("Done vacuuming.");
        });

    }
    splitSource (filePath) {

        let content, input;

        // split front matter from body of source
        input = fs.readFileSync(filePath, { "encoding": "utf-8" });
        content = fm(input);

        return {
            "data": content.attributes,
            "source": content.body
        };

    }
    compile (source) {

        return Handlebars.compile(source);

    }
    gatherContext (frontMatter, filePath) {

        let context, data, site;

        // get site data from site.js in site folder
        site = _.defaults({
            path: this.path
        }, require(path.resolve(this.path.site, "data.js")));

        // get page specific data from front-matter, data.js, and data.json
        data = this.getData(filePath);

        if (Array.isArray(data)) {

            // build up an array of contexts for multiple pages
            context = data.map(function (datum) {

                return {
                    "page": _.defaults({}, frontMatter, datum),
                    "site": site
                };

            });

        } else {

            // build a context for a single page
            context = {
                page: _.defaults(frontMatter, data),
                site: site
            };

        }

        return context;

    }
    /**
     * getPerPageCSSandJS - generate link and script tags for per-page assets
     * @arg {String} filePath - path to the hbs file
     * @returns {String} the necessary css and js helpers to load local per-page assets
     */
    getPerPageCSSandJS (filePath) {

        var basename, dirname, href, html, src;

        // find CSS and JS files
        basename = path.basename(filePath, ".hbs");
        dirname = path.dirname(filePath);
        href = path.join(path.relative(this.path.pages, dirname), basename + ".css");
        src = path.join(path.relative(this.path.pages, dirname), basename + ".js");
        html = "";

        try {

            fs.accessSync(path.resolve(this.path.pages, href), fs.constants.R_OK);
            html += `{{css "/${href}"}}`;

        } catch (err) {

            href = "";

        }

        try {

            fs.accessSync(path.resolve(this.path.pages, src), fs.constants.R_OK);
            html += `{{js "/${href}"}}`;

        } catch (err) {

            src = "";

        }

        return html;

    }
    /**
     * getData - read data from possible file locations
     * @param filePath {String} path to page
     * @return data {Object} data for the page
     */
    getData (filePath) {

        let basename, data, dirbasename, dirname, extname;

        dirname = path.dirname(filePath);
        dirbasename = path.basename(dirname);
        basename = path.basename(filePath, ".hbs");

        // remove an extension from the basename, if present
        extname = path.extname(basename);
        if (extname) {

            basename = path.basename(basename, extname);

        }

        try {

            data = require(path.resolve(dirname, basename + ".data.js"));

        } catch (err) {

            try {

                data = require(path.resolve(dirname, basename + ".data.json"));

            } catch (err) {

                try {

                    data = require(path.resolve(dirname, basename + extname + ".data.js"));

                } catch (err) {

                    try {

                        data = require(path.resolve(dirname, basename + extname + ".data.json"));

                    } catch (err) {

                        try {

                            data = require(path.resolve(dirname, dirbasename + ".data.js"));

                        } catch (err) {

                            try {

                                data = require(path.resolve(dirname, dirbasename + ".data.json"));

                            } catch (err) {

                                try {

                                    data = require(path.resolve(dirname, "index.data.js"));

                                } catch (err) {

                                    try {

                                        data = require(path.resolve(dirname, "index.data.json"));

                                    } catch (err) {

                                        try {

                                            data = require(path.resolve(dirname, "data.js"));

                                        } catch (err) {

                                            try {

                                                data = require(path.resolve(dirname, "data.json"));

                                            } catch (err) {

                                                data = {};

                                            }

                                        }

                                    }

                                }

                            }

                        }

                    }

                }

            }

        }

        return data;

    }
    output (html, filePath) {

        let outputPath = this.getOutputPath(filePath);

        // ensure output path exists
        mkdirp.sync(path.dirname(outputPath));
        fs.writeFileSync(outputPath, html);
        logger.info("{cyan:File built:} {magenta:%s}", path.relative(this.path.root, outputPath));

    }
    getOutputPath (filePath) {

        let dirname, extname, filename, relativePath;

        dirname = path.dirname(filePath);
        relativePath = path.relative(this.path.pages, dirname);
        filename = path.basename(filePath, ".hbs");
        extname = path.extname(filename);

        // use extention on filename if present
        if (extname) {

            filename = path.basename(filename, extname);

        } else {

            // default to .html when extension is not present
            extname = ".html";
        }

        // change filename to index when it matches dirname
        if (filename === path.basename(dirname)) {
            filename = "index";
        }

        return path.resolve(this.path.output, relativePath, filename + extname);

    }
    tryToCopyStaticFile (file) {

        try {

            let relativePath = path.relative(this.path.site, file);

            // drop the first folder name in the relative path
            relativePath = relativePath.split(path.sep).slice(1).join(path.sep);
            let outputPath = path.join(this.path.output, relativePath);

            // ensure directory exists
            mkdirp.sync(path.dirname(outputPath));

            // copy the files synchronously (bad, i know)
            try {

                let source = fs.readFileSync(file);
                fs.writeFileSync(outputPath, source);
                logger.info("{cyan:File copied:} {magenta:%s}", path.relative(this.path.root, outputPath));

            } catch (err) {

                logger.error("{red:Copy failed:} {magenta:%s}", path.relative(this.path.site, file));
                logger.error("{red:%s}", err);

            }

            // copy file with streams
            /*
            let source = fs.createReadStream(file);
            source.on("error", function (err) {
                logger.error("{red:Build failed:} {magenta:%s}", path.relative(this.path.site, file));
                logger.error("{red:%s}", err);
            });
            let target = fs.createWriteStream(outputPath);
            target.on("error", function (err) {
                logger.error("{red:Build failed:} {magenta:%s}", path.relative(this.path.site, file));
                logger.error("{red:%s}", err);
            });
            target.on("finish", function () {
                logger.info("{cyan:File copied:} {magenta:%s}", path.relative(this.path.root, outputPath));
            });
            source.pipe(target);
            */

        } catch (err) {

            logger.error("{red:Build failed:} {magenta:%s}", path.relative(this.path.site, file));
            logger.error("{red:%s}", err);

        }

    }
    tryToDeleteStaticFile (file) {

        try {

            fs.unlinkSync(file);

            // clean up empty directories
            vacuum(path.dirname(file), { base: this.path.root }, function (err) {
                if (err) {
                    throw err;
                }
                logger.info("Done vacuuming.");
            });

        } catch (err) {

            logger.error("{red:Build failed:} {magenta:%s}", path.relative(this.path.site, file));
            logger.error("{red:%s}", err);

        }

    }
}

module.exports = OrchidLead;
