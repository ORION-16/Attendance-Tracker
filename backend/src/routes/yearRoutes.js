const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { listYears, createYear, updateYear, deleteYear } = require('../controllers/yearController');

router.use(requireAuth);
router.route('/').get(listYears).post(createYear);
router.route('/:yearId').patch(updateYear).delete(deleteYear);
module.exports = router;
