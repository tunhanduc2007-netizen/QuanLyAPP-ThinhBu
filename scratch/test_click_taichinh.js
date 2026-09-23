const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/DA103EC0396DC3465CE43844CB9AB088');

ws.onopen = () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));

  setTimeout(() => {
    ws.send(JSON.stringify({
      id: 3,
      method: 'Runtime.evaluate',
      params: {
        returnByValue: true,
        expression: `
          (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const b = btns.find(x => x.textContent.includes('Tài chính'));
            if (b) {
              b.click();
              return 'Clicked Tài chính button!';
            }
            return 'Button not found';
          })()
        `
      }
    }));
  }, 300);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.method === 'Runtime.exceptionThrown') {
    console.error('=== EXCEPTION THROWN! ===');
    console.error(JSON.stringify(data.params.exceptionDetails, null, 2));
  }
  if (data.method === 'Runtime.consoleAPICalled') {
    if (data.params.type === 'error') {
      console.error('=== CONSOLE ERROR ===', data.params.args.map(a => a.value || a.description).join(' '));
    }
  }
  if (data.id === 3) {
    console.log('CLICK RESULT:', data.result);
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 4,
        method: 'Runtime.evaluate',
        params: { expression: 'document.body.innerHTML' }
      }));
    }, 600);
  }
  if (data.id === 4) {
    console.log('BODY LENGTH AFTER CLICK:', data.result.result.value.length);
    console.log('BODY AFTER CLICK:', data.result.result.value.slice(0, 500));
    setTimeout(() => process.exit(0), 500);
  }
};
