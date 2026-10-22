const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { optionalAuth, requireAdmin } = require('../middleware/auth');

// Mọi route dưới đây chỉ dành cho quản trị viên.
router.use(optionalAuth, requireAdmin);

router.get('/stats', adminController.stats);
router.get('/pets', adminController.list_pets);
router.delete('/pets/:petId', adminController.delete_pet);

module.exports = router;
