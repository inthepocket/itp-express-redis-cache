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

    // Get item from Redis cache by key
    this.redisClient.hgetall(redisKey, (error, result) => {
      if (error) {
        console.error(`[ITPExpressRedisCache] Error when trying to fetch Redis key: ${redisKey}`);
        return res.sendStatus(500);
      }

      // Return cached result from Redis or save response in cache
      if (result) {
        if (result.type) {
          res.setHeader('Content-Type', result.type);
        }

        res.send(result.body);
      } else {
        // Wrap res.send
        const send = res.send.bind(res);

        // Save response to the redis cache at the end of the request
        res.send = body => {
          send(body);

          // Save in cache
          storeInCache(
            redisKey,
            body,
            res._headers['content-type'],
            routeOptions.expire
          );
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
ITPExpressRedisCache.init = options => {
  ITPExpressRedisCache.connect(options);
  return ITPExpressRedisCache;
};

/**
 * Store value in Redis cache
 * @param  {String} key The Redis cache key
 * @param  {String} body The Redis value to save (api response)
 * @param  {String} contentType The content type of the response
 * @param  {Number} expireTime Expiration time for the Redis value
 */
storeInCache = (key, body, contentType, expireTime = 60) => {
  if (this.redisClient && this.connected && key && body) {
    const cacheValue = { body };

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
generateCacheRouteKey = (key, req) => {
  if (key) {
    return typeof key === 'function' ? key(req) : key;
  }

  return `${this.prefix}:route:${req.method}:${req.originalUrl}`;
};

/**
 * Set Redis event listeners
 */
setEventListeners  = () => {
  if (this.redisClient) {
    this.redisClient.on('connect', () => {
      console.log('[ITPExpressRedisCache] Connected to Redis');
      this.connected = true;
    });

    this.redisClient.on('error', error => {
      console.error(`[ITPExpressRedisCache] Connection to Redis failed with error: ${error}`);
      this.connected = false;
    });
  }
};

module.exports = ITPExpressRedisCache;
