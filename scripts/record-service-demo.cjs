const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs/promises');
const { chromium } = require('playwright');
const app = require('../src/app');

async function main() {
  const output = path.resolve(__dirname, '../docs/demo');
  await fs.mkdir(output, { recursive: true });
  const server = app.listen(0, '127.0.0.1');
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    browser = await chromium.launch({
      executablePath: process.env.DEMO_CHROMIUM_PATH || undefined,
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      recordVideo: { dir: output, size: { width: 1280, height: 720 } },
    });
    const page = await context.newPage();
    const video = page.video();
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin, { waitUntil: 'networkidle' });
    assert(await page.getByRole('heading', { name: 'service opérationnel', exact: true }).isVisible());
    const button = page.getByRole('button', { name: 'vérifier le statut', exact: true });
    assert(await button.isVisible());
    // Pauses volontaires pour laisser au spectateur le temps de lire.
    await page.waitForTimeout(4000);
    await button.hover();
    await button.focus();
    await page.waitForTimeout(2000);
    const [response] = await Promise.all([
      page.waitForResponse((res) => new URL(res.url()).pathname === '/status'),
      button.click(),
    ]);
    assert.equal(response.status(), 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    await page.waitForURL((url) => url.pathname === '/status');
    await page.waitForTimeout(5000);
    await page.goBack({ waitUntil: 'networkidle' });
    assert(await button.isVisible());
    await page.waitForTimeout(3000);
    await context.close();
    await video.saveAs(path.join(output, 'service-operationnel.webm'));
    await video.delete();
    console.log('Vidéo créée : docs/demo/service-operationnel.webm');
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
