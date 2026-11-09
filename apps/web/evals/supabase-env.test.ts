import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pickSupabase } from '@/lib/supabase/env';

// Which Supabase project a deployment talks to. Previews must never reach the production one.

const PROD = { url: 'https://prodref.supabase.co', key: 'sb_publishable_prod' };
const TEST = { previewUrl: 'https://testref.supabase.co', previewKey: 'sb_publishable_test' };
const none = { previewUrl: undefined, previewKey: undefined };

describe('pickSupabase', () => {
  it('uses the production pair in production, in development and off Vercel', () => {
    for (const deployment of ['production', 'development', '', undefined]) {
      assert.deepEqual(pickSupabase({ deployment, ...PROD, ...TEST }), PROD, String(deployment));
    }
  });

  it('uses the test project on a preview', () => {
    assert.deepEqual(pickSupabase({ deployment: 'preview', ...PROD, ...TEST }), { url: TEST.previewUrl, key: TEST.previewKey });
  });

  it('runs a preview without its own pair on the fixtures, even when the production pair is there', () => {
    assert.equal(pickSupabase({ deployment: 'preview', ...PROD, ...none }), null);
    assert.equal(pickSupabase({ deployment: 'preview', ...PROD, previewUrl: TEST.previewUrl, previewKey: undefined }), null);
  });

  it('refuses the production address in the preview slot', () => {
    for (const previewUrl of [PROD.url, 'https://PRODREF.supabase.co/', `${PROD.url}/rest/v1`]) {
      assert.equal(pickSupabase({ deployment: 'preview', ...PROD, previewUrl, previewKey: 'sb_publishable_x' }), null, previewUrl);
    }
  });

  it('needs both halves of a pair', () => {
    assert.equal(pickSupabase({ deployment: 'production', url: PROD.url, key: undefined, ...TEST }), null);
    assert.equal(pickSupabase({ deployment: 'production', url: undefined, key: PROD.key, ...TEST }), null);
  });
});
