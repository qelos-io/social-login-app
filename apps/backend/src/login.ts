import { FastifyInstance } from 'fastify';
require('dotenv').config();

const clientId = process.env.LINKEDIN_CLIENT_ID;
const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);


export default async function loginRoutesLinkedin(app: FastifyInstance) {
	app.post('/api/login', (request, reply) => {
		if (!clientId || !redirectUri) {
			return reply.status(500).send({ error: 'Missing LinkedIn Client ID or Redirect URI in environment variables' });
		}

		const encodedRedirectUri = encodeURIComponent(redirectUri);
		const authorizationUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=openid%20email%20profile&state=${state}`;

		reply.send({ redirectUrl: authorizationUrl });
	});

}