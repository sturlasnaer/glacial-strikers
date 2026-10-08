// Local leaderboard server for testing (same request handling as the Lambda, scores kept
// in memory):  node tools/leaderboard_server.mjs [port]   then set ?lb=http://127.0.0.1:8790
import { createServer } from 'http';
import { handle, memoryStore, MAX_SAVE_BODY } from '../server/leaderboard.mjs';

export function startServer(port = 8790, store = memoryStore()) {
  const srv = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > MAX_SAVE_BODY) break; }
    const out = body.length > MAX_SAVE_BODY ? { status: 413, body: { error: 'too big' } }
      : await handle({ method: req.method, query: Object.fromEntries(url.searchParams), body }, store);
    res.writeHead(out.status, {
      'content-type': 'application/json', 'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type',
    });
    res.end(JSON.stringify(out.body));
  });
  return new Promise((resolve) => srv.listen(port, '127.0.0.1', () => resolve(srv)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = +(process.argv[2] || 8790);
  await startServer(port);
  console.log(`leaderboards on http://127.0.0.1:${port}`);
}
