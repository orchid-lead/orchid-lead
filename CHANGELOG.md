# Orchid Lead Change Log

_v3.0.2— March 28, 2019_

* fixed bug to reload helpers and partials from the file system when a shared source file changes

_v3.0.1— March 27, 2019_

* updated dependencies

_v3.0.0 — March 27, 2019_

* when a change to a shared source file is detected, only output files for source files that have changed since orchid-lead was started will be regenerated.
* the old behavior of regernerating all output files can be restored by using the `--rebuild-all` option to the `watch` sub-command.

_v2.5.0 — October 16, 2018_

* added feature to build all templates in the same folder as the file that changed when watching
* added feature where data contexts are uncached when not in production environment
* fixed a bug where changes to data.json files did not compile the related template
* upgraded dependency: front-matter

_v2.4.2 — October 16, 2018_

* added option to watch command to run the initial build on start

_v2.4.1 — June 13, 2018_

* increased minimum version of lodash library to address vuln

_v2.4.0 — June 13, 2018_

* added Q promises library for Q.allSettled and Q.promisify
* wait until all pages are built before wrapping up, even if there's an error

_v2.3.1 — June 5, 2018_

* debounce the callback for change events for files that require a full build

_v2.3.0 — April 19, 2018_

* per-page data context is loaded into the root data context instead of under the `page` property, accessing the `page` property is deprecated
* page output path is available in the global `__path` variable in the data context, the `page.path` property is deprecated
* no longer overrides global fs methods with graceful-fs, only local
* no longer re-builds the Handlebars template file when a nearby CSS or JS file is updated
* fixed bug where an error was reported for pages that should not be built in `orchid-lead watch`
* improved consistency of relative paths in log

_v2.2.3 — April 13, 2018_

* added code the always strip "index.html" from the page path variable in the data context

_v2.2.2 — February 8, 2018_

* dependencies were updated to their latest

_v2.2.1 — October 5, 2017_

* changed format of human readable date string in future pubs file
* improved documentation of this option

_v2.2.0 — September 28, 2017_

* added option to output file containing a list of future publication dates
    * this can be used to schedule builds
* refactored more loops with async functions to use Promises
* copying static files and saving future pub dates are now down after building is completed
* added log message when everything is done building
* updated `orchid-lead watch` to "gracefullify" all calls to `fs`
* added code to ignore data.js files during an add event
* refactored `registerPartials` function to use glob to find all partial files instead of homemade recursive fuction that didn't recurse more than one level.


_v2.1.4 — June 13, 2017_

* allow constructor to be called without options

_v2.1.3 — June 8, 2017_

* switched to using graceful-fs to prevent EMFILE errors
* changed log level for file copied and file added form info to debug


_v2.1.2 — May 11, 2017_

* fixed bug when processing an array to data contexts that lead to first context to resolve to be the only file reportedly created
* properly log each file built
* sorted the output paths when building an array of data contexts

_v2.1.1 — March 28, 2017_

* improved error handling

_v2.1.0 — February 6, 2017_

* added page output path to data context before rendering

_v2.0.0 — January 19, 2017_

__Breaking Change:__ many API methods are now async to support async data.js with Promises. Note, the command line interface has not changed.

* allow for async data.js files with Promises

_v1.1.0 — October 21, 2016_

* save config file with indentation
* moved some shared code into a library
* added task to lint JS files
* fixed another bug when coping static files

_v1.0.1 — October 21, 2016_

* fixed bug when coping static files

_v1.0.0 — September 21, 2016_

* initial version for public release
