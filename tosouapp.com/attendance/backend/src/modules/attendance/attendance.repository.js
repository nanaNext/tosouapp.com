'use strict';
const schema = require('./attendance.repository.schema');
const daily = require('./attendance.repository.daily');
const shifts = require('./attendance.repository.shifts');
const records = require('./attendance.repository.records');
const roster = require('./attendance.repository.roster');

module.exports = {
  ...schema,
  ...daily,
  ...shifts,
  ...records,
  ...roster
};
