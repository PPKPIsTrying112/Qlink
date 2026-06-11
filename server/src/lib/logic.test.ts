import { test } from 'node:test'
import assert from 'node:assert'
import { parseModerationResult } from './moderation'
import { parseBearerToken } from './authHelpers'

test('moderation flags unsafe content and extracts the reason', () => {
  const r = parseModerationResult('UNSAFE: sexual content')
  assert.strictEqual(r.safe, false)
  assert.strictEqual(r.reason, 'sexual content')
})

test('moderation passes safe content', () => {
  assert.strictEqual(parseModerationResult('SAFE').safe, true)
})

test('moderation fails open on empty/garbage responses', () => {
  assert.strictEqual(parseModerationResult('').safe, true)
})

test('auth extracts the token from a valid Bearer header', () => {
  assert.strictEqual(parseBearerToken('Bearer abc123'), 'abc123')
})

test('auth rejects missing or malformed headers', () => {
  assert.strictEqual(parseBearerToken(undefined), null)
  assert.strictEqual(parseBearerToken('Token abc'), null)
})