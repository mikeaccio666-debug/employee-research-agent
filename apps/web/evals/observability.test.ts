// Error reports must never carry what people wrote (lib/observability).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scrubText } from '../lib/observability/sentry-options';
import { withoutMessage } from '../lib/observability/report';

test('quoted text in error messages is filtered', () => {
  let parseError = '';
  try {
    JSON.parse('Here is my résumé: led the Full Plate rebrand');
  } catch (e) {
    parseError = (e as Error).message;
  }
  assert.match(parseError, /Here is/);
  assert.doesNotMatch(scrubText(parseError), /Here is|résumé|Full Plate/);
  assert.equal(scrubText('Cannot read properties of undefined (reading \'map\')'), 'Cannot read properties of undefined (reading [Filtered])');
  assert.equal(scrubText('no “quoted words” left'), 'no [Filtered] left');
});

test('a reported error keeps its type and frames but not its message', () => {
  let original: Error | undefined;
  try {
    JSON.parse('{"headline": "My secret headline"');
  } catch (e) {
    original = e as Error;
  }
  const safe = withoutMessage('headline critic failed', original);
  assert.equal(safe.name, 'SyntaxError');
  assert.equal(safe.message, 'headline critic failed');
  assert.doesNotMatch(safe.stack ?? '', /secret/);
  assert.match(safe.stack ?? '', /^SyntaxError: headline critic failed\n\s+at /);
  assert.equal(withoutMessage('x', 'a string thrown').message, 'x');
});
