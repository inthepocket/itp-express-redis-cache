const ITPExpressRedisCache = {};

/**
 * Try to return response from the cache or save it afterwards
 *
 * @param  {Object} routeOptions (view README)
 *
 * @return {function()} Route middleware
 */
ITPExpressRedisCache.route = (routeOptions = {}) => {
  return (req, res, next) => {
    if (!this.redisClient || !this.connected) {
      next();
      return;
    }

    // Generate Redis cache key
    const redisKey = generateCacheRouteKey(routeOptions.key, req);

    // Parse expire time
    const expireTime = generateExpireTime(routeOptions.expire, req);

    // Get item from Redis cache by key
    this.redisClient.hgetall(redisKey, (error, result) => {
      if (error) {
        console.error(`[ITPExpressRedisCache] Error when trying to fetch Redis key: ${redisKey}`);
        return res.sendStatus(500);
      }

      // Return cached result from Redis or save response in cache
      if (result) {
        // Set http status code if needed
        if (result.code) {
          res.status(result.code);
        }

        // Set content type header if needed
        if (result.type) {
          res.setHeader('Content-Type', result.type);
        }

        res.send(result.body);
      } else {
        // Wrap res.send
        const send = res.send.bind(res);

        // Save response to the redis cache at the end of the request
        res.send = (body) => {
          send(body);

          // Check if it's allowed to cache response based on statuscode of response
          if (cacheRequestAllowed(this.excludeStatuscodes, res.statusCode)) {
            // Save in cache
            storeInCache(
              redisKey,
              body,
              res._headers['content-type'],
              res.statusCode,
              expireTime
            );
          }
        };

        next();
      }
    });
  };
};

/**
 * Create new redis client and connect to it
 *
 * @param  {Object} options (view README)
 */
ITPExpressRedisCache.connect = (options = {}) => {
  const enabled = options.enabled !== false;
  const host = options.host || process.env.REDIS_HOST || 'localhost';
  const port = options.port || process.env.REDIS_PORT || 6379;
  const authPass = options.authPass || process.env.REDIS_PASS;

  this.prefix = options.prefix || require('./../package.json').name;
  this.connected = false;
  this.excludeStatuscodes = Object.prototype.hasOwnProperty.call(options, 'excludeStatuscodes') ? options.excludeStatuscodes : 500;

  if (enabled) {
    this.redisClient = require('redis').createClient(
      port,
      host,
      { auth_pass: authPass }
    );

    setEventListeners();
  } else {
    console.log('[ITPExpressRedisCache] Cache disabled');
  }
};

/**
 * Init ITPExpressRedisCache
 *
 * @param  {[Object]} options (view README)
 *
 * @return ITPExpressRedisCache
 */
ITPExpressRedisCache.init = (options) => {
  ITPExpressRedisCache.connect(options);
  return ITPExpressRedisCache;
};

/**
 * Check if it's allowed to cache response
 * @param  {Number, Array, function(statusCode)} excluded statuscodes
 * @param  {Number} response statuscode
 * @return {Boolean} cache response or not
 */
const cacheRequestAllowed = (excludeStatuscodes, statusCode) => {
  if (excludeStatuscodes) {
    if (typeof excludeStatuscodes === 'number') {
      return (statusCode < excludeStatuscodes);
    }

    if (Array.isArray(excludeStatuscodes)) {
      return (excludeStatuscodes.indexOf(statusCode) < 0);
    }

    if (typeof excludeStatuscodes === 'function') {
      return !excludeStatuscodes(statusCode);
    }
  }

  return true;
};

/**
 * Store value in Redis cache
 * @param  {String} key The Redis cache key
 * @param  {String} body The Redis value to save (api response)
 * @param  {String} contentType The content type of the response
 * @param  {Number} expireTime Expiration time for the Redis value
 * @param  {int} statusCode The http status code of the response
 */
const storeInCache = (key, body, contentType, statusCode, expireTime = 60) => {
  if (this.redisClient && this.connected && key && body) {
    const cacheValue = { body };

    if (statusCode) {
      cacheValue.code = statusCode;
    }

    if (contentType) {
      cacheValue.type = contentType;
    }

    this.redisClient.hmset(key, cacheValue);
    this.redisClient.expire(key, expireTime);
  }
};

/**
 * Generate Redis key for caching api responses
 * @param  {String, function(req)} key Redis key string/function
 * @param  {Object} req Request object
 * @return {String} key Redis key
 */
const generateCacheRouteKey = (key, req) => {
  if (key) {
    return typeof key === 'function' ? key(req) : key;
  }

  return `${this.prefix}:route:${req.method}:${req.originalUrl}`;
};

/**
 * Parse expire time
 *
 * @param  {Int, function(req)} expireTime
 * @param  {Object} req Request object
 *
 * @return {Int} expireTime Expire time in seconds
 */
const generateExpireTime = (expireTime, req) => {
  if (typeof expireTime === 'function') {
    return expireTime(req);
  }

  return expireTime;
};

/**
 * Set Redis event listeners
 */
const setEventListeners = () => {
  if (this.redisClient) {
    this.redisClient.on('connect', () => {
      console.log('[ITPExpressRedisCache] Connected to Redis');
      this.connected = true;
    });

    this.redisClient.on('error', (error) => {
      console.error(`[ITPExpressRedisCache] Connection to Redis failed with error: ${error}`);
      this.connected = false;
    });
  }
};

module.exports = ITPExpressRedisCache;
