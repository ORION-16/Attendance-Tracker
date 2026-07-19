const mongoose = require('mongoose');

const attendanceEntrySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    date: { type: Date, required: true },
    status: { type: String, required: true, enum: ['present', 'absent'] },
  },
  { timestamps: true }
);

attendanceEntrySchema.index({ owner: 1, subject: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceEntry', attendanceEntrySchema);
