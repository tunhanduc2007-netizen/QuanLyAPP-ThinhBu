const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/DA103EC0396DC3465CE43844CB9AB088');
const expr = process.argv[2] || 'document.title';

ws.onopen = () => {
  ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
  ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));

  setTimeout(() => {
    ws.send(JSON.stringify({
      id: 3,
      method: 'Runtime.evaluate',
      params: {
        returnByValue: true,
        expression: expr
      }
    }));
  }, 200);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.method === 'Runtime.exceptionThrown') {
    console.error('EXCEPTION:', JSON.stringify(data.params.exceptionDetails, null, 2));
  }
  if (data.method === 'Runtime.consoleAPICalled') {
    if (data.params.type === 'error') {
      console.error('CONSOLE_ERROR:', data.params.args.map(a => a.value || a.description).join(' '));
    }
  }
  if (data.id === 3) {
    console.log('RESULT:', JSON.stringify(data.result?.result?.value, null, 2));
    setTimeout(() => process.exit(0), 300);
  }
};
