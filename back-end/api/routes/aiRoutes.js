const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/analyze-image', aiController.upload, aiController.analyze_image);
router.get('/match/:petId', aiController.match_posts);

module.exports = router;
