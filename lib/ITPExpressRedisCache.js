const ITPExpressRedisCache = {};

/**
 * Try to return response from the cache or save it afterwards
 *
 * @param  {Number} expireTime Expiration time for the Redis value
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
    const redisKey = routeOptions.key || generateCacheRouteKey(req);

    // Get item from Redis cache by key
    this.redisClient.hgetall(redisKey, (error, result) => {
      if (error) {
        console.error(`[ITPExpressRedisCache] Error when trying to fetch Redis key: ${redisKey}`);
        return res.sendStatus(401);
      }

      // Return cached result from Redis or save response in cache
      if (result) {
        res.setHeader('Content-Type', result.type);
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
 * @param  {[Object]} options (view README)
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
storeInCache = (key, body, contentType = 'application/json', expireTime = 60) => {
  if (this.redisClient && this.connected && key && body) {
    this.redisClient.hmset(key, {
      body: body,
      type: contentType,
    });
    this.redisClient.expire(key, expireTime);
  }
};

/**
 * Generate Redis key for caching api responses
 * @param  {Object} req Request object
 * @return {String} key Redis key
 */
generateCacheRouteKey = req => `${this.prefix}:route:${req.method}:${req.originalUrl}`;

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
      console.error('[ITPExpressRedisCache] Connection failed to Redis');
      this.connected = false;
    });
  }
};

module.exports = ITPExpressRedisCache;
