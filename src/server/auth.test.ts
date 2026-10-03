import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_DEV_OWNER_TOKEN, isDevOwnerFallback, resolveOwnerAccessToken } from './auth';

test('uses a development fallback owner token when no server token is configured', () => {
  const previousToken = process.env.OWNER_ACCESS_TOKEN;
  const previousNodeEnv = process.env.NODE_ENV;

  delete process.env.OWNER_ACCESS_TOKEN;
  process.env.NODE_ENV = 'development';

  try {
    assert.equal(resolveOwnerAccessToken(), DEFAULT_DEV_OWNER_TOKEN);
    assert.equal(isDevOwnerFallback(), true);
  } finally {
    if (previousToken === undefined) delete process.env.OWNER_ACCESS_TOKEN;
    else process.env.OWNER_ACCESS_TOKEN = previousToken;

    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('prefers the configured production token over the fallback when present', () => {
  const previousToken = process.env.OWNER_ACCESS_TOKEN;
  const previousNodeEnv = process.env.NODE_ENV;

  process.env.OWNER_ACCESS_TOKEN = 'configured-token';
  process.env.NODE_ENV = 'production';

  try {
    assert.equal(resolveOwnerAccessToken(), 'configured-token');
    assert.equal(isDevOwnerFallback(), false);
  } finally {
    if (previousToken === undefined) delete process.env.OWNER_ACCESS_TOKEN;
    else process.env.OWNER_ACCESS_TOKEN = previousToken;

    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
