import fastify from 'fastify';
import { config } from 'dotenv';
import loginRoutesLinkedin from './login'
import callbackRoutesLinkedin from './callback';

config();
const app = fastify({ logger: true });
app.register(loginRoutesLinkedin);
app.register(callbackRoutesLinkedin);

app.listen({ port: Number(process.env.PORT || 5500), host: 'localhost' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening on ${address}`);
});