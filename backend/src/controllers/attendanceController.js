const mongoose = require('mongoose');
const AttendanceEntry = require('../models/AttendanceEntry');
const Subject = require('../models/Subject');
const { isObjectId, dateAtMidnight } = require('../utils/request');

async function recordAttendance(req, res, next) {
  try {
    const { subjectId, date, status } = req.body;
    if (!isObjectId(subjectId) || !dateAtMidnight(date) || !['present', 'absent'].includes(status)) {
      return res.status(400).json({ message: 'Provide a subject, a valid date, and present or absent status.' });
    }
    const subject = await Subject.findOne({ _id: subjectId, owner: req.user.id });
    if (!subject) return res.status(404).json({ message: 'Subject not found.' });
    const entry = await AttendanceEntry.findOneAndUpdate(
      { owner: req.user.id, subject: subjectId, date: dateAtMidnight(date) },
      { status },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.status(201).json({ entry });
  } catch (error) { return next(error); }
}

async function listAttendance(req, res, next) {
  try {
    const subjectQuery = { owner: req.user.id };
    if (req.query.subjectId) {
      if (!isObjectId(req.query.subjectId)) return res.status(400).json({ message: 'Invalid subject id.' });
      subjectQuery._id = req.query.subjectId;
    }
    if (req.query.yearId) {
      if (!isObjectId(req.query.yearId)) return res.status(400).json({ message: 'Invalid year id.' });
      subjectQuery.year = req.query.yearId;
    }
    const subjectIds = (await Subject.find(subjectQuery).select('_id')).map((subject) => subject._id);
    const entries = await AttendanceEntry.find({ owner: req.user.id, subject: { $in: subjectIds } })
      .populate({ path: 'subject', select: 'name year', populate: { path: 'year', select: 'label' } })
      .sort({ date: -1, createdAt: -1 });
    return res.json({ entries });
  } catch (error) { return next(error); }
}

async function attendanceSummary(req, res, next) {
  try {
    const owner = new mongoose.Types.ObjectId(req.user.id);
    const subjectMatch = { owner };
    if (req.query.yearId) {
      if (!isObjectId(req.query.yearId)) return res.status(400).json({ message: 'Invalid year id.' });
      subjectMatch.year = new mongoose.Types.ObjectId(req.query.yearId);
    }
    const summaries = await Subject.aggregate([
      { $match: subjectMatch },
      { $lookup: { from: 'attendanceentries', let: { subjectId: '$_id' }, pipeline: [
        { $match: { $expr: { $and: [{ $eq: ['$subject', '$$subjectId'] }, { $eq: ['$owner', owner] }] } } },
      ], as: 'entries' } },
      { $project: {
        name: 1, year: 1, manualPresent: 1, manualTotal: 1,
        total: { $add: [{ $ifNull: ['$manualTotal', 0] }, { $size: '$entries' }] },
        present: { $add: [{ $ifNull: ['$manualPresent', 0] }, { $size: { $filter: { input: '$entries', as: 'entry', cond: { $eq: ['$$entry.status', 'present'] } } } }] },
      } },
      { $addFields: { percentage: { $cond: [{ $eq: ['$total', 0] }, 0, { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] }] } } },
      { $lookup: { from: 'academicyears', localField: 'year', foreignField: '_id', as: 'yearInfo' } },
      { $unwind: '$yearInfo' },
      { $project: { name: 1, total: 1, present: 1, manualPresent: 1, manualTotal: 1, percentage: 1, year: { _id: '$yearInfo._id', label: '$yearInfo.label' } } },
      { $sort: { 'year.label': 1, name: 1 } },
    ]);
    const totals = summaries.reduce((result, subject) => ({ total: result.total + subject.total, present: result.present + subject.present }), { total: 0, present: 0 });
    const overall = { ...totals, percentage: totals.total ? Number(((totals.present / totals.total) * 100).toFixed(1)) : 0 };
    return res.json({ subjects: summaries, overall });
  } catch (error) { return next(error); }
}

module.exports = { recordAttendance, listAttendance, attendanceSummary };
