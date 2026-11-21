import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');

test('firestore.rules includes global default-deny catch-all', () => {
  assert.match(rules, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;\s*\}/);
});

test('firestore.rules enforces email_verified == true and valid IDs', () => {
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /function isValidId\(id\)/);
  assert.match(rules, /isShopOwnerParent\(shopId\)/);
});

test('firestore.rules covers all blueprint collections and enforces hasOnly on keys', () => {
  for (const col of ['products', 'parties', 'invoices', 'khata', 'expenses', 'salesmen', 'backups']) {
    assert.ok(rules.includes(`match /${col}/`), `Missing collection match block for ${col}`);
  }
  assert.ok(rules.includes('affectedKeys().hasOnly('), 'Updates must enforce affectedKeys().hasOnly');
  assert.ok(rules.includes('request.time'), 'Timestamps must enforce server request.time');
  assert.ok(!rules.match(/allow list:[^\n]*isAdmin\(\)/), 'allow list must not call isAdmin() with exists()');
});
