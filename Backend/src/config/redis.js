
import Redis from 'ioredis';
import environment from './env.js';
import logger from './logger.js';

const redis = new Redis(environment.redisUrl, {

  maxRetriesPerRequest: 2,
  lazyConnect: false,
});

redis.on('error', (err) => {
  logger.error('Redis connection error', { err, action: 'redis.connection_error' });
});

export default redis;
