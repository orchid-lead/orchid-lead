# Orchid Lead Change Log


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
