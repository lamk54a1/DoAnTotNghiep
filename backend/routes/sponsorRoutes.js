const express = require('express');
const { isAdmin } = require('../middleware/authMiddleware');
const {
  getPublicSponsors,
  getSponsors,
  createSponsor,
  updateSponsor,
  deleteSponsor,
} = require('../controllers/sponsorController');

const router = express.Router();

router.get('/', getPublicSponsors);
router.get('/admin', isAdmin, getSponsors);
router.post('/', isAdmin, createSponsor);
router.put('/:id', isAdmin, updateSponsor);
router.delete('/:id', isAdmin, deleteSponsor);

module.exports = router;
