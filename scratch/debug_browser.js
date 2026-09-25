const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/A1933E7C0A58E5731CA0715C4FA060FD');
ws.onopen = () => {
  ws.send(JSON.stringify({
    id: 1,
    method: 'Runtime.evaluate',
    params: {
      expression: 'Array.from(document.querySelectorAll("script")).map(s => s.src)'
    }
  }));
};
ws.onmessage = (e) => {
  const d = JSON.parse(e.data);
  console.log(d.result?.result?.value);
  process.exit(0);
};
