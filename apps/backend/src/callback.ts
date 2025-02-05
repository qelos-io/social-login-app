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

    let tokenData;
    let idToken;
    let userData: any;
    let redirectUrl;

    try {
      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
      });


      tokenData = await tokenResponse.json();
      idToken = tokenData.id_token;

      if (!tokenResponse.ok) {
        return reply.status(500).send({ error: 'Failed to retrieve access token' });
      }
    } catch (error) {
      reply.status(500).send({ error: 'Failed to retrieve access token from LinkedIn' });
    }

    try {
      userData = jwt.decode(idToken);
      if (!userData || !userData.email) {
        throw new Error('Invalid token data: missing email');
      }
    } catch (error) {
      return reply.status(500).send({ error: 'Failed to decode token' });
    }

    const email = userData.email;

    if (!email) {
      return reply.status(500).send({ error: 'Failed to get email from linkedin' });
    }

    const firstName = userData.given_name;
    const lastName = userData.family_name;
    const newSdk = new QelosSDK({ fetch: fetch, appUrl: QELOS_APP_URL });
    const randomPassword = generateSecurePassword(16);
    const hashedPassword = hashPassword(randomPassword);
    let step = 0;

    try {
      step = 1;
      const [existingUser] = await adminSdk.users.getList({ username: email, exact: true });
      step = 2;
      if (existingUser) {
        const metadata = userData || {}
        await Promise.all([
          adminSdk.users.update(existingUser._id, {
            password: hashedPassword,
            internalMetadata: metadata,
            profileImage: userData?.picture,
          }),
          adminSdk.users.setEncryptedData(existingUser._id, 'linkedinToken', tokenData)
        ]);
        step = 3;
      } else {
        step = 4;
        const newUser = await adminSdk.users.create({
          email,
          roles: ['user'],
          username: email,
          password: hashedPassword,
          firstName: firstName || 'FirstName',
          lastName: lastName || 'LastName',
          profileImage: userData?.picture,
          metadata: {},
          internalMetadata: { ...userData }
        });
        step = 5;
        await adminSdk.users.setEncryptedData(newUser._id, 'linkedinToken', tokenData);
        step = 6;
      }
    } catch (err) {
      return reply.status(500).send({
        error: 'Failed to create or update the user for email ***@' + email.split('@')[1],
        step
      });
    }

    try {
      step = 7;
      const authData = await newSdk.authentication.oAuthSignin({ username: email, password: hashedPassword });
      step = 8;
      if (authData.payload.refreshToken) {
        redirectUrl = `${QELOS_APP_URL}/auth/callback?rt=${authData.payload.refreshToken}`;
      }
    } catch (err) {
      return reply.status(500).send({ error: 'Failed to authenticate the user', step });
    }

    if (!redirectUrl) {
      return reply.status(500).send({ error: 'failed to login to qelos after linkedin auth as ' + firstName });
    }

    reply.redirect(redirectUrl);
  });
}