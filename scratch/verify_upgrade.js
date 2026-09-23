const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/DA103EC0396DC3465CE43844CB9AB088');
const fs = require('fs');

let errors = [];

ws.onopen = () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
  ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));

  console.log('Reloading page with fresh v=13 bundle...');
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
    console.log('Page loaded fresh! Testing upgrades...');

    // Step 1: Click "Nạp dữ liệu mẫu 1-click"
    setTimeout(() => {
      console.log('Step 1: Clicking Nạp dữ liệu mẫu 1-click...');
      ws.send(JSON.stringify({
        id: 10,
        method: 'Runtime.evaluate',
        params: {
          returnByValue: true,
          expression: `
            (() => {
              const btns = Array.from(document.querySelectorAll('button'));
              const seedBtn = btns.find(b => b.textContent.includes('dữ liệu mẫu') || b.textContent.includes('Nạp mẫu'));
              if (seedBtn) {
                seedBtn.click();
                return 'Clicked seed demo button: ' + seedBtn.textContent.trim();
              }
              return 'Seed button not found';
            })()
          `
        }
      }));
    }, 1000);

    // Step 2: Inspect Donut Chart & Allocation Bar
    setTimeout(() => {
      console.log('Step 2: Inspecting Donut Chart & Allocation Bar...');
      ws.send(JSON.stringify({
        id: 20,
        method: 'Runtime.evaluate',
        params: {
          returnByValue: true,
          expression: `
            (() => {
              const donutHeader = Array.from(document.querySelectorAll('*')).find(e => e.textContent && e.textContent.includes('Tỷ Trọng Chi Tiêu Tháng'));
              const allocationTexts = Array.from(document.querySelectorAll('*')).filter(e => e.textContent && (e.textContent.includes('Tiền mặt (') || e.textContent.includes('Ngân hàng ('))).map(e => e.textContent.trim());
              const donutSegments = document.querySelectorAll('svg circle[stroke-dasharray]').length;
              return {
                hasDonut: !!donutHeader,
                donutSegments,
                allocationTexts: allocationTexts.slice(0, 3)
              };
            })()
          `
        }
      }));
    }, 2000);

    // Step 3: Capture full screenshot with Demo data & Donut chart
    setTimeout(() => {
      console.log('Step 3: Capturing upgraded dashboard screenshot...');
      ws.send(JSON.stringify({
        id: 30,
        method: 'Page.captureScreenshot',
        params: { format: 'png' }
      }));
    }, 2600);
  }

  if (data.id === 10) console.log('Step 1 Result:', data.result?.result?.value);
  if (data.id === 20) console.log('Step 2 Inspection:', JSON.stringify(data.result?.result?.value, null, 2));

  if (data.id === 30) {
    const base64 = data.result?.data;
    if (base64) {
      const outPath = 'C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\9382d089-8622-4893-bbc5-956edf748516\\upgraded_dashboard_demo.png';
      fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
      console.log('Saved upgraded screenshot to:', outPath);
    }
    setTimeout(() => {
      console.log('Verification done. Total errors:', errors.length);
      process.exit(errors.length > 0 ? 1 : 0);
    }, 300);
  }
};
