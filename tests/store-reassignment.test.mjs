import test from 'node:test';
import assert from 'node:assert/strict';

import { API } from '../lib/api.ts';

test('store search filters by the exact source employee id', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const requests = [];

  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (key) => key === 'authToken' ? 'store-token' : null },
    configurable: true,
  });
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true });
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true });
  });

  await new API().getStoresFilteredPaginated({
    employeeId: 205,
    state: 'Maharashtra',
    page: 0,
    size: 20,
  });

  const url = new URL(requests[0].url);
  assert.equal(url.pathname, '/v2/store/search');
  assert.equal(url.searchParams.get('employeeId'), '205');
  assert.equal(url.searchParams.get('state'), 'Maharashtra');
  assert.equal(url.searchParams.get('page'), '0');
  assert.equal(url.searchParams.get('size'), '20');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer store-token');
});

test('bulk store reassignment sends the selected ids with authentication', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const requests = [];

  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true });
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: (key) => key === 'authToken' ? 'store-token' : null },
    configurable: true,
  });
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify({ success: true }), {
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

  await API.bulkEditStoreEmployee({
    sourceEmployeeId: 205,
    targetEmployeeId: 310,
    storeIds: [9862, 9863],
  });

  assert.equal(requests[0].url, 'https://api.gajkesaristeels.in/store/bulk-edit-employee');
  assert.equal(requests[0].options.method, 'PUT');
  assert.equal(requests[0].options.headers.Authorization, 'Bearer store-token');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    sourceEmployeeId: 205,
    targetEmployeeId: 310,
    storeIds: [9862, 9863],
  });
});
