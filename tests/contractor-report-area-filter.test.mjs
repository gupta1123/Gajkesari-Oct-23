import test from 'node:test';
import assert from 'node:assert/strict';
import { contractorEngineerVisitReportsApi } from '../lib/contractor-engineer-visit-reports-api.ts';

// Regression test: Submitted Reports must always call the paginated v2 list
// endpoint with `areaFilter` as a URL-encoded query parameter. Legacy shapes like
// /contractor-engineer-visit-report/{area} or
// /contractor-engineer-visit-report/getByDateRange/{area} hit unmapped
// backend routes and surface as "Failed to load visit reports (403)".
test('contractor report area filter uses v2 list endpoint with areaFilter query param', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const requests = [];

  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (key) => (key === 'authToken' ? 'report-token' : null) },
    configurable: true,
  });
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(
      JSON.stringify({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, first: true, last: true }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true });
  });

  // Area only.
  await contractorEngineerVisitReportsApi.getPage({
    start: '2026-09-01',
    end: '2026-09-16',
    areaFilter: 'Pune',
    page: 0,
    size: 20,
  });
  assert.equal(
    requests[0].url,
    'https://api.gajkesaristeels.in/v2/contractor-engineer-visit-reports?start=2026-09-01&end=2026-09-16&areaFilter=Pune&page=0&size=20',
  );

  // Area + category together.
  await contractorEngineerVisitReportsApi.getPage({
    start: '2026-09-01',
    end: '2026-09-16',
    category: 'Engineer',
    areaFilter: 'Pune',
    page: 0,
    size: 20,
  });
  assert.equal(
    requests[1].url,
    'https://api.gajkesaristeels.in/v2/contractor-engineer-visit-reports?start=2026-09-01&end=2026-09-16&category=Engineer&areaFilter=Pune&page=0&size=20',
  );

  // Area with characters needing encoding stays in the query string.
  await contractorEngineerVisitReportsApi.getPage({ areaFilter: 'Pune / Pimpri', page: 0, size: 20 });
  const areaUrl = new URL(requests[2].url);
  assert.equal(areaUrl.pathname, '/v2/contractor-engineer-visit-reports');
  assert.equal(areaUrl.searchParams.get('areaFilter'), 'Pune / Pimpri');

  // Empty area is omitted (clearing the filter restores the list).
  await contractorEngineerVisitReportsApi.getPage({ page: 0, size: 20 });
  assert.equal(
    requests[3].url,
    'https://api.gajkesaristeels.in/v2/contractor-engineer-visit-reports?page=0&size=20',
  );

  for (const request of requests) {
    assert.equal(request.options.headers.Authorization, 'Bearer report-token');
    assert.match(request.url, /\/v2\/contractor-engineer-visit-reports\?/);
  }
});
