/*
 * orchid-lead: generate HTML
 * Copyright © 2015 Keith W. Shaw <keith.w.shaw@gmail.com>
 * MIT Licensed
 */

"use strict";

// import modules

const fs = require("graceful-fs");
const path = require("path");
const crypto = require("crypto");

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
/*
 * BUG, files of the same name will clobber each other even if under different
 * folders.
 */
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

const deboucedWarning = _.debounce(console.warn, 400);

// module to export
class OrchidLead {
    constructor (options) {
        let self = this;

        options = options || {};

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

        // placeholder for future publciation dates
        this.futurePublicationDates = [];

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
    /*
     * unfortunately, at this time, this must be sync
     */
    registerPartials () {

        let files, partials;

        // find all HBS files in the partials directory
        files = glob.sync(path.join(this.path.partials, "**/*.hbs"));
        if (files) {

            // create partials object to pass to Handlebars for registration
            partials = files.reduce((acc, v) => {

                let partialPath, partialName;

                // Handlebars expects this object to have properties with the partial name with the code in the property value
                partialPath = path.relative(this.path.partials, v);
                partialName = path.join(
                    path.dirname(partialPath),
                    path.basename(partialPath, ".hbs")
                );
                acc[partialName] = fs.readFileSync(v, "utf8");

                return acc;

            }, {});
            Handlebars.registerPartial(partials);

        }

    }

    /**
     * create HTML from Handlebars template file
     * @arg {String} path to Handlebars template file
     * @returns {Promise} promise of the output path(s) created
     */
    create (filePath) {
        let ol = this;

        return new Promise(function (resolve, reject) {

            // extract front-matter from view source
            let {data, source} = ol.splitSource(filePath);

            // compile source to template
            let template = ol.compile(source);

            // gather context
            ol.gatherContext(data, filePath).then(function (context) {

                if (Array.isArray(context)) {

                    // output a page per data context with same template
                    // create an array of promises and only resolve once all promises in the array are resolved
                    let promises = context.map(item => {

                        let dirname, itemPath;

                        if (!item.filename) {
                            item.filename = crypto.createHash("sha1")
                                .update(item)
                                .digest("hex")
                                .slice(-7);
                        }
                        dirname = path.dirname(filePath);
                        itemPath = path.join(dirname, item.filename);

                        return ol.outputTemplate(itemPath, item, template);

                    });

                    Promise.all(promises).then(resolve).catch(reject);

                } else {

                    ol.outputTemplate(filePath, context, template).then(function (outputPath) {

                        // always return an array of output paths, even if just one
                        resolve([outputPath]);

                    }).catch(reject);

                }

            }).catch(reject);

        });

    }
    /**
     * outputTemplate - evaluate template with context and output to file path
     * @arg {String} filePath The source path used to determin the output path
     * @arg {Object} context The data context to render the template
     * @returns {Promise} promise of output path
     */
    outputTemplate (filePath, context, template) {
        let ol = this;

        return new Promise(function (resolve, reject) {

            // check if this should be built
            if (!ol.shouldBeBuilt(filePath, context)) {
                return resolve();
            }

            // add path to data context
            context["__path"] = "/" + path.relative(
                ol.path.output,
                ol.getOutputPath(filePath)
            ).replace("index.html", "");

            // compile template and context to HTML
            let html = template(context);

            // output html
            ol.output(html, filePath).then(function (outputPath) {

                resolve(outputPath);

            }).catch(reject);

        });


    }
    /**
     * should be built
     * allow page data to control weather it is built or not
     * @param page {Object} page object from data context
     * @return {boolean} to build or not to build
     */
    shouldBeBuilt (filePath, context) {

        // build everything in dev
        if (process.env.NODE_ENV === "production") {

            // don't build items marked as draft
            if (context.draft) {
                return false;
            }

            // don't build items with publication dates in the future
            // look for publication date in page data context
            let publicationDate = context.publicationDate || context.publication_date || context["publication date"] || context["publication:date"];
            if (publicationDate) {

                publicationDate = new Date(publicationDate);
                if (isNaN(publicationDate.getTime())) {

                    logger.warn("Invalid publication date in %s", filePath);
                    return false;

                }

                if (publicationDate.getTime() > Date.now()) {

                    this.addPublicationDate(publicationDate);
                    return false;

                }

            }

        }

        return true;

    }
    getPublicationDates () {

        return this.futurePublicationDates;

    }
    setPublicationDates(publicationDates) {

        this.futurePublicationDates = publicationDates;

    }
    addPublicationDate(publicationDate) {

        if (!(publicationDate instanceof Date)) {
            publicationDate = new Date(publicationDate);
            if (isNaN(publicationDate) || publicationDate.getTime() >= 1) {
                throw new Error("Invalid date");
            }
        }
        // keep the set unique
        let match = this.futurePublicationDates.filter(d => d.getTime() === publicationDate.getTime());
        if (match.length === 0) {
            this.futurePublicationDates.push(publicationDate);
        }

    }
    destroy (filePath) {

        let ol = this;

        return new Promise(function (resolve, reject) {

            // remove corresponding build files
            let outputPath = ol.getOutputPath(filePath);
            fs.unlink(outputPath, function (err) {

                let dirname;

                if (err) {

                    reject(err);

                } else {

                    // clean up empty directories
                    dirname = path.dirname(outputPath);
                    vacuum(dirname, { "base": ol.path.root }, function (err) {

                        if (err) {

                            reject(err);

                        } else {

                            resolve(outputPath);

                        }

                    });

                }

            });


        });

    }
    splitSource (filePath) {

        // TODO make async with promise
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
        let ol = this;

        return new Promise(function (resolve, reject) {

            let data, site;

            // get site data from site.js in site folder
            site = _.defaults({
                path: ol.path
            }, require(path.resolve(ol.path.site, "data.js")));

            // get page specific data from front-matter, data.js, and data.json
            data = ol.getData(filePath);

            if (data instanceof Promise) {

                // async data.js
                data.then(d => {

                    resolve(ol.buildContext(d, frontMatter, site));

                }).catch(reject);

            } else {

                // sync data.js
                resolve(ol.buildContext(data, frontMatter, site));

            }

        });
    }
    /**
     * buildContext
     * @arg {} foo
     * @returns {Object} the page context
     */
    buildContext (data, frontMatter, site) {

        let context;

        if (Array.isArray(data)) {

            // build up an array of contexts for multiple pages
            context = data.map(datum => {

                let context = _.defaults({ "site": site }, frontMatter, datum);

                // add deprecated `page` getter
                Object.defineProperty(context, "page", {
                    get: function () {
                        deboucedWarning("DEPRECATED: page property access");
                        return context;
                    }
                });

                return context;

            });

        } else {

            // build a context for a single page
            context = _.defaults({ "site": site }, frontMatter, data);

            // add deprecated `page` getter
            Object.defineProperty(context, "page", {
                get: function () {
                    console.warn("DEPRECATED: page property access");
                    return context;
                }
            });

        }

        return context;

    }


    /**
     * getData - read data from possible file locations
     * @param filePath {String} path to page
     * @return data {Object} data for the page
     */
    getData (filePath) {

        let basename, data, dirbasename, dirname, extname, file;

        dirname = path.dirname(filePath);
        dirbasename = path.basename(dirname);
        basename = path.basename(filePath, ".hbs");

        // remove an extension from the basename, if present
        extname = path.extname(basename);
        if (extname) {

            basename = path.basename(basename, extname);

        }

        let filesToTry = [
            path.resolve(dirname, basename + extname + ".data.js"),
            path.resolve(dirname, basename + extname + ".data.json"),
            path.resolve(dirname, basename + ".data.js"),
            path.resolve(dirname, basename + ".data.json"),
            path.resolve(dirname, dirbasename + ".data.js"),
            path.resolve(dirname, dirbasename + ".data.json"),
            path.resolve(dirname, "index.data.js"),
            path.resolve(dirname, "index.data.json"),
            path.resolve(dirname, "data.js"),
            path.resolve(dirname, "data.json")
        ];

        data = {};
        for (file of filesToTry) {

            try {
                data = require(file);
                break;
            } catch (err) {

                // handle module not found for the require attempted
                if (err.code === "MODULE_NOT_FOUND") {
                    if (err.message.indexOf(file) !== -1) {
                        // ignore, cannot find module 'file'
                        continue;
                    }
                }
                throw err;
            }

        }

        return data;

    }
    output (html, filePath) {
        let ol = this;

        return new Promise(function (resolve, reject) {

            let outputPath = ol.getOutputPath(filePath);

            // ensure output path exists
            mkdirp(path.dirname(outputPath), function (err) {

                if (err) {

                    reject(err);

                } else {

                    fs.writeFile(outputPath, html, function (err) {

                        if (err) {

                            reject(err);

                        } else {

                            resolve(outputPath);

                        }

                    });

                }

            });

        });

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
                logger.debug("{cyan:File copied:} {magenta:%s}", path.relative(this.path.root, outputPath));

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
