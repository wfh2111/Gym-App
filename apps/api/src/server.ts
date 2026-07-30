import { buildApp } from './app';
import { env } from './lib/env';
import { startScheduler } from './jobs/scheduler';

async function main() {
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`gym-app api listening on :${env.PORT}`);
    startScheduler(app.log);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
