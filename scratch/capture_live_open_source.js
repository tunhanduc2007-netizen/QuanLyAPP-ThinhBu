const fs = require('fs');

async function main() {
  const wsUrl = 'ws://127.0.0.1:9222/devtools/page/A1933E7C0A58E5731CA0715C4FA060FD';
  const ws = new WebSocket(wsUrl);

  await new Promise(r => ws.addEventListener('open', r));
  console.log('Connected to Chrome DevTools WebSocket');

  let reqId = 1;
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = reqId++;
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const evaluate = async (expr) => {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return res?.result?.value;
  };

  const takeScreenshot = async (filePath) => {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(filePath, Buffer.from(res.data, 'base64'));
    console.log('Saved screenshot:', filePath);
  };

  // 1. Reload page to ensure latest React build & CSS are active
  console.log('Reloading page...');
  await send('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 2000));

  // 2. Set mobile device viewport for clean aesthetics
  await send('Emulation.setDeviceMetricsOverride', {
    width: 430,
    height: 932,
    deviceScaleFactor: 2,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 800));

  // 3. Screenshot Dashboard
  await takeScreenshot('C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\3ca392da-772f-4dfd-8c0a-ede057bbb058\\dashboard_liquid_glass_magic.png');

  // 4. Click AI FAB to open AI Assistant Modal
  console.log('Clicking AI FAB...');
  await evaluate(`
    (() => {
      const fab = document.querySelector('.ai-shimmer-fab');
      if (fab) fab.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 700));
  await takeScreenshot('C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\3ca392da-772f-4dfd-8c0a-ede057bbb058\\ai_modal_liquid_spring.png');

  // Close AI modal
  await evaluate(`
    (() => {
      const backdrop = document.querySelector('.bottom-sheet-backdrop');
      if (backdrop) backdrop.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 500));

  // 5. Navigate to Ranking tab & Click Podium for Confetti
  console.log('Clicking Ranking tab...');
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('.bottom-nav-bar button, .nav-item'));
      const r = btns.find(b => b.innerText.includes('Ranking'));
      if (r) r.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 600));

  // Switch to personal tab if available
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const tab = btns.find(b => b.innerText.includes('Toàn sàn') || b.innerText.includes('Cá nhân'));
      if (tab) tab.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 400));

  // Click podium
  await evaluate(`
    (() => {
      const p = document.querySelector('.liquid-glass-card') || document.querySelector('.ui-card');
      if (p) p.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 300));
  await takeScreenshot('C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\3ca392da-772f-4dfd-8c0a-ede057bbb058\\ranking_confetti_live.png');

  // 6. Navigate to Wallets
  console.log('Clicking Wallets...');
  await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('.bottom-nav-bar button, .nav-item'));
      const d = btns.find(b => b.innerText.includes('Tổng quan'));
      if (d) d.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 500));
  await evaluate(`
    (() => {
      const w = Array.from(document.querySelectorAll('div, span')).find(e => e.innerText && e.innerText.includes('Ví & Ngân sách'));
      if (w) w.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 700));
  await takeScreenshot('C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\3ca392da-772f-4dfd-8c0a-ede057bbb058\\wallets_liquid_glass_live.png');

  console.log('ALL SCREENSHOTS CAPTURED SUCCESS!');
  ws.close();
}

main().catch(err => console.error('Error:', err));
