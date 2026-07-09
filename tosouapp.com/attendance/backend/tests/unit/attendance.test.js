/**
 * Attendance Tests — Critical Path
 * Pure unit tests for attendance classifier and work metrics.
 * No DB required.
 */

const { classifyMonthlyDay } = require('../../src/modules/attendance/attendance.classifier');

describe('Attendance Classifier', () => {
  describe('classifyMonthlyDay', () => {
    it('should classify 休日 as leave', () => {
      const result = classifyMonthlyDay({
        date: '2026-07-05',
        kubun: '休日',
        isOnLeaveApproved: false,
        isPlannedOff: true,
        hasAttendance: false,
        hasCheckOut: false
      });
      expect(result.status).toBe('leave');
      expect(result.kubun).toBe('休日');
    });

    it('should classify 有給休暇 as leave', () => {
      const result = classifyMonthlyDay({
        date: '2026-07-04',
        kubun: '有給休暇',
        isOnLeaveApproved: false,
        isPlannedOff: false,
        hasAttendance: false,
        hasCheckOut: false
      });
      expect(result.status).toBe('leave');
      expect(result.kubun).toBe('有給休暇');
    });

    it('should classify approved leave', () => {
      const result = classifyMonthlyDay({
        date: '2026-07-03',
        kubun: '',
        isOnLeaveApproved: true,
        isPlannedOff: false,
        hasAttendance: false,
        hasCheckOut: false
      });
      expect(result.status).toBe('leave');
      expect(result.kubun).toBe('有給休暇');
    });

    it('should classify checked out attendance', () => {
      const result = classifyMonthlyDay({
        date: '2026-07-01',
        kubun: '出勤',
        isOnLeaveApproved: false,
        isPlannedOff: false,
        hasAttendance: true,
        hasCheckOut: true
      });
      expect(result.status).toBe('checked_out');
      expect(result.kubun).toBe('出勤');
    });

    it('should classify working (checked in, no checkout, today)', () => {
      // Use today's date
      const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
      const result = classifyMonthlyDay({
        date: today,
        kubun: '出勤',
        isOnLeaveApproved: false,
        isPlannedOff: false,
        hasAttendance: true,
        hasCheckOut: false
      });
      expect(result.status).toBe('working');
    });

    it('should classify 欠勤 for past day with no attendance and work planned', () => {
      const result = classifyMonthlyDay({
        date: '2026-01-05', // Past date
        kubun: '出勤',
        isOnLeaveApproved: false,
        isPlannedOff: false,
        hasAttendance: false,
        hasCheckOut: false
      });
      expect(result.status).toBe('leave');
      expect(result.kubun).toBe('欠勤');
    });

    it('should classify future planned work day', () => {
      const result = classifyMonthlyDay({
        date: '2099-12-31', // Future date
        kubun: '',
        isOnLeaveApproved: false,
        isPlannedOff: false,
        hasAttendance: false,
        hasCheckOut: false
      });
      expect(result.status).toBe('planned');
      expect(result.plan).toBe('work');
    });

    it('should classify future planned off day', () => {
      const result = classifyMonthlyDay({
        date: '2099-12-31',
        kubun: '',
        isOnLeaveApproved: false,
        isPlannedOff: true,
        hasAttendance: false,
        hasCheckOut: false
      });
      expect(result.status).toBe('planned');
      expect(result.plan).toBe('off');
    });

    it('should handle invalid date', () => {
      const result = classifyMonthlyDay({
        date: 'invalid',
        kubun: '',
        isOnLeaveApproved: false,
        isPlannedOff: false,
        hasAttendance: false,
        hasCheckOut: false
      });
      expect(result.status).toBe('planned');
    });

    it('should classify 代替休日 as leave', () => {
      const result = classifyMonthlyDay({
        date: '2026-07-10',
        kubun: '代替休日',
        isOnLeaveApproved: false,
        isPlannedOff: true,
        hasAttendance: false,
        hasCheckOut: false
      });
      expect(result.status).toBe('leave');
      expect(result.kubun).toBe('代替休日');
    });

    it('should classify 欠勤 kubun as leave', () => {
      const result = classifyMonthlyDay({
        date: '2026-07-02',
        kubun: '欠勤',
        isOnLeaveApproved: false,
        isPlannedOff: false,
        hasAttendance: false,
        hasCheckOut: false
      });
      expect(result.status).toBe('leave');
      expect(result.kubun).toBe('欠勤');
    });

    it('should mark past unattended day without checkout as 欠勤', () => {
      const result = classifyMonthlyDay({
        date: '2026-01-10', // Past
        kubun: '',
        isOnLeaveApproved: false,
        isPlannedOff: false,
        hasAttendance: true,
        hasCheckOut: false
      });
      expect(result.status).toBe('leave');
      expect(result.kubun).toBe('欠勤');
    });
  });
});
