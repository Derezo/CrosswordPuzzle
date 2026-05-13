/* eslint-disable @typescript-eslint/no-require-imports */
// PM2 entrypoint for the production Next.js server.
//
// PM2 in fork mode loads `script` via `require()`. The actual `next` CLI
// (node_modules/next/dist/bin/next) is a shebang script with no extension,
// which PM2's loader can't resolve — hence this wrapper. We pass through to
// Next's programmatic startServer so the same code path as `next start`
// runs without spawning a child process.
//
// Port is read from $PORT (PM2 injects it from .env.production) and falls
// back to 3001 (the deploy.yaml's runtime.port). Hostname binds to all
// interfaces so nginx on localhost can reach it.

const { startServer } = require('next/dist/server/lib/start-server.js');

const port = parseInt(process.env.PORT || '3001', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';
const dir = __dirname;

startServer({
  dir,
  hostname,
  port,
  isDev: false,
}).catch((err) => {
  console.error('next: startServer failed', err);
  process.exit(1);
});
