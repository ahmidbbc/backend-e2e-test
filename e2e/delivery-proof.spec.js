const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

if (!process.env.DEPLOY_URL) throw new Error('DEPLOY_URL is required');
if (!process.env.DEMO_OUTPUT_DIR) throw new Error('DEMO_OUTPUT_DIR is required');

test('le compteur atteint son objectif au troisième clic', async ({ page }) => {
  await page.goto(`${process.env.DEPLOY_URL}/compteur`);
  const value = page.locator('#counter-value');
  const add = page.locator('#counter-add');
  const goal = page.locator('#counter-goal');

  await expect(value).toHaveText('0');
  await expect(add).toHaveText('ajouter');
  await expect(goal).toBeHidden();
  for (let count = 1; count <= 3; count += 1) {
    await add.click();
    await expect(value).toHaveText(String(count));
    if (count < 3) await expect(goal).toBeHidden();
  }
  await expect(goal).toBeVisible();
  await expect(goal).toHaveText('objectif atteint');
  fs.mkdirSync(process.env.DEMO_OUTPUT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(process.env.DEMO_OUTPUT_DIR, 'compteur-objectif-atteint.png'),
    fullPage: true,
  });

  await add.click();
  await expect(value).toHaveText('4');
  await expect(goal).toBeVisible();
});
