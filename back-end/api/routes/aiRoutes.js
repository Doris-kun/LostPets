const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const chatController = require('../controllers/chatController');

router.post('/analyze-image', aiController.upload, aiController.analyze_image);
router.get('/match/:petId', aiController.match_posts);
router.post('/chat', chatController.chat);

module.exports = router;
