import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { notProduction, pickSupabase, PRODUCTION_PROJECTS, refusesProduction } from '@/lib/supabase/env';

// Which Supabase project a deployment talks to. Only the production deployment may use the
// production project; every other Vercel deployment refuses it.

const PROD = { url: 'https://mforvnqyfnqgvbqcsuta.supabase.co', key: 'sb_publishable_prod' };
const TEST = { url: 'https://nsaopiswrunjwcjpyvqh.supabase.co', key: 'sb_publishable_test' };

describe('pickSupabase', () => {
  it('lets production use the production project', () => {
    assert.deepEqual(pickSupabase({ deployment: 'production', ...PROD }), PROD);
    assert.deepEqual(pickSupabase({ deployment: ' Production ', ...PROD }), PROD);
  });

  it('uses whatever is set off Vercel (local development, CI), as before', () => {
    for (const deployment of ['', undefined]) {
      assert.deepEqual(pickSupabase({ deployment, ...PROD }), PROD, String(deployment));
      assert.deepEqual(pickSupabase({ deployment, ...TEST }), TEST, String(deployment));
    }
  });

  it('uses the test project on a preview', () => {
    assert.deepEqual(pickSupabase({ deployment: 'preview', ...TEST }), TEST);
  });

  it('refuses the production project on every Vercel deployment that is not production', () => {
    for (const deployment of ['preview', 'development', 'staging', 'PREVIEW']) {
      assert.equal(pickSupabase({ deployment, ...PROD }), null, deployment);
      assert.equal(refusesProduction({ deployment, url: PROD.url }), true, deployment);
    }
  });

  it('recognises the production project however its address is written', () => {
    const spellings = [
      'https://MFORVNQYFNQGVBQCSUTA.supabase.co/',
      'https://mforvnqyfnqgvbqcsuta.supabase.co/rest/v1',
      'https://mforvnqyfnqgvbqcsuta.supabase.co:443',
      'https://mforvnqyfnqgvbqcsuta.supabase.co.',
      ' https://mforvnqyfnqgvbqcsuta.supabase.co ',
      'mforvnqyfnqgvbqcsuta.supabase.co',
      'https://db.mforvnqyfnqgvbqcsuta.supabase.co',
      'https://mforvnqyfnqgvbqcsuta.supabase.in',
    ];
    for (const url of spellings) assert.equal(pickSupabase({ deployment: 'preview', url, key: PROD.key }), null, url);
  });

  it('refuses a custom domain once it is listed as production', () => {
    const production = [...PRODUCTION_PROJECTS, 'api.example.com'];
    assert.equal(pickSupabase({ deployment: 'preview', url: 'https://api.example.com', key: 'k' }, production), null);
    assert.deepEqual(pickSupabase({ deployment: 'production', url: 'https://api.example.com', key: 'k' }, production), {
      url: 'https://api.example.com',
      key: 'k',
    });
  });

  it('needs both the address and the key', () => {
    for (const deployment of ['production', 'preview', '']) {
      assert.equal(pickSupabase({ deployment, url: TEST.url, key: undefined }), null);
      assert.equal(pickSupabase({ deployment, url: undefined, key: TEST.key }), null);
      assert.equal(pickSupabase({ deployment, url: '', key: '' }), null);
    }
  });

  it('does not report a refusal when nothing was refused', () => {
    assert.equal(refusesProduction({ deployment: 'preview', url: TEST.url }), false);
    assert.equal(refusesProduction({ deployment: 'preview', url: undefined }), false);
    assert.equal(refusesProduction({ deployment: 'production', url: PROD.url }), false);
    assert.equal(refusesProduction({ deployment: '', url: PROD.url }), false);
    // An empty entry in the list must not match every address.
    assert.equal(refusesProduction({ deployment: 'preview', url: TEST.url }, ['']), false);
  });

  it('knows the production project', () => {
    // If this list is emptied, previews stop refusing production.
    assert.ok(PRODUCTION_PROJECTS.includes('mforvnqyfnqgvbqcsuta'));
    assert.ok(PRODUCTION_PROJECTS.every((mark) => mark.length >= 8 && mark === mark.toLowerCase()));
  });
});

describe('notProduction', () => {
  it('is true only on Vercel deployments other than production', () => {
    assert.equal(notProduction('preview'), true);
    assert.equal(notProduction('development'), true);
    assert.equal(notProduction('production'), false);
    assert.equal(notProduction(''), false);
    assert.equal(notProduction(undefined), false);
  });
});
