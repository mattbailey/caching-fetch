# caching-fetch

Wrapper around [fetch](https://fetch.spec.whatwg.org/) with localStorage cache support.

Uses [isomorphic-fetch](https://github.com/matthew-andrews/isomorphic-fetch) to
run tests standalone with mocha and to use polyfill in the browser.

Module caching-fetch wraps fetch to cache responses in the localStorage.

Additionally it reports connection state change (lost/restored) via callback.

Also, module provides default settings, which application can set during
initialization and which are merged with settings, passed in arguments.

Module caches only 'GET' requests and only with HTTP headers 'Expires'
or 'Last-Modified'.

Module returns cached value if it is not expired, or if server returns
response with error status (including 304 - Not modified), or if timeout
occurred during request.

Setting '{cache: "no-cache"}' could be used to bypass cache (to use single
API or only notifications about connection state change).

Other supported values:
  - default - default setting, cache only requests with 'Expires'
              or 'Last-Modified' headers;
  - reload  - force to reload, cache entry will be removed and request
              to server
              forced;

## Motivation

I started it like a wrapper around minified's $.request(), but found Fetch API
more appealing. I don't have a goal to implement part of API and even didn't
bother to study it deeply. I picked setting name and values, because I like them
and don't worry whether I use them completely right or not.

I think, when Fetch API will be prevelent, I'll switch to it, but for now
caching part seems not ready yet. At least not in polyfill.

So, for now this is an experimental and non-complied way to use caching with
Fetch API even on browsers wich support it via polyfill.

I think, it can be used on node as well, at least I tested it with Nock
and mock localStorage.

## Installation

	npm install caching-fetch --save

## Usage

	var $fetch = require('caching-fetch');

	// Optionally set default headers and caching options.
	$fetch.setDefaultOptions({
        method: 'POST', // change default and provide other value
		                // in individual request if necessary
        headers: {
            'Content-Type': 'application/json'
        },
        cache: 'reload', // force all to reload every time
        timeout: 5000
    });
	
	// Optionally subscribe to connection status.
	xhr.connectionStatusSubscribe(status => {
		console.log('Connection ' + status ? 'acquired' : 'lost');
	});
		
	// Optionally build url string from JSON.
	var url = $fetch.url('http://www.example.com', {a: 42, b: 'zzz'});
	
	// Similary to Fetch API, but some data and methods may be absent.
	// For now only text and json supported.
	$fetch(url)
		.then(response => {
			if (response.status === 200 || response.status === 0) {
				return Promise.resolve(response.json())
			} else {
				return Promise.reject(new Error(response.statusText))
			}
		})
		.then(json => {
			//...
		})
		.catch(e => {
			//...
		});

## Tests

    npm install
    npm test

## License

[MIT](https://github.com/letsrock-today/caching-xhr/blob/master/LICENSE)
