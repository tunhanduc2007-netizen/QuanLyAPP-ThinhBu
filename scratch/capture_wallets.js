const fs = require('fs');

async function main() {
  const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/A1933E7C0A58E5731CA0715C4FA060FD');
  await new Promise(r => ws.addEventListener('open', r));

  const send = (m, p = {}) => new Promise((resolve, reject) => {
    const id = Math.random();
    const h = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === id) { ws.removeEventListener('message', h); resolve(d.result); }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id, method: m, params: p }));
  });

  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const hero = document.querySelector('.liquid-glass-hero') || document.querySelector('.hero-balance-card');
        if (hero) hero.click();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 600));

  const snap = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\3ca392da-772f-4dfd-8c0a-ede057bbb058\\wallets_screen_real.png', Buffer.from(snap.data, 'base64'));
  console.log('Wallets captured successfully!');
  ws.close();
}

main().catch(console.error);
