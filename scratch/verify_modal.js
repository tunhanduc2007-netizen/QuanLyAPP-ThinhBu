const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/DA103EC0396DC3465CE43844CB9AB088');
const fs = require('fs');

let errors = [];

ws.onopen = () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
  ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));

  // Step 0: Reload page to get fresh app.js?v=12
  console.log('Reloading page...');
  ws.send(JSON.stringify({ id: 4, method: 'Page.reload', params: { ignoreCache: true } }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.method === 'Runtime.exceptionThrown') {
    console.error('FATAL EXCEPTION:', JSON.stringify(data.params.exceptionDetails, null, 2));
    errors.push(data.params.exceptionDetails);
  }
  if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
    console.error('CONSOLE ERROR:', data.params.args.map(a => a.value || a.description).join(' '));
    errors.push(data.params.args);
  }
  if (data.method === 'Page.loadEventFired') {
    console.log('Page loaded fresh! Waiting for React render...');
    
    // Step 1: Click "Tài chính & Ngân sách"
    setTimeout(() => {
      console.log('Step 1: Navigating to Wallets...');
      ws.send(JSON.stringify({
        id: 10,
        method: 'Runtime.evaluate',
        params: {
          returnByValue: true,
          expression: `
            (() => {
              const elements = Array.from(document.querySelectorAll('*'));
              const el = elements.find(e => e.children.length === 0 && e.textContent.includes('Tài chính & Ngân sách'));
              if (el) {
                const clickable = el.closest('[onclick]') || el.parentElement?.parentElement || el;
                clickable.click();
                return 'Clicked Wallets tile';
              }
              return 'Wallets tile not found';
            })()
          `
        }
      }));
    }, 800);

    // Step 2: Click preset or "Thêm mục tiêu"
    setTimeout(() => {
      console.log('Step 2: Clicking Thêm mục tiêu...');
      ws.send(JSON.stringify({
        id: 20,
        method: 'Runtime.evaluate',
        params: {
          returnByValue: true,
          expression: `
            (() => {
              const btns = Array.from(document.querySelectorAll('button'));
              const b = btns.find(x => x.textContent.includes('Tạo Mục Tiêu Mới') || x.textContent.includes('Thêm mục tiêu'));
              if (b) {
                b.click();
                return 'Clicked: ' + b.textContent.trim();
              }
              return 'Button not found';
            })()
          `
        }
      }));
    }, 1600);

    // Step 3: Click "20 Triệu" chip in Target amount
    setTimeout(() => {
      console.log('Step 3: Selecting 20 Triệu chip...');
      ws.send(JSON.stringify({
        id: 25,
        method: 'Runtime.evaluate',
        params: {
          returnByValue: true,
          expression: `
            (() => {
              const btns = Array.from(document.querySelectorAll('button'));
              const b20 = btns.find(x => x.textContent.trim() === '20 Triệu');
              if (b20) {
                b20.click();
                return 'Clicked 20 Triệu chip';
              }
              return '20 Triệu chip not found';
            })()
          `
        }
      }));
    }, 2200);

    // Step 4: Check state
    setTimeout(() => {
      console.log('Step 4: Inspecting modal state...');
      ws.send(JSON.stringify({
        id: 30,
        method: 'Runtime.evaluate',
        params: {
          returnByValue: true,
          expression: `
            (() => {
              const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
                placeholder: i.placeholder,
                value: i.value
              }));
              const badges = Array.from(document.querySelectorAll('span')).map(s => s.textContent.trim()).filter(t => t.includes('VNĐ') || t.includes('Triệu'));
              return { inputs, badges };
            })()
          `
        }
      }));
    }, 2800);

    // Step 5: Capture screenshot
    setTimeout(() => {
      console.log('Step 5: Capturing screenshot...');
      ws.send(JSON.stringify({
        id: 40,
        method: 'Page.captureScreenshot',
        params: { format: 'png' }
      }));
    }, 3300);
  }

  if (data.id === 10) console.log('Step 1:', data.result?.result?.value);
  if (data.id === 20) console.log('Step 2:', data.result?.result?.value);
  if (data.id === 25) console.log('Step 3:', data.result?.result?.value);
  if (data.id === 30) console.log('Step 4 Modal State:', JSON.stringify(data.result?.result?.value, null, 2));

  if (data.id === 40) {
    const base64 = data.result?.data;
    if (base64) {
      const outPath = 'C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\9382d089-8622-4893-bbc5-956edf748516\\luxury_goal_modal.png';
      fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
      console.log('New screenshot saved to:', outPath);
    }
    setTimeout(() => {
      console.log('Done! Total errors:', errors.length);
      process.exit(errors.length > 0 ? 1 : 0);
    }, 300);
  }
};
