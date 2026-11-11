const http = require('http');

const PORT = 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Localhost Test Server</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background-color: #0f172a;
          color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: #1e293b;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.4);
          max-width: 500px;
        }
        h1 {
          color: #6366f1;
          margin-bottom: 12px;
        }
        p {
          color: #94a3b8;
          line-height: 1.6;
        }
        .badge {
          display: inline-block;
          background: #22c55e;
          color: #000;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 12px;
          margin-bottom: 16px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <span class="badge">Connected</span>
        <h1>Localhost 3000 Active!</h1>
        <p>If you see this page, AMIYO Browser successfully navigated to and rendered your local web server running at <strong>http://localhost:3000</strong>.</p>
      </div>
    </body>
    </html>
  `);
});

server.listen(PORT, () => {
  console.log(`Localhost test server running at http://localhost:${PORT}`);
});

