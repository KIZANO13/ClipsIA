const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'dashboard', 'public', 'clipia');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const js = read('app.js');
const manifest = JSON.parse(read('manifest.webmanifest'));

test('painel em português com elementos obrigatórios', () => {
  assert.match(html, /lang="pt-BR"/);
  for (const id of [
    'clip-form','video-url','video-file','clip-count','format',
    'captions','auto-hook','acknowledged','connection','results-section',
    'clip-list','confirm-quality','force-quality','download-all'
  ]) {
    assert.ok(html.includes(`id="${id}"`), `${id} ausente`);
  }
});

test('página usa URLs relativas no próprio servidor', () => {
  assert.match(js, /request\('\/api\/config'\)/);
  assert.match(js, /request\('\/api\/process'/);
  assert.match(js, /\/api\/status\/\$\{/);
  assert.match(js, /\/api\/jobs\/\$\{/);
});

test('opções usam os nomes reconhecidos pelo backend', () => {
  for (const field of ['acknowledged','output_format','target_clips','auto_hook','captions','force_low_quality']) {
    assert.ok(js.includes(field), `campo ${field} ausente`);
  }
  for (const ratio of ['vertical', 'square', 'horizontal']) {
    assert.ok(html.includes(`value="${ratio}"`));
  }
});

test('tokens pessoais não estão gravados nos arquivos', () => {
  assert.doesNotMatch(js + html, /AIza[0-9A-Za-z_-]{25,}|sk-[0-9A-Za-z]{20,}/);
  assert.doesNotMatch(js, /localStorage\.setItem\(['"]gemini/i);
});

test('manifesto aponta para a página real e ícone existente', () => {
  assert.equal(manifest.start_url, '/clipia/index.html');
  assert.equal(manifest.scope, '/clipia/');
  assert.equal(manifest.display, 'standalone');
  assert.ok(fs.existsSync(path.join(root, 'icon.svg')));
});
