const redis = require('redis');
const logger = require('../utils/logger');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 900; // 15 minutes
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      this.client = redis.createClient({
        url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
      });

      this.client.on('error', (err) => {
        logger.error('Redis connection error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {Promise<Object|null>} Parsed JSON value or null
   */
  async get(key) {
    if (!this.isConnected) return null;

    try {
      const value = await this.client.get(key);
      if (value) {
        logger.debug(`Cache HIT: ${key}`);
        return JSON.parse(value);
      }
      logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache (will be JSON.stringify'd)
   * @param {number} ttl - Time to live in seconds (default: 900)
   */
  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected) return;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   */
  async del(key) {
    if (!this.isConnected) return;

    try {
      await this.client.del(key);
      logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      logger.error(`Cache del error for key ${key}:`, error);
    }
  }

  /**
   * Invalidate all keys matching a pattern
   * @param {string} pattern - Redis key pattern (e.g., "importer:*")
   */
  async invalidatePattern(pattern) {
    if (!this.isConnected) return;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info(`Cache INVALIDATE: ${keys.length} keys matching ${pattern}`);
      }
    } catch (error) {
      logger.error(`Cache invalidate error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache stats
   */
  async getStats() {
    if (!this.isConnected) {
      return { connected: false };
    }

    try {
      const info = await this.client.info('stats');
      return {
        connected: true,
        info: info
      };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis disconnected gracefully');
    }
  }
}

module.exports = new CacheService();
