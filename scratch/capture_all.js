const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/DA103EC0396DC3465CE43844CB9AB088');
const fs = require('fs');

ws.onopen = () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws.send(JSON.stringify({ id: 2, method: 'Page.enable' }));

  // Switch to Dashboard
  setTimeout(() => {
    ws.send(JSON.stringify({
      id: 3,
      method: 'Runtime.evaluate',
      params: {
        expression: '(() => { const b = document.querySelectorAll(".nav-item")[0]; if(b) b.click(); })()'
      }
    }));
  }, 400);

  setTimeout(() => {
    ws.send(JSON.stringify({ id: 4, method: 'Page.captureScreenshot', params: { format: 'png' } }));
  }, 1000);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.id === 4 && data.result?.data) {
    const p = 'C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\9382d089-8622-4893-bbc5-956edf748516\\current_dashboard.png';
    fs.writeFileSync(p, Buffer.from(data.result.data, 'base64'));
    console.log('Saved dashboard screenshot to', p);
    process.exit(0);
  }
};
