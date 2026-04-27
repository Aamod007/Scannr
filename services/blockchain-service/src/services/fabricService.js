const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const redis = require('redis');

class FabricService {
  constructor() {
    this.gateway = null;
    this.network = null;
    this.contract = null;
    this.redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
  }

  /**
   * Connect to Hyperledger Fabric network
   */
  async connect() {
    try {
      // Load connection profile
      const ccpPath = path.resolve(__dirname, '..', '..', 'connection-profile.json');
      const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

      // Create wallet
      const walletPath = path.join(process.cwd(), 'wallet');
      const wallet = await Wallets.newFileSystemWallet(walletPath);

      // Check identity exists
      const identity = await wallet.get('admin');
      if (!identity) {
        throw new Error('Admin identity not found in wallet');
      }

      // Create gateway
      this.gateway = new Gateway();
      await this.gateway.connect(ccp, {
        wallet,
        identity: 'admin',
        discovery: { enabled: true, asLocalhost: true }
      });

      // Get network and contract
      this.network = await this.gateway.getNetwork('scannr-channel');
      this.contract = this.network.getContract('importer-profile');

      console.log('Successfully connected to Fabric network');
    } catch (error) {
      console.error('Failed to connect to Fabric network:', error);
      throw error;
    }
  }

  /**
   * Get importer profile by ID
   * @param {string} importerId - Importer ID (e.g., "IMP-2019-00542")
   * @returns {Promise<Object>} Importer profile
   */
  async getImporter(importerId) {
    try {
      // Check Redis cache first
      const cached = await this.redisClient.get(`importer:${importerId}`);
      if (cached) {
        console.log(`Cache hit for importer ${importerId}`);
        return JSON.parse(cached);
      }

      // Query blockchain
      console.log(`Cache miss, querying blockchain for ${importerId}`);
      const result = await this.contract.evaluateTransaction('GetImporter', importerId);
      const importer = JSON.parse(result.toString());

      // Cache for 15 minutes
      await this.redisClient.setEx(
        `importer:${importerId}`,
        900, // 15 minutes TTL
        JSON.stringify(importer)
      );

      return importer;
    } catch (error) {
      console.error(`Error getting importer ${importerId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate trust score for an importer
   * @param {string} importerId - Importer ID
   * @returns {Promise<number>} Trust score (0-100)
   */
  async getTrustScore(importerId) {
    try {
      const result = await this.contract.evaluateTransaction('CalculateTrustScore', importerId);
      return parseInt(result.toString());
    } catch (error) {
      console.error(`Error calculating trust score for ${importerId}:`, error);
      throw error;
    }
  }

  /**
   * Register a new importer
   * @param {Object} importerData - Importer details
   * @returns {Promise<string>} Transaction ID
   */
  async registerImporter(importerData) {
    try {
      const result = await this.contract.submitTransaction(
        'RegisterImporter',
        importerData.importerId,
        importerData.companyName,
        JSON.stringify(importerData)
      );

      // Invalidate cache
      await this.redisClient.del(`importer:${importerData.importerId}`);

      return result.toString();
    } catch (error) {
      console.error('Error registering importer:', error);
      throw error;
    }
  }

  /**
   * Add a violation to importer's history
   * @param {string} importerId - Importer ID
   * @param {Object} violation - Violation details
   * @returns {Promise<string>} Transaction ID
   */
  async addViolation(importerId, violation) {
    try {
      const result = await this.contract.submitTransaction(
        'AddViolation',
        importerId,
        JSON.stringify(violation)
      );

      // Invalidate cache
      await this.redisClient.del(`importer:${importerId}`);

      return result.toString();
    } catch (error) {
      console.error(`Error adding violation for ${importerId}:`, error);
      throw error;
    }
  }

  /**
   * Log a clearance decision to blockchain (audit trail)
   * @param {string} containerId - Container ID
   * @param {Object} decision - Decision details
   * @returns {Promise<string>} Transaction ID
   */
  async logClearanceDecision(containerId, decision) {
    try {
      const auditContract = this.network.getContract('audit-trail');
      const result = await auditContract.submitTransaction(
        'LogDecision',
        containerId,
        JSON.stringify(decision),
        new Date().toISOString()
      );

      return result.toString();
    } catch (error) {
      console.error(`Error logging decision for ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from network
   */
  async disconnect() {
    if (this.gateway) {
      await this.gateway.disconnect();
      await this.redisClient.quit();
    }
  }
}

module.exports = new FabricService();
