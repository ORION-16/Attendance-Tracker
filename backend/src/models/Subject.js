const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    year: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    manualPresent: { type: Number, default: 0, min: 0 },
    manualTotal: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

subjectSchema.index({ owner: 1, year: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
