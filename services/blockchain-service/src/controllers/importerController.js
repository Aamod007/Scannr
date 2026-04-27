const fabricService = require('../services/fabricService');
const logger = require('../utils/logger');

/**
 * Get importer profile
 * GET /api/blockchain/importer/:id
 */
exports.getImporter = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate input
    if (!id || !id.startsWith('IMP-')) {
      return res.status(400).json({
        error: 'Invalid importer ID format. Expected: IMP-YYYY-XXXXX'
      });
    }

    const startTime = Date.now();
    const importer = await fabricService.getImporter(id);
    const duration = Date.now() - startTime;

    logger.info(`Retrieved importer ${id} in ${duration}ms`);

    res.json({
      success: true,
      data: importer,
      meta: {
        query_time_ms: duration,
        cached: duration < 100 // If < 100ms, likely from cache
      }
    });
  } catch (error) {
    logger.error('Error in getImporter:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Importer not found',
        importer_id: req.params.id
      });
    }

    res.status(500).json({
      error: 'Failed to retrieve importer',
      message: error.message
    });
  }
};

/**
 * Get trust score
 * GET /api/blockchain/trust-score/:id
 */
exports.getTrustScore = async (req, res) => {
  try {
    const { id } = req.params;

    const startTime = Date.now();
    const trustScore = await fabricService.getTrustScore(id);
    const duration = Date.now() - startTime;

    logger.info(`Calculated trust score for ${id}: ${trustScore} (${duration}ms)`);

    res.json({
      success: true,
      data: {
        importer_id: id,
        trust_score: trustScore,
        risk_category: trustScore >= 80 ? 'Low' : trustScore >= 50 ? 'Medium' : 'High',
        recommendation: trustScore >= 80 ? 'Green lane eligible' : 'Standard processing'
      },
      meta: {
        calculation_time_ms: duration
      }
    });
  } catch (error) {
    logger.error('Error in getTrustScore:', error);
    res.status(500).json({
      error: 'Failed to calculate trust score',
      message: error.message
    });
  }
};

/**
 * Register new importer
 * POST /api/blockchain/importer
 */
exports.registerImporter = async (req, res) => {
  try {
    const importerData = req.body;

    // Validation
    const requiredFields = ['importerId', 'companyName', 'pan', 'gstin'];
    const missingFields = requiredFields.filter(field => !importerData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing: missingFields
      });
    }

    const txId = await fabricService.registerImporter(importerData);

    logger.info(`Registered new importer ${importerData.importerId}, txId: ${txId}`);

    res.status(201).json({
      success: true,
      message: 'Importer registered successfully',
      data: {
        importer_id: importerData.importerId,
        transaction_id: txId,
        blockchain_timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in registerImporter:', error);
    res.status(500).json({
      error: 'Failed to register importer',
      message: error.message
    });
  }
};

/**
 * Add violation to importer record
 * POST /api/blockchain/importer/:id/violation
 */
exports.addViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const violation = req.body;

    // Validation
    const requiredFields = ['type', 'severity', 'penaltyAmount'];
    const missingFields = requiredFields.filter(field => !violation[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required violation fields',
        missing: missingFields
      });
    }

    // Add violation to blockchain
    const txId = await fabricService.addViolation(id, {
      ...violation,
      date: new Date().toISOString(),
      violation_id: `VIO-${Date.now()}`
    });

    logger.warn(`Violation added for importer ${id}:`, violation);

    res.json({
      success: true,
      message: 'Violation recorded on blockchain (immutable)',
      data: {
        importer_id: id,
        transaction_id: txId,
        note: 'This violation cannot be deleted or modified'
      }
    });
  } catch (error) {
    logger.error('Error in addViolation:', error);
    res.status(500).json({
      error: 'Failed to add violation',
      message: error.message
    });
  }
};
