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
            const items = Array.from(document.querySelectorAll('button, a, div[onclick], div.nav-item, button.nav-item')).map(el => ({
              tag: el.tagName,
              text: el.innerText ? el.innerText.trim().slice(0, 50) : '',
              className: el.className
            })).filter(x => x.text);
            return items;
          })()
        `
      }
    }));
  }, 300);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.method === 'Runtime.exceptionThrown') {
    console.error('EXCEPTION:', JSON.stringify(data.params.exceptionDetails, null, 2));
  }
  if (data.method === 'Runtime.consoleAPICalled') {
    console.error('CONSOLE:', data.params.type, data.params.args.map(a => a.value || a.description).join(' '));
  }
  if (data.id === 3) {
    console.log('ELEMENTS FOUND:', data.result.result.value);
    setTimeout(() => process.exit(0), 500);
  }
};
