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

The excludeStatuscodes parameter can also be an array:

```javascript
const ITPExpressRedisCache = require('itp-express-redis-cache')({
  port: 6379,
  host: 'localhost',
  authPass: null,
  prefix: 'my-sample-app',
  enabled: true,
  excludeStatuscodes: [404, 406, 408, 410], // disable response caching based on response statuscode. Possible values: number, array, function (excludes 500 and higher by default)
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

The expire parameter can also be a function:

```javascript
ITPExpressRedisCache.route({
  key: (req) => `custom-key:${req.originalUrl}`, // custom function
  expire: (req) => 120 + 4, // expiration time in seconds
})
```

## Application-level middleware

Simply use `app.use` of express to use `ITPExpressRedisCache` as an Application-level middleware.

```javascript
app.use(ITPExpressRedisCache.route())
```

## Disable Caching inside the Route

You can disable caching for specific routes by adding `res.skipCache = true` to opt out the route from getting cached.

```javascript
app.get('/:paramKey', function (req, res) {
    res.skipCache = (paramKey === 1300);
    res.send("Hello");
});
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
