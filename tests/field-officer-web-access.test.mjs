import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isFieldOfficerRoleValue,
  isFieldOfficerWebUser,
  tokenHasFieldOfficerRole,
} from '../lib/web-access.ts';

test('recognizes the supported Field Officer role formats', () => {
  [
    'Field Officer',
    'field_officer',
    'ROLE_FIELD_OFFICER',
    'ROLE FIELD OFFICER',
    'role-field-officer',
  ].forEach((role) => assert.equal(isFieldOfficerRoleValue(role), true, role));

  ['Admin', 'ROLE_ADMIN', 'Manager', 'Regional Manager', null].forEach((role) =>
    assert.equal(isFieldOfficerRoleValue(role), false, String(role))
  );
});

test('detects Field Officer access from saved flags and current-user authorities', () => {
  assert.equal(isFieldOfficerWebUser({
    correctedRoleFlags: { isManager: false, isFieldOfficer: true },
  }), true);

  assert.equal(isFieldOfficerWebUser({
    currentUser: {
      password: '',
      username: 'officer',
      authorities: [{ authority: 'ROLE_FIELD_OFFICER' }],
      accountNonExpired: true,
      accountNonLocked: true,
      credentialsNonExpired: true,
      enabled: true,
    },
  }), true);

  assert.equal(isFieldOfficerWebUser({
    userRole: 'Manager',
    currentUser: {
      password: '',
      username: 'manager',
      authorities: [{ authority: 'ROLE_MANAGER' }],
      accountNonExpired: true,
      accountNonLocked: true,
      credentialsNonExpired: true,
      enabled: true,
    },
  }), false);
});

test('detects Field Officer roles embedded in JWT claims', () => {
  const makeToken = (payload) => [
    Buffer.from('{}').toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'signature',
  ].join('.');

  assert.equal(tokenHasFieldOfficerRole(makeToken({ role: 'ROLE_FIELD_OFFICER' })), true);
  assert.equal(tokenHasFieldOfficerRole(makeToken({
    authorities: [{ authority: 'ROLE_FIELD OFFICER' }],
  })), true);
  assert.equal(tokenHasFieldOfficerRole(makeToken({ roles: ['ROLE_ADMIN', 'ROLE_MANAGER'] })), false);
  assert.equal(tokenHasFieldOfficerRole('not-a-jwt'), false);
});
