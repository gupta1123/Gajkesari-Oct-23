import test from 'node:test';
import assert from 'node:assert/strict';
import { API } from '../lib/api.ts';

test('store dropdown page request fetches only the requested employee-scoped page', async (t) => {
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];

  globalThis.fetch = async (url) => {
    requestedUrls.push(String(url));
    return new Response(JSON.stringify({
      content: [{ id: 7, storeName: 'Test Store' }],
      page: 2,
      size: 50,
      totalElements: 151,
      totalPages: 4,
      first: false,
      last: false,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await new API().getStoreNamesPage(25, '  steel  ', 2, 50);

  assert.equal(requestedUrls.length, 1);
  const url = new URL(requestedUrls[0]);
  assert.equal(url.pathname, '/v2/store/names');
  assert.equal(url.searchParams.get('employeeId'), '25');
  assert.equal(url.searchParams.get('searchTerm'), 'steel');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('size'), '50');
  assert.equal(response.content[0].storeName, 'Test Store');
  assert.equal(response.totalPages, 4);
});

test('store dropdown page size is bounded to the backend maximum', async (t) => {
  const originalFetch = globalThis.fetch;
  let requestedUrl = '';

  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return new Response(JSON.stringify({
      content: [],
      page: 0,
      size: 100,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await new API().getStoreNamesPage(25, '', -4, 500);

  const url = new URL(requestedUrl);
  assert.equal(url.searchParams.get('page'), '0');
  assert.equal(url.searchParams.get('size'), '100');
});
