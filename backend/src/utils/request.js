const mongoose = require('mongoose');

function isObjectId(value) {
  return typeof value === 'string' && mongoose.isObjectIdOrHexString(value);
}

function dateAtMidnight(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

module.exports = { isObjectId, dateAtMidnight };
