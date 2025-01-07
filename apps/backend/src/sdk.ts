import QelosAdministratorSDK from '@qelos/sdk/dist/administrator';

require('dotenv').config();

export const QELOS_APP_URL = process.env.QELOS_APP_URL || 'http://localhost:3000/';
const PASSWORD = process.env.QELOS_PASSWORD as string;
const USERNAME = process.env.QELOS_USERNAME as string;

// Check if the environment variables are defined
if (!process.env.QELOS_APP_URL || !process.env.QELOS_USERNAME || !process.env.QELOS_PASSWORD) {
  throw new Error('Environment variables QELOS_APP_URL, QELOS_USERNAME, and QELOS_PASSWORD must be defined');
}

export const adminSdk = new QelosAdministratorSDK({ fetch: fetch, appUrl: QELOS_APP_URL });

console.log('login to qelos', QELOS_APP_URL);
adminSdk.authentication.oAuthSignin({ username: USERNAME, password: PASSWORD })
  .then(() => {
    console.log('signin success to qelos');
  })
  .catch((err) => {
    console.error('signin failed:', err);
  });