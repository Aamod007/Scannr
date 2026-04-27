const express = require('express');
const router = express.Router();

const importerController = require('../controllers/importerController');
const trustScoreController = require('../controllers/trustScoreController');

// ─── Importer Routes ─────────────────────────────────────────────────

// GET /api/blockchain/importer/:id — Get importer profile from blockchain
router.get('/blockchain/importer/:id', importerController.getImporter);

// POST /api/blockchain/importer — Register new importer on blockchain
router.post('/blockchain/importer', importerController.registerImporter);

// POST /api/blockchain/importer/:id/violation — Add violation (append-only)
router.post('/blockchain/importer/:id/violation', importerController.addViolation);

// ─── Trust Score Routes ──────────────────────────────────────────────

// GET /api/blockchain/trust-score/:id — Calculate trust score
router.get('/blockchain/trust-score/:id', importerController.getTrustScore);

// GET /api/blockchain/trust-score/:id/detailed — Detailed trust score with AEO eligibility
router.get('/blockchain/trust-score/:id/detailed', trustScoreController.calculateTrustScore);

// GET /api/blockchain/trust-score/:id/history — Trust score history
router.get('/blockchain/trust-score/:id/history', trustScoreController.getTrustScoreHistory);

module.exports = router;
