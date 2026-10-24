import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getResponseErrorMessage,
  getUserFacingErrorMessage,
  NETWORK_ERROR_MESSAGE,
} from '../lib/user-facing-error.ts';

test('extracts a useful message from the backend array format', () => {
  const message = getUserFacingErrorMessage({
    status: 400,
    details: [{ message: 'Store 12878 city must match the target employee city.' }],
  });

  assert.equal(message, 'Store 12878 city must match the target employee city.');
});

test('removes the API status and JSON wrapper from a legacy error message', () => {
  const message = getUserFacingErrorMessage(
    new Error('API request failed: 400 . Body: [{"message":"Choose a field officer assigned to Karnataka."}]'),
  );

  assert.equal(message, 'Choose a field officer assigned to Karnataka.');
  assert.doesNotMatch(message, /API request failed|Body:|400/);
});

test('uses friendly status fallbacks when the backend sends no message', () => {
  assert.equal(
    getUserFacingErrorMessage({ status: 402, details: null }),
    'This action could not be completed. Please contact your administrator.',
  );
  assert.equal(
    getUserFacingErrorMessage({ status: 403, details: null }),
    'You do not have permission to perform this action.',
  );
  assert.equal(
    getUserFacingErrorMessage({ status: 500, details: null }),
    'The server could not complete the request. Please try again.',
  );
});

test('replaces browser network errors with a helpful connection message', () => {
  assert.equal(getUserFacingErrorMessage(new TypeError('Failed to fetch')), NETWORK_ERROR_MESSAGE);
});

test('parses JSON error responses without exposing the status code', async () => {
  const response = new Response(JSON.stringify({ message: 'The selected date range is not valid.' }), {
    status: 422,
    headers: { 'content-type': 'application/json' },
  });

  assert.equal(
    await getResponseErrorMessage(response),
    'The selected date range is not valid.',
  );
});
