import { FastifyInstance } from 'fastify';

import jwt from 'jsonwebtoken';
import { adminSdk, QELOS_APP_URL } from './sdk';
import QelosSDK from '@qelos/sdk';
import crypto from 'crypto';
import passwordGenerator from 'password-generator';
import { config } from 'dotenv';

config();

const clientId = process.env.LINKEDIN_CLIENT_ID;
const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

function generateSecurePassword(length: number): string {
	return passwordGenerator(length, false, /[a-zA-Z0-9]/);
}

function hashPassword(password: string): string {
	return crypto.createHash('sha256').update(password).digest('hex');
}

export default async function callbackRoutesLinkedin(app: FastifyInstance) {
	app.get('/api/auth/callback/linkedin', async (request, reply) => {
		const { code } = request.query as { code?: string };

		if (!code) {
			return reply.status(400).send({ error: 'Authorization code is missing' });
		}

		const tokenUrl = `https://www.linkedin.com/oauth/v2/accessToken`;
		const bodyParams = new URLSearchParams({
			grant_type: 'authorization_code',
			code: code,
			redirect_uri: redirectUri || '',
			client_id: clientId || '',
			client_secret: clientSecret || '',
		});

		try {
			const tokenResponse = await fetch(tokenUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: bodyParams.toString(),
			});

			if (!tokenResponse.ok) {
				return reply.status(500).send({ error: 'Failed to retrieve access token' });
			}

			const tokenData = await tokenResponse.json();
			const idToken = tokenData.id_token;
			let userData;

			try {
				userData = jwt.decode(idToken);
				if (!userData || !userData.email) {
					throw new Error('Invalid token data: missing email');
				}
			} catch (error) {
				return reply.status(500).send({ error: 'Failed to decode token' });
			}

			const email = userData.email;
			const firstName = userData.given_name;
			const lastName = userData.family_name;

			const newSdk = new QelosSDK({ fetch: fetch, appUrl: QELOS_APP_URL });
			let authData;

			const randomPassword = generateSecurePassword(16);
			const hashedPassword = hashPassword(randomPassword);

			try {
				authData = await newSdk.authentication.oAuthSignin({ username: email, password: hashedPassword });
			} catch (err) {
				await adminSdk.users.create({
					email,
					roles: ['user'],
					username: email,
					password: hashedPassword,
					firstName: firstName || 'FirstName',
					lastName: lastName || 'LastName',
				});

				authData = await newSdk.authentication.oAuthSignin({ username: email, password: hashedPassword });
			}

			const redirectUrl = `${QELOS_APP_URL}/auth/callback?rt=${authData.payload.refreshToken}`;

			reply.redirect(redirectUrl);
		} catch (error) {
			reply.status(500).send({ error: 'Failed to retrieve access token from LinkedIn' });
		}
	});
}