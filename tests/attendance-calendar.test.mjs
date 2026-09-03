import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAttendanceCalendar } from '../lib/attendance-calendar.ts';

const afterAugust = new Date(2026, 8, 3);
const row = (day, attendanceStatus) => ({
  checkinDate: `2026-08-${String(day).padStart(2, '0')}`,
  attendanceStatus,
});
const august = records => buildAttendanceCalendar(7, 2026, records, afterAugust);
const dayAt = (calendar, day) => calendar.daysArray.find(item => item.dayNumber === day);

test('August regression: 23 full days and 3 half days exclude all five Sunday absences', () => {
  // Reproduces the displayed August pattern; not a stored backend response.
  for (const sundayStatus of ['Absent', 'Present', 'absent', 'paid', 'Paid Leave', null]) {
    const records = Array.from({ length: 31 }, (_, i) => {
      const day = i + 1;
      const status = new Date(2026, 7, day).getDay() === 0
        ? sundayStatus : [11, 21, 26].includes(day) ? 'half day' : 'full day';
      return row(day, status);
    });
    const calendar = august(records);
    assert.deepEqual(calendar.summary, { fullDays: 23, halfDays: 3, absentDays: 0 });
    for (const day of [2, 9, 16, 23, 30]) {
      assert.equal(dayAt(calendar, day).className, 'sunday');
      assert.equal(dayAt(calendar, day).tooltipText, 'Paid weekly off (Sunday)');
    }
  }
});

test('missing Sunday rows and explicit Sunday absences produce the same totals', () => {
  const missing = august([]);
  const explicit = august([2, 9, 16, 23, 30].map(day => row(day, 'absent')));
  assert.deepEqual(missing.summary, { fullDays: 0, halfDays: 0, absentDays: 26 });
  assert.deepEqual(explicit.summary, missing.summary);
});

test('retains genuine weekday absences and the existing Present rule', () => {
  const calendar = august([row(3, 'Absent'), row(4, 'Present'), row(5, 'paid'), row(6, 'activity')]);
  assert.equal(calendar.summary.absentDays, 24);
  assert.equal(dayAt(calendar, 3).tooltipText, 'Absent');
  assert.equal(dayAt(calendar, 4).tooltipText, 'Absent');
  assert.equal(dayAt(calendar, 5).tooltipText, 'Paid Leave');
});

test('does not remove credited full or half-day work recorded on Sundays', () => {
  const calendar = august([row(2, 'Full Day'), row(9, 'half day')]);
  assert.deepEqual(calendar.summary, { fullDays: 1, halfDays: 1, absentDays: 26 });
  assert.equal(dayAt(calendar, 2).tooltipText, 'Full Day · Sunday');
  assert.equal(dayAt(calendar, 9).tooltipText, 'Half Day · Sunday');
});

test('handles timestamp dates and padded mixed-case Sunday statuses', () => {
  const calendar = august([{ checkinDate: '2026-08-02T00:00:00', attendanceStatus: ' ABSENT ' }]);
  assert.equal(calendar.summary.absentDays, 26);
  assert.equal(dayAt(calendar, 2).tooltipText, 'Paid weekly off (Sunday)');
});

test('does not turn future missing days into absences or credited work', () => {
  const calendar = buildAttendanceCalendar(7, 2026, [], new Date(2026, 7, 1));
  assert.deepEqual(calendar.summary, { fullDays: 0, halfDays: 0, absentDays: 1 });
  assert.equal(dayAt(calendar, 2).tooltipText, 'Upcoming');
  assert.equal(dayAt(calendar, 3).className, 'future');
});

test('Sunday exclusion works across different month lengths and years', () => {
  for (const [month, year] of [[1, 2024], [1, 2025], [3, 2026], [7, 2026], [11, 2026]]) {
    const count = new Date(year, month + 1, 0).getDate();
    let sundays = 0;
    const records = Array.from({ length: count }, (_, i) => {
      if (new Date(year, month, i + 1).getDay() === 0) sundays++;
      return { checkinDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`, attendanceStatus: 'absent' };
    });
    const calendar = buildAttendanceCalendar(month, year, records, new Date(year + 1, 0, 1));
    assert.equal(calendar.summary.absentDays, count - sundays);
    assert.equal(calendar.daysArray.filter(item => item.type === 'day').length, count);
  }
});
