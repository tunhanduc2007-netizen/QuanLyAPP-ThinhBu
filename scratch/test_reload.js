const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/DA103EC0396DC3465CE43844CB9AB088');

ws.onopen = () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
  ws.send(JSON.stringify({ id: 3, method: 'Page.enable' }));

  setTimeout(() => {
    console.log('Triggering Page.reload(ignoreCache: true)...');
    ws.send(JSON.stringify({ id: 4, method: 'Page.reload', params: { ignoreCache: true } }));
  }, 300);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.method === 'Runtime.exceptionThrown') {
    console.error('=== EXCEPTION ON RELOAD ===');
    console.error(JSON.stringify(data.params.exceptionDetails, null, 2));
  }
  if (data.method === 'Runtime.consoleAPICalled') {
    if (data.params.type === 'error') {
      console.error('=== CONSOLE ERROR ===', data.params.args.map(a => a.value || a.description).join(' '));
    } else {
      console.log('CONSOLE:', data.params.type, data.params.args.map(a => a.value || a.description).join(' '));
    }
  }
  if (data.method === 'Page.loadEventFired') {
    console.log('Page loaded!');
    setTimeout(() => {
      ws.send(JSON.stringify({
        id: 5,
        method: 'Runtime.evaluate',
        params: { expression: 'document.body.innerHTML' }
      }));
    }, 1000);
  }
  if (data.id === 5) {
    console.log('BODY LENGTH:', data.result.result.value.length);
    console.log('BODY SNIPPET:', data.result.result.value.slice(0, 500));
    setTimeout(() => process.exit(0), 500);
  }
};
