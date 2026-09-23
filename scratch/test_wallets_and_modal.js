const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/DA103EC0396DC3465CE43844CB9AB088');
const fs = require('fs');

let errors = [];

ws.onopen = () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
  ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));

  // Step 1: Navigate to Wallets page
  setTimeout(() => {
    console.log('Navigating to Wallets tab...');
    ws.send(JSON.stringify({
      id: 10,
      method: 'Runtime.evaluate',
      params: {
        returnByValue: true,
        expression: `
          (() => {
            // Find element that has onClick that sets activeTab to wallets
            const clickable = Array.from(document.querySelectorAll('div, button, span')).find(el => {
              const text = el.textContent || '';
              return (text.includes('Ví & Ngân sách') && el.tagName === 'DIV' && el.className.includes('hero-balance-card')) ||
                     (text.includes('Mở ví') && el.parentElement && el.parentElement.getAttribute('style')?.includes('cursor: pointer'));
            });

            if (clickable) {
              clickable.click();
              return 'Clicked: ' + clickable.className;
            }
            
            // Fallback: click the hero card directly
            const hero = document.querySelector('.hero-balance-card');
            if (hero) {
              hero.click();
              return 'Clicked hero-balance-card';
            }
            return 'Not found';
          })()
        `
      }
    }));
  }, 1000);

  // Step 2: Capture Wallets page
  setTimeout(() => {
    console.log('Capturing Wallets screen...');
    ws.send(JSON.stringify({
      id: 20,
      method: 'Page.captureScreenshot',
      params: { format: 'png' }
    }));
  }, 2000);

  // Step 3: Open "Mục tiêu mới" modal to verify luxury input formatting
  setTimeout(() => {
    console.log('Opening Mục tiêu mới modal...');
    ws.send(JSON.stringify({
      id: 30,
      method: 'Runtime.evaluate',
      params: {
        returnByValue: true,
        expression: `
          (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const addGoalBtn = btns.find(b => b.textContent && (b.textContent.includes('Thêm mục tiêu') || b.textContent.includes('+ Mục tiêu')));
            if (addGoalBtn) {
              addGoalBtn.click();
              return 'Clicked add goal button';
            }
            return 'Add goal button not found. Total buttons: ' + btns.length;
          })()
        `
      }
    }));
  }, 2800);

  // Step 4: Type an amount into the target amount field (e.g. 50000000) to see live Vietnamese words badge
  setTimeout(() => {
    console.log('Typing 50000000 into target amount field...');
    ws.send(JSON.stringify({
      id: 40,
      method: 'Runtime.evaluate',
      params: {
        returnByValue: true,
        expression: `
          (() => {
            const inputs = Array.from(document.querySelectorAll('input'));
            const amountInput = inputs.find(i => i.placeholder && (i.placeholder.includes('0 ₫') || i.type === 'text' && i.inputMode === 'numeric'));
            if (amountInput) {
              // React 18 controlled input trigger
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              nativeInputValueSetter.call(amountInput, '50000000');
              amountInput.dispatchEvent(new Event('input', { bubbles: true }));
              return 'Typed 50000000. Current value: ' + amountInput.value;
            }
            return 'Amount input not found';
          })()
        `
      }
    }));
  }, 3600);

  // Step 5: Capture Goal modal screenshot
  setTimeout(() => {
    console.log('Capturing Goal modal screenshot...');
    ws.send(JSON.stringify({
      id: 50,
      method: 'Page.captureScreenshot',
      params: { format: 'png' }
    }));
  }, 4400);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.method === 'Runtime.exceptionThrown') {
    console.error('FATAL EXCEPTION:', JSON.stringify(data.params.exceptionDetails, null, 2));
    errors.push(data.params.exceptionDetails);
  }
  if (data.id === 10) console.log('Step 1:', data.result?.result?.value);
  if (data.id === 30) console.log('Step 3:', data.result?.result?.value);
  if (data.id === 40) console.log('Step 4:', data.result?.result?.value);

  if (data.id === 20) {
    const base64 = data.result?.data;
    if (base64) {
      const outPath = 'C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\9382d089-8622-4893-bbc5-956edf748516\\wallets_page_active.png';
      fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
      console.log('Saved Wallets page screenshot to:', outPath);
    }
  }

  if (data.id === 50) {
    const base64 = data.result?.data;
    if (base64) {
      const outPath = 'C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\9382d089-8622-4893-bbc5-956edf748516\\luxury_goal_modal.png';
      fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
      console.log('Saved Goal Modal screenshot to:', outPath);
    }
    setTimeout(() => {
      console.log('All verification steps completed. Errors:', errors.length);
      process.exit(errors.length > 0 ? 1 : 0);
    }, 300);
  }
};
