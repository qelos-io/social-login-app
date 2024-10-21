import fastify from 'fastify';

import { adminSdk, QELOS_APP_URL } from './sdk';
import QelosSDK from '@qelos/sdk';
import jwt from 'jsonwebtoken';
require('dotenv').config();

const app = fastify({ logger: true });
const clientId = process.env.LINKEDIN_CLIENT_ID;
const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

app.get('/api/login', (request, reply) => {

  if (!clientId || !redirectUri) {
    console.error('Missing LinkedIn Client ID or Redirect URI');
    return reply.status(500).send({ error: 'Missing LinkedIn Client ID or Redirect URI in environment variables' });
  }

  const encodedRedirectUri = encodeURIComponent(redirectUri);
  const authorizationUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodedRedirectUri}&scope=openid%20email%20profile&state=${state}`;

  reply.send({ redirectUrl: authorizationUrl });
});

app.get('/api/auth/callback', async (request, reply) => {
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
      console.error('Error fetching access token');
      return reply.status(500).send({ error: 'Failed to retrieve access token' });
    }

    const tokenData = await tokenResponse.json();
    console.log('Token response:', tokenData);

    const idToken = tokenData.id_token;
    let userData;

    try {
      userData = jwt.decode(idToken);
      if (!userData || !userData.email) {
        throw new Error('Invalid token data: missing email');
      }
    } catch (error) {
      console.error('Error decoding token:', error);
      return reply.status(500).send({ error: 'Failed to decode token' });
    }

    const email = userData.email;
    const firstName = userData.given_name;
    const lastName = userData.family_name;

    const newSdk = new QelosSDK({ fetch: fetch, appUrl: QELOS_APP_URL });
    let authData;

    try {
      authData = await newSdk.authentication.oAuthSignin({ username: email, password: 'dummyPassword' });
    } catch (err) {
      console.log('User not found, creating new user in Qelos');
      await adminSdk.users.create({
        email,
        roles: ['user'],
        username: email,
        password: 'dummyPassword',
        firstName: firstName || 'FirstName',
        lastName: lastName || 'LastName',
      });

      authData = await newSdk.authentication.oAuthSignin({ username: email, password: 'dummyPassword' });
    }

    const redirectUrl = `${QELOS_APP_URL}/auth/callback?rt=${authData.payload.refreshToken}`;

    reply.redirect(redirectUrl);
  } catch (error) {
    console.error('Failed to retrieve access token from LinkedIn:', error);
    reply.status(500).send({ error: 'Failed to retrieve access token from LinkedIn' });
  }
});

app.listen({ port: Number(process.env.PORT || 5500), host: 'localhost' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening on ${address}`);
});
