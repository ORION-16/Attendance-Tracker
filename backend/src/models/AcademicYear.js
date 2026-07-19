const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 50 },
  },
  { timestamps: true }
);

academicYearSchema.index({ owner: 1, label: 1 }, { unique: true });

module.exports = mongoose.model('AcademicYear', academicYearSchema);
