const Subject = require('../models/Subject');
const AcademicYear = require('../models/AcademicYear');
const AttendanceEntry = require('../models/AttendanceEntry');
const { isObjectId } = require('../utils/request');

async function listSubjects(req, res, next) {
  try {
    const query = { owner: req.user.id };
    if (req.query.yearId) {
      if (!isObjectId(req.query.yearId)) return res.status(400).json({ message: 'Invalid year id.' });
      query.year = req.query.yearId;
    }
    const subjects = await Subject.find(query).populate('year', 'label').sort({ name: 1 });
    return res.json({ subjects });
  } catch (error) { return next(error); }
}

async function createSubject(req, res, next) {
  try {
    const name = req.body.name?.trim();
    const { yearId } = req.body;
    if (!name || !yearId) return res.status(400).json({ message: 'Subject name and year are required.' });
    if (!isObjectId(yearId)) return res.status(400).json({ message: 'Invalid year id.' });
    const year = await AcademicYear.findOne({ _id: yearId, owner: req.user.id });
    if (!year) return res.status(404).json({ message: 'Year not found.' });
    const subject = await Subject.create({ owner: req.user.id, year: year._id, name });
    return res.status(201).json({ subject: await subject.populate('year', 'label') });
  } catch (error) { return next(error); }
}

async function updateSubject(req, res, next) {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ message: 'Subject name is required.' });
    const subject = await Subject.findOneAndUpdate({ _id: req.params.subjectId, owner: req.user.id }, { name }, { new: true, runValidators: true }).populate('year', 'label');
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    return res.json({ subject });
  } catch (error) { return next(error); }
}

async function updatePreviousLectures(req, res, next) {
  try {
    const attended = Number(req.body.attended);
    const total = Number(req.body.total);
    if (!Number.isInteger(attended) || !Number.isInteger(total) || attended < 0 || total < 0 || attended > total) {
      return res.status(400).json({ message: 'Attended and total must be whole numbers, with attended no greater than total.' });
    }
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.subjectId, owner: req.user.id },
      { manualPresent: attended, manualTotal: total },
      { new: true, runValidators: true }
    ).populate('year', 'label');
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    return res.json({ subject });
  } catch (error) { return next(error); }
}

async function deleteSubject(req, res, next) {
  try {
    const subject = await Subject.findOneAndDelete({ _id: req.params.subjectId, owner: req.user.id });
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    await AttendanceEntry.deleteMany({ owner: req.user.id, subject: subject._id });
    return res.status(204).send();
  } catch (error) { return next(error); }
}

module.exports = { listSubjects, createSubject, updateSubject, updatePreviousLectures, deleteSubject };
