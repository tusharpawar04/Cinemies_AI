/**
 * Interaction Routes
 */

const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interaction.controller');
const { validate, schemas } = require('../middleware/validation');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

// Interaction routes
router.post('/', validate(schemas.logInteraction), interactionController.logInteraction);
router.get('/history', interactionController.getHistory);
router.get('/stats', interactionController.getStats);

module.exports = router;
