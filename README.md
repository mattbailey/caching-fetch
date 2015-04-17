# caching-xhr
Wrapper around minifiedjs $.request() with localStorage cache support.

Module xhr wraps $.request() to cache responses in the localStorage.

Cache only 'GET' requests and only with http headers 'Expires' or 'Last-Modified'.
Setting 'cache=false' could be used to bypass cache (or just use $.request() directly).
Setting 'xhr.timeout' could be used to change request timeout (such as {xhr:{timeout:3000}}).

## Motivation

## Installation

## Usage

## Tests

    npm install
    npm test

## License

[MIT](https://github.com/letsrock-today/caching-xhr/blob/master/LICENSE)
