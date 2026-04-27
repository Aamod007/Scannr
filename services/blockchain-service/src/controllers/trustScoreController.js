const fabricService = require('../services/fabricService');
const logger = require('../utils/logger');

/**
 * Calculate trust score for an importer
 * GET /api/blockchain/trust-score/:id
 */
exports.calculateTrustScore = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.startsWith('IMP-')) {
      return res.status(400).json({
        error: 'Invalid importer ID format. Expected: IMP-YYYY-XXXXX'
      });
    }

    const startTime = Date.now();
    const trustScore = await fabricService.getTrustScore(id);
    const duration = Date.now() - startTime;

    logger.info(`Trust score for ${id}: ${trustScore} (${duration}ms)`);

    // Determine AEO eligibility
    let aeoEligibility = 'Not Eligible';
    if (trustScore >= 90) aeoEligibility = 'Tier 1 Certified';
    else if (trustScore >= 75) aeoEligibility = 'Tier 2 Eligible';
    else if (trustScore >= 60) aeoEligibility = 'Tier 3 Probationary';

    res.json({
      success: true,
      data: {
        importer_id: id,
        trust_score: trustScore,
        risk_category: trustScore >= 80 ? 'Low' : trustScore >= 50 ? 'Medium' : 'High',
        aeo_eligibility: aeoEligibility,
        recommendation: trustScore >= 80 ? 'Green lane eligible' : 'Standard processing',
        factors: {
          registration_age: 'Verified via blockchain timestamp',
          violation_history: 'Immutable append-only ledger',
          certification_validity: 'Multi-signature verified'
        }
      },
      meta: {
        calculation_time_ms: duration,
        algorithm: 'blockchain_weighted_composite_v2'
      }
    });
  } catch (error) {
    logger.error('Error in calculateTrustScore:', error);
    res.status(500).json({
      error: 'Failed to calculate trust score',
      message: error.message
    });
  }
};

/**
 * Get trust score history for an importer
 * GET /api/blockchain/trust-score/:id/history
 */
exports.getTrustScoreHistory = async (req, res) => {
  try {
    const { id } = req.params;

    // Query blockchain for historical trust score changes
    const importer = await fabricService.getImporter(id);

    res.json({
      success: true,
      data: {
        importer_id: id,
        current_score: importer.trust_score,
        history: importer.trust_score_history || [],
        trend: importer.trust_score >= 80 ? 'stable' : 'improving'
      }
    });
  } catch (error) {
    logger.error('Error in getTrustScoreHistory:', error);
    res.status(500).json({
      error: 'Failed to retrieve trust score history',
      message: error.message
    });
  }
};
