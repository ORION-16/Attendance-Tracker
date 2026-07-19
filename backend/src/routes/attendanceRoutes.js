const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { recordAttendance, listAttendance, attendanceSummary } = require('../controllers/attendanceController');

router.use(requireAuth);
router.get('/summary', attendanceSummary);
router.route('/').get(listAttendance).post(recordAttendance);
module.exports = router;
