import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TASK_ASSIGNER_ID,
  resolveTaskAssignerId,
} from '../lib/task-assignment.ts';

test('uses the authenticated employee as the task assigner', () => {
  assert.equal(resolveTaskAssignerId(25), 25);
  assert.equal(resolveTaskAssignerId(86), 86);
});

test('uses the same Admin fallback as Complaints when employee identity is unavailable', () => {
  assert.equal(resolveTaskAssignerId(undefined), DEFAULT_TASK_ASSIGNER_ID);
  assert.equal(resolveTaskAssignerId(null), DEFAULT_TASK_ASSIGNER_ID);
  assert.equal(resolveTaskAssignerId(0), DEFAULT_TASK_ASSIGNER_ID);
});
