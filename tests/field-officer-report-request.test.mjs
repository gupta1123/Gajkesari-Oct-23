import test from 'node:test';
import assert from 'node:assert/strict';
import { API } from '../lib/api.ts';

test('field officer report endpoints use the shared API client and current bearer token', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const requests = [];

  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (key) => key === 'authToken' ? 'report-token' : null },
    configurable: true,
  });
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    const body = String(url).includes('field-officer-stats')
      ? {
          totalVisits: 0,
          completedVisits: 0,
          attendanceStats: { absences: 0, halfDays: 0, fullDays: 0 },
          visitsByCustomerType: {},
        }
      : [];
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true });
  });

  const api = new API();
  await api.getFieldOfficerVisitStats(25, '2026-08-01', '2026-08-31');
  await api.getCustomerVisitDetails(25, '2026-08-01', '2026-08-31', 'site visit');

  assert.equal(
    requests[0].url,
    'https://api.gajkesaristeels.in/v2/visits/field-officer-stats?employeeId=25&startDate=2026-08-01&endDate=2026-08-31',
  );
  assert.equal(
    requests[1].url,
    'https://api.gajkesaristeels.in/v2/visits/customer-visit-details?employeeId=25&startDate=2026-08-01&endDate=2026-08-31&customerType=site+visit',
  );
  for (const request of requests) {
    assert.equal(request.options.headers.Authorization, 'Bearer report-token');
    assert.equal(request.url.includes('/api/proxy'), false);
  }
});
