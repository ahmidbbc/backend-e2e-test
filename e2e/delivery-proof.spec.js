const { test, expect } = require(process.env.RUNNER_PLAYWRIGHT_MODULE || '@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');

if (!process.env.DEPLOY_URL) throw new Error('DEPLOY_URL is required');
if (!process.env.DEMO_OUTPUT_DIR) throw new Error('DEMO_OUTPUT_DIR is required');

test('le compteur atteint son objectif après trois clics', async ({ page }) => {
  await page.goto(`${process.env.DEPLOY_URL}/compteur`);
  const value = page.locator('#counter-value');
  const goal = page.locator('#counter-goal');
  const add = page.locator('#counter-add');
  await expect(value).toHaveText('0');
  await expect(goal).toBeEmpty();
  await expect(add).toHaveText('ajouter');
  for (let count = 1; count <= 3; count += 1) {
    await add.click();
    await expect(value).toHaveText(String(count));
    if (count < 3) await expect(goal).toBeEmpty();
  }
  await expect(goal).toHaveText('objectif atteint');
  await expect(goal).toBeVisible();
  await fs.mkdir(process.env.DEMO_OUTPUT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(process.env.DEMO_OUTPUT_DIR, 'compteur-objectif-atteint.png'),
    fullPage: true,
  });
  await add.click();
  await expect(value).toHaveText('4');
  await expect(goal).toHaveText('objectif atteint');
});
