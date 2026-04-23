const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');

router.route('/')
  .get(petController.list_all_pets)
  .post(petController.upload, petController.create_a_pet);

router.route('/:petId')
  .get(petController.read_a_pet)
  .put(petController.update_a_pet)
  .delete(petController.delete_a_pet);

module.exports = router;
