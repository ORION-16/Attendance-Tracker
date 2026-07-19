const AcademicYear = require('../models/AcademicYear');
const Subject = require('../models/Subject');
const AttendanceEntry = require('../models/AttendanceEntry');
const { isObjectId } = require('../utils/request');

async function listYears(req, res, next) {
  try {
    const years = await AcademicYear.find({ owner: req.user.id }).sort({ createdAt: 1 });
    return res.json({ years });
  } catch (error) { return next(error); }
}

async function createYear(req, res, next) {
  try {
    const label = req.body.label?.trim();
    if (!label) return res.status(400).json({ message: 'A year or semester label is required.' });
    const year = await AcademicYear.create({ owner: req.user.id, label });
    return res.status(201).json({ year });
  } catch (error) { return next(error); }
}

async function updateYear(req, res, next) {
  try {
    const label = req.body.label?.trim();
    if (!label) return res.status(400).json({ message: 'A year or semester label is required.' });
    const year = await AcademicYear.findOneAndUpdate({ _id: req.params.yearId, owner: req.user.id }, { label }, { new: true, runValidators: true });
    if (!year) return res.status(404).json({ message: 'Year not found.' });
    return res.json({ year });
  } catch (error) { return next(error); }
}

async function deleteYear(req, res, next) {
  try {
    const { yearId } = req.params;
    if (!isObjectId(yearId)) return res.status(400).json({ message: 'Invalid year id.' });
    const year = await AcademicYear.findOneAndDelete({ _id: yearId, owner: req.user.id });
    if (!year) return res.status(404).json({ message: 'Year not found.' });
    const subjects = await Subject.find({ owner: req.user.id, year: yearId }).select('_id');
    const subjectIds = subjects.map((subject) => subject._id);
    await Promise.all([
      Subject.deleteMany({ _id: { $in: subjectIds }, owner: req.user.id }),
      AttendanceEntry.deleteMany({ subject: { $in: subjectIds }, owner: req.user.id }),
    ]);
    return res.status(204).send();
  } catch (error) { return next(error); }
}

module.exports = { listYears, createYear, updateYear, deleteYear };
