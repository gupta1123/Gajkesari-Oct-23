import test from 'node:test';
import assert from 'node:assert/strict';
import { API } from '../lib/api.ts';

test('approval requests use authenticated status/date pagination parameters', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const requests = [];

  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (key) => key === 'authToken' ? 'approval-token' : null },
    configurable: true,
  });
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify({
      content: [{
        id: 9,
        employeeId: 25,
        employeeName: 'Test Officer',
        requestDate: '2026-09-10',
        requestedStatus: 'full day',
        logDate: '2026-09-09',
        actionDate: '2026-09-10',
        status: 'approved',
      }],
      number: 0,
      size: 20,
      totalElements: 21,
      totalPages: 2,
      first: true,
      last: false,
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true });
  });

  const page = await new API().getAttendanceRequestsByStatus(
    'approved',
    '2026-09-01',
    '2026-09-10',
    0,
    20,
  );

  assert.equal(
    requests[0].url,
    'https://api.gajkesaristeels.in/request/getByStatus?status=approved&start=2026-09-01&end=2026-09-10&page=0&size=20',
  );
  assert.equal(requests[0].options.headers.Authorization, 'Bearer approval-token');
  assert.equal(page.page, 0);
  assert.equal(page.totalElements, 21);
  assert.equal(page.totalPages, 2);
  assert.equal(page.content[0].id, 9);
});

test('legacy array approval responses are paginated safely on the client', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify(Array.from({ length: 25 }, (_, index) => ({ id: index + 1 }))),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
  t.after(() => { globalThis.fetch = originalFetch; });

  const page = await new API().getAttendanceRequestsByStatus(
    'pending',
    '2026-09-01',
    '2026-09-10',
    1,
    20,
  );

  assert.deepEqual(page.content.map((request) => request.id), [21, 22, 23, 24, 25]);
  assert.equal(page.totalElements, 25);
  assert.equal(page.totalPages, 2);
  assert.equal(page.last, true);
});
