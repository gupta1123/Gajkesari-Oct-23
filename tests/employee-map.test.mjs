import test from 'node:test';
import assert from 'node:assert/strict';
import { employeeLocationAge, latestEmployeeLocations, mapCoordinates, mapTimestamp, journeyMapMarkers, groupMapMarkers } from '../lib/employee-map.ts';

const location = (empId, updatedAt, updatedTime = '12:00:00') => ({
  id: empId, empId, empName: `Employee ${empId}`, latitude: 12.9, longitude: 77.6, updatedAt, updatedTime,
});
const visit = (id, date, overrides = {}) => ({
  id, employeeId: 1, employeeName: 'Employee 1', lat: 12.9, lng: 77.6,
  storeName: 'Store', visitDate: date, checkinDate: date, checkinTime: '10:00:00', ...overrides,
});
const employee = { id: 1, name: 'Employee 1' };
const home = { id: 1, houseLatitude: 13, houseLongitude: 77, city: 'Bangalore' };
const formatTimestamp = (date, time) => `${date} ${time || ''}`.trim();

test('location age distinguishes recent, older, missing, and invalid update times', () => {
  const now = Date.parse('2026-09-03T09:00:00Z');
  assert.deepEqual(employeeLocationAge(now, now), { label: 'Updated just now', fresh: true });
  assert.equal(employeeLocationAge(now - 14 * 60_000, now).fresh, true);
  assert.deepEqual(employeeLocationAge(now - 15 * 60_000, now), { label: 'Updated 15 min ago', fresh: false });
  assert.equal(employeeLocationAge(now - 2 * 86_400_000, now).label, 'Updated 2 days ago');
  for (const value of [null, undefined, NaN, now + 120_000]) {
    assert.deepEqual(employeeLocationAge(value, now), { label: 'Update time unavailable', fresh: false });
  }
});

test('keeps older last-known locations and picks the newest valid record per employee', () => {
  const rows = [location(1, '2026-08-13'), location(1, '2026-08-29'), location(2, '2026-07-01')];
  assert.deepEqual(latestEmployeeLocations(rows).map(row => row.updatedAt), ['2026-08-29', '2026-07-01']);
  assert.equal(latestEmployeeLocations([...rows, { ...location(1, '2026-08-31'), latitude: NaN }])[0].updatedAt, '2026-08-29');
});

test('respects manager scope, including an empty team', () => {
  const rows = [location(1, '2026-08-29'), location(2, '2026-08-29')];
  assert.deepEqual(latestEmployeeLocations(rows, new Set([2])).map(row => row.empId), [2]);
  assert.deepEqual(latestEmployeeLocations(rows, new Set()), []);
});

test('invalid update time does not discard an otherwise valid saved location', () => {
  assert.equal(latestEmployeeLocations([location(1, 'invalid')]).length, 1);
  assert.equal(mapTimestamp('invalid'), null);
});

test('normalizes numeric coordinates and rejects missing, infinite, and invalid coordinates', () => {
  assert.deepEqual(mapCoordinates('12.9', '77.6'), [12.9, 77.6]);
  for (const [lat, lng] of [[null, 77], ['', 77], [false, 77], [NaN, 77], [Infinity, 77], [91, 77], [13, 181], [0, 0]]) {
    assert.equal(mapCoordinates(lat, lng), null);
  }
});

test('date-only API timestamps preserve the local calendar date', () => {
  const date = mapTimestamp('2026-08-01', '00:01:00.123');
  assert.equal(date.getDate(), 1);
  assert.equal(date.getHours(), 0);
});

test('journey includes home plus only selected employee visits in the inclusive range', () => {
  const rows = [visit(1, '2026-08-01'), visit(2, '2026-08-29'), visit(3, '2026-07-31'), visit(4, '2026-08-30'), visit(5, '2026-08-10', { employeeId: 2 })];
  const result = journeyMapMarkers(employee, home, rows, '2026-08-01', '2026-08-29', formatTimestamp);
  assert.deepEqual(result.map(marker => marker.id), ['house-1', 'visit-1', 'visit-2']);
  assert.deepEqual(journeyMapMarkers(employee, home, rows, '2026-08-31', '2026-08-31', formatTimestamp).map(marker => marker.id), ['house-1']);
});

test('visits remain usable without home and are sorted, deduplicated, and numbered after validation', () => {
  const rows = [visit(2, '2026-08-29'), visit(1, '2026-08-01'), visit(1, '2026-08-01'), visit(3, '2026-08-10', { lat: null })];
  const result = journeyMapMarkers(employee, null, rows, '2026-08-01', '2026-08-31', formatTimestamp);
  assert.deepEqual(result.map(marker => [marker.id, marker.order]), [['visit-1', 1], ['visit-2', 2]]);
});

test('overlapping home and visits stay individually accessible without changing coordinates', () => {
  const points = [{ id: 'home', x: 0, y: 0 }, { id: 'visit-1', x: 2, y: 2 }, { id: 'visit-2', x: 1, y: 1 }, { id: 'other', x: 100, y: 100 }];
  const result = groupMapMarkers(points);
  assert.deepEqual(result.map(group => group.length), [3, 1]);
  assert.deepEqual(result.flat(), points);
});

test('a bridging pin merges overlapping groups', () => {
  assert.equal(groupMapMarkers([{ x: 0, y: 0 }, { x: 80, y: 0 }, { x: 40, y: 0 }]).length, 1);
});
