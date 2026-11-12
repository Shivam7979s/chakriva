import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CODESPACE_LANGUAGES,
  QUICK_STARTER_TEMPLATES,
  getLanguageSpec,
} from '../features/codespace/data/codespaceTemplates.ts';

test('CHAKRIVA CodeSpace Templates — Language definitions and quick starter templates are complete', () => {
  const expectedLangs = ['java', 'cpp', 'python', 'typescript', 'go'];
  for (const lang of expectedLangs) {
    const spec = getLanguageSpec(lang);
    assert.equal(spec.id, lang);
    assert.ok(spec.defaultTemplate.trim().length > 20, `Template for ${lang} should be populated`);
    assert.ok(spec.ext.length > 0);
    assert.ok(spec.shortLabel.length > 0);
  }

  assert.equal(Object.keys(CODESPACE_LANGUAGES).length, 5);
  assert.ok(QUICK_STARTER_TEMPLATES.length >= 3);

  for (const tpl of QUICK_STARTER_TEMPLATES) {
    assert.ok(tpl.id.length > 0);
    assert.ok(tpl.title.length > 0);
    assert.ok(tpl.code.trim().length > 30);
    assert.ok(CODESPACE_LANGUAGES[tpl.language], `Starter template ${tpl.id} must use valid language`);
  }

  const fallback = getLanguageSpec('rust');
  assert.equal(fallback.shortLabel, 'RUST');
  assert.equal(fallback.ext, 'txt');
});

