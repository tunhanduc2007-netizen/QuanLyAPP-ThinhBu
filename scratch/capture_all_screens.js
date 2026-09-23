const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/DA103EC0396DC3465CE43844CB9AB088');
const fs = require('fs');

const run = (expr) => new Promise(res => {
  const id = Math.floor(Math.random() * 100000);
  const handler = (evt) => {
    const d = JSON.parse(evt.data);
    if (d.id === id) {
      ws.removeEventListener('message', handler);
      res(d.result?.result?.value);
    }
  };
  ws.addEventListener('message', handler);
  ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr } }));
});

const screenshot = (name) => new Promise(res => {
  const id = Math.floor(Math.random() * 100000);
  const handler = (evt) => {
    const d = JSON.parse(evt.data);
    if (d.id === id && d.result?.data) {
      ws.removeEventListener('message', handler);
      fs.writeFileSync(`C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\9382d089-8622-4893-bbc5-956edf748516\\${name}.png`, Buffer.from(d.result.data, 'base64'));
      console.log('Saved', name);
      res();
    }
  };
  ws.addEventListener('message', handler);
  ws.send(JSON.stringify({ id, method: 'Page.captureScreenshot', params: { format: 'png' } }));
});

const wait = ms => new Promise(r => setTimeout(r, ms));

ws.onopen = async () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
  await wait(300);

  // 1. Calendar
  await run('document.querySelectorAll(".nav-item")[1]?.click()');
  await wait(500);
  await screenshot('tab_calendar');

  // 2. Ranking
  await run('document.querySelectorAll(".nav-item")[2]?.click()');
  await wait(500);
  await screenshot('tab_ranking');

  // 3. Settings
  await run('document.querySelectorAll(".nav-item")[3]?.click()');
  await wait(500);
  await screenshot('tab_settings');

  // 4. Add Tx Modal
  await run('document.querySelector(".nav-center-plus")?.click()');
  await wait(500);
  await screenshot('modal_add_tx');

  ws.close();
  process.exit(0);
};
