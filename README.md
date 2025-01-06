# Sample Login to Qelos

## guide

confure those variables:
```
LINKEDIN_CLIENT_ID=
LINKEDIN_REDIRECT_URI=http://localhost:5173/api/auth/callback/linkedin
LINKEDIN_CLIENT_SECRET=
QELOS_APP_URL=
QELOS_PASSWORD=
QELOS_USERNAME=
PORT=5500
```

```sh
$ pnpm i -r
$ pnpm dev
```

The frontend is a basic form.
the backend takes the username, adds mydomain.com, and decide if the user needs to be added or loggedin directly.
after that, it redirects the user the qelos app.
