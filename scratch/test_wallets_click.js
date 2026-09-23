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
            const elements = Array.from(document.querySelectorAll('*'));
            const el = elements.find(e => e.children.length === 0 && e.textContent.includes('Tài chính & Ngân sách'));
            if (el) {
              const clickable = el.closest('[onclick]') || el.parentElement?.parentElement || el;
              clickable.click();
              return 'Found text node, clicked: ' + clickable.tagName + ' | ' + clickable.className;
            }
            return 'Text not found';
          })()
        `
      }
    }));
  }, 500);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.method === 'Runtime.exceptionThrown') {
    console.error('=== RUNTIME EXCEPTION CAUGHT! ===');
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
    console.log('BODY LENGTH AFTER CLICK:', data.result?.result?.value?.length);
    console.log('BODY CONTENT:', data.result?.result?.value?.slice(0, 300));
    setTimeout(() => process.exit(0), 500);
  }
};
