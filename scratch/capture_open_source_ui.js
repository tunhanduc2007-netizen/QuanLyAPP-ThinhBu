const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 420, height: 900, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: 'scratch/dashboard_liquid_magic.png' });
  console.log('1. Dashboard captured');

  // Click AI FAB
  const fab = await page.$('.ai-shimmer-fab');
  if (fab) {
    await fab.click();
    await new Promise(r => setTimeout(r, 700));
    await page.screenshot({ path: 'scratch/ai_modal_spring.png' });
    console.log('2. AI Modal captured');
    await page.click('.bottom-sheet-backdrop');
    await new Promise(r => setTimeout(r, 500));
  } else {
    console.log('FAB not found');
  }

  // Go to Ranking
  const rankingClicked = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(el => el.innerText.includes('Ranking'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  if (rankingClicked) {
    await new Promise(r => setTimeout(r, 600));
    const podiumClicked = await page.evaluate(() => {
      const p = document.querySelector('.liquid-glass-card') || document.querySelector('.ui-card');
      if (p) { p.click(); return true; }
      return false;
    });
    await new Promise(r => setTimeout(r, 350));
    await page.screenshot({ path: 'scratch/ranking_confetti.png' });
    console.log('3. Ranking captured');
  }

  // Go to Wallets
  const goDashboard = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(el => el.innerText.includes('Tổng quan'));
    if (btn) { btn.click(); return true; }
    return false;
  });
  await new Promise(r => setTimeout(r, 500));
  const openWallets = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div, span')).find(e => e.innerText && e.innerText.includes('Ví & Ngân sách'));
    if (el) { el.click(); return true; }
    return false;
  });
  if (openWallets) {
    await new Promise(r => setTimeout(r, 700));
    await page.screenshot({ path: 'scratch/wallets_liquid_glass.png' });
    console.log('4. Wallets captured');
  }

  await browser.close();
  console.log('COMPLETE!');
})();
