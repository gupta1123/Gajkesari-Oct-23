import test from 'node:test';
import assert from 'node:assert/strict';
import { resetListStateOnNavigation } from '../lib/list-state.ts';

const store = new Map();
globalThis.window = {};
globalThis.sessionStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const seed = () => {
  store.clear();
  store.set('customers.list.state.v1', '{}');
  store.set('visits.table.state.v2', '{}');
  store.set('complaints.filters.v1', '{}');
  store.set('nav.return.to', '{"page":"complaints"}');
};

test('opening a detail page keeps every list filter', () => {
  seed();
  resetListStateOnNavigation('/dashboard/customers/42');
  resetListStateOnNavigation('/dashboard/visits/7');
  assert.equal(store.size, 4);
});

test('returning to the same list keeps its filter', () => {
  seed();
  resetListStateOnNavigation('/dashboard/customers');
  assert.ok(store.has('customers.list.state.v1'));
});

test('landing on another top-level page clears the other lists', () => {
  seed();
  resetListStateOnNavigation('/dashboard/visits');
  assert.ok(store.has('visits.table.state.v2'));
  assert.equal(store.has('customers.list.state.v1'), false);
  assert.equal(store.has('complaints.filters.v1'), false);
  assert.equal(store.has('nav.return.to'), false);
});

test('a page without saved state still counts as leaving', () => {
  seed();
  resetListStateOnNavigation('/dashboard/expenses/');
  assert.equal(store.size, 0);
});

test('settings sub-pages count as a top-level page', () => {
  seed();
  resetListStateOnNavigation('/dashboard/settings/team');
  assert.equal(store.size, 0);
});
