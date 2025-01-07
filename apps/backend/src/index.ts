import fastify from 'fastify';
import { config } from 'dotenv';
import loginRoutesLinkedin from './login'
import callbackRoutesLinkedin from './callback';
import * as path from 'node:path';
import { existsSync } from 'node:fs';

config();
const app = fastify({ logger: true });
app.register(loginRoutesLinkedin);
app.register(callbackRoutesLinkedin);

const dist = path.join(__dirname, '../../frontend/dist')

if (existsSync(dist)) {
  console.log('Serving static files from dist folder');
  app.register(require('@fastify/static'), {
    root: dist
  });
}

app.listen({ port: Number(process.env.PORT || 5500), host: 'localhost' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening on ${address}`);
});