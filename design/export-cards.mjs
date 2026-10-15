#!/usr/bin/env node
/**
 * export-cards.mjs — 將 brand-kit.html 中所有 [data-export] 卡片匯出為精確尺寸的 PNG
 *
 *   npm i -D playwright && npx playwright install chromium
 *   node design/export-cards.mjs            # 1x，平台規格尺寸
 *   node design/export-cards.mjs --scale 2  # 2x，高解析度（LinkedIn 文件、簡報用）
 *
 * 輸出：assets/<data-export>.png，例如 assets/github/social-preview.png
 */
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const scaleArg = process.argv.indexOf('--scale');
const scale = scaleArg > -1 ? Number(process.argv[scaleArg + 1]) : 1;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: scale });
await page.goto(`${pathToFileURL(path.join(here, 'brand-kit.html')).href}?export`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

for (const card of await page.$$('[data-export]')) {
  const name = await card.getAttribute('data-export');
  const suffix = scale === 1 ? '' : `@${scale}x`;
  const out = path.join(root, 'assets', `${name}${suffix}.png`);
  await card.screenshot({ path: out });
  console.log(`✓ ${path.relative(root, out)}`);
}

await browser.close();
