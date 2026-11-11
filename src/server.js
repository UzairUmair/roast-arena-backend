import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { assertRuntimeSecrets, env } from './config/env.js';

assertRuntimeSecrets();
await connectDatabase(env.MONGODB_URI);

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`Startup Roast Arena API listening on port ${env.PORT}.`);
});

async function shutdown(signal) {
  console.log(`${signal} received; closing server.`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
