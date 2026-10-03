import test from 'node:test';
import assert from 'node:assert/strict';

import { AVAILABLE_STRATEGIES } from './backtester';

test('backtest strategies remain available as a fallback even when the API is unavailable', () => {
  assert.ok(Array.isArray(AVAILABLE_STRATEGIES), 'strategies must be defined');
  assert.ok(AVAILABLE_STRATEGIES.length > 0, 'at least one strategy must exist');
  assert.deepEqual(
    AVAILABLE_STRATEGIES.map((s) => s.id),
    ['chanakya', 'bhishma', 'arjuna', 'kuber', 'vidura'],
    'strategy IDs should be valid and selectable'
  );
});
