const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { listSubjects, createSubject, updateSubject, updatePreviousLectures, deleteSubject } = require('../controllers/subjectController');

router.use(requireAuth);
router.route('/').get(listSubjects).post(createSubject);
router.route('/:subjectId').patch(updateSubject).delete(deleteSubject);
router.patch('/:subjectId/previous-lectures', updatePreviousLectures);
module.exports = router;
