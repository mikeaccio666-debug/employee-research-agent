import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readResume } from '@/lib/agent/sources';
import { resumePdf } from '@/lib/resume/pdf';

// Reading an uploaded résumé goes through unpdf, which follows Node's releases closely. These run
// on the Node in package.json's `engines`, the same one Vercel uses.
describe('reading a résumé', () => {
  it('reads back the text of a PDF, page by page, Chinese included', async () => {
    const bytes = await resumePdf({
      name: 'Lin Wei',
      contact: [],
      summary: 'Backend engineer',
      target: null,
      sections: [
        {
          heading: 'Experience',
          entries: [{ title: 'Software engineer', org: '字节跳动 ByteDance', when: '2023 – 2025', bullets: ['Cut checkout latency by 40% with a Redis cache'] }],
        },
      ],
    });
    const read = await readResume(bytes, 'cv.pdf');
    assert.ok(read.ok, JSON.stringify(read));
    assert.equal(read.pages.length, 1);
    assert.equal(read.pages[0]!.page, 1);
    assert.match(read.pages[0]!.text, /字节跳动 ByteDance/);
    assert.match(read.pages[0]!.text, /Cut checkout latency by 40% with a Redis cache/);
  });

  it('turns away a damaged PDF with a message the person can act on', async () => {
    const read = await readResume(new TextEncoder().encode('%PDF-1.7\nnot really a pdf'), 'cv.pdf');
    assert.equal(read.ok, false);
    assert.match(read.ok ? '' : read.error, /couldn’t be opened/);
  });
});
