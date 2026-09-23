const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/DA103EC0396DC3465CE43844CB9AB088');
const fs = require('fs');

let errors = [];

ws.onopen = () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
  ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));

  console.log('Testing Privacy toggle on Dashboard...');
  setTimeout(() => {
    // Click privacy toggle button (the eye icon next to TỔNG TÀI SẢN KHẢ DỤNG)
    ws.send(JSON.stringify({
      id: 10,
      method: 'Runtime.evaluate',
      params: {
        returnByValue: true,
        expression: `
          (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const eyeBtn = btns.find(b => b.title && (b.title.includes('Ẩn số tiền') || b.title.includes('Hiện số tiền')));
            if (eyeBtn) {
              eyeBtn.click();
              return 'Clicked eye toggle button';
            }
            return 'Eye toggle button not found';
          })()
        `
      }
    }));
  }, 1000);

  setTimeout(() => {
    console.log('Capturing Privacy masked dashboard screenshot...');
    ws.send(JSON.stringify({
      id: 20,
      method: 'Page.captureScreenshot',
      params: { format: 'png' }
    }));
  }, 1800);

  // Toggle privacy back off and navigate to Wallets page
  setTimeout(() => {
    ws.send(JSON.stringify({
      id: 30,
      method: 'Runtime.evaluate',
      params: {
        returnByValue: true,
        expression: `
          (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const eyeBtn = btns.find(b => b.title && (b.title.includes('Ẩn số tiền') || b.title.includes('Hiện số tiền')));
            if (eyeBtn) eyeBtn.click(); // turn back on

            const walletCard = Array.from(document.querySelectorAll('*')).find(e => e.textContent && e.textContent.includes('Tài chính & Ngân sách') && e.textContent.includes('Mở ví'));
            if (walletCard) {
              walletCard.click();
              return 'Clicked Wallets navigation card';
            }
            return 'Wallet card not found';
          })()
        `
      }
    }));
  }, 2300);

  setTimeout(() => {
    console.log('Capturing Wallets page screenshot...');
    ws.send(JSON.stringify({
      id: 40,
      method: 'Page.captureScreenshot',
      params: { format: 'png' }
    }));
  }, 3200);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.method === 'Runtime.exceptionThrown') {
    console.error('FATAL EXCEPTION:', JSON.stringify(data.params.exceptionDetails, null, 2));
    errors.push(data.params.exceptionDetails);
  }
  if (data.id === 10) console.log('Privacy Click Result:', data.result?.result?.value);
  if (data.id === 30) console.log('Wallets Nav Result:', data.result?.result?.value);

  if (data.id === 20) {
    const base64 = data.result?.data;
    if (base64) {
      const outPath = 'C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\9382d089-8622-4893-bbc5-956edf748516\\privacy_mode_dashboard.png';
      fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
      console.log('Saved privacy mode screenshot to:', outPath);
    }
  }

  if (data.id === 40) {
    const base64 = data.result?.data;
    if (base64) {
      const outPath = 'C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\9382d089-8622-4893-bbc5-956edf748516\\wallets_page_demo.png';
      fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
      console.log('Saved wallets page screenshot to:', outPath);
    }
    setTimeout(() => {
      console.log('Done testing. Total errors:', errors.length);
      process.exit(errors.length > 0 ? 1 : 0);
    }, 300);
  }
};
