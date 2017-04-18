# ITP Express Redis Cache

[![NPM version][npm-version-image]][npm-url] [![MIT License][license-image]][license-url]

A light api route cache system with Redis for Express.js

## Installation

    npm install itp-express-redis-cache

## Usage

```javascript
const express = require('express');
const app = express();

const ITPExpressRedisCache = require('itp-express-redis-cache')();

app.get('/', ITPExpressRedisCache.route(), (req, res) => {
  res.json({ foo: 'bar' });
});

app.listen(3000, () => {
  console.log('Example app listening on port 3000!');
});
```

## Options

Init options:

```javascript
const ITPExpressRedisCache = require('itp-express-redis-cache')({
  port: 6379, // redis port
  host: 'localhost', // redis host
  authPass: null, // redis pass
  prefix: 'my-sample-app', // redis key prefix, e.g. 'my-sample-app:route:GET:/'
  enabled: true, // disable/enable route caching, for example in debug mode
  excludeStatuscodes: 500, // disable response caching based on response statuscode. Possible values: number, array, function (excludes 500 and higher by default)
});
```

Route middleware options:

```javascript
ITPExpressRedisCache.route({
  key: 'custom-redis-key-for-route', // custom redis key
  expire: 120, // expiration time in seconds
})
```

The route key parameter can also be a function:

```javascript
ITPExpressRedisCache.route({
  key: (req) => `custom-key:${req.originalUrl}`, // custom function
  expire: 120, // expiration time in seconds
})
```

## Supported env variables

- REDIS_HOST
- REDIS_PORT
- REDIS_PASS

## License

ITP-Express-Redis-Cache is freely distributable under the terms of the [MIT license](https://github.com/inthepocket/itp-express-redis-cache/blob/master/LICENSE).

[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: LICENSE

[npm-url]: https://npmjs.org/package/itp-express-redis-cache
[npm-version-image]: http://img.shields.io/npm/v/itp-express-redis-cache.svg?style=flat
[npm-downloads-image]: http://img.shields.io/npm/dm/itp-express-redis-cache.svg?style=flat
