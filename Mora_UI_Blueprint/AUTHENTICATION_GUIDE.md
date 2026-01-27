# Mora-UI Authentication – Full Guide

## Overview
Mora-UI uses JWT (JSON Web Token) authentication to communicate with the Saimôr Core API. The token is passed in the `Authorization` header as a Bearer token for all API requests.

## Configuration
The JWT is configured in the `.env.local` file using the `NEXT_PUBLIC_SAIMOR_CORE_JWT` variable.

```env
NEXT_PUBLIC_SAIMOR_CORE_URL=http://localhost:8081
NEXT_PUBLIC_SAIMOR_CORE_JWT=eyJhbGciOiJIUzI1NiIsIn...
```

## Authentication Flow
1. **Initialization**: When the application starts, `coreClient.ts` initializes the API client.
2. **Token Loading**: It attempts to load the JWT from the environment variable.
3. **Validation**: The token is checked for existence and basic format.
4. **Fallback (Dev Mode)**: If no token is present and the app is in development mode, a temporary "UI-System" token may be generated (if configured) to allow limited access or UI testing without a backend connection (mock mode) or if the backend accepts such tokens for specific endpoints.
5. **Request Interception**: All requests to `coreGet` or `corePost` automatically attach the token.

## Token Generation (Development)
For development, you can generate a valid token using the `saimor-core` scripts or the provided PowerShell script `update_jwt.ps1`.

## Security
- Never commit `.env.local` to version control.
- The `NEXT_PUBLIC_SAIMOR_CORE_JWT` is exposed to the browser, so it should be a token with appropriate scopes for the frontend user, not a root admin token if possible (though for this single-user prototype, owner tokens are often used).

## Troubleshooting
- **Missing Token**: Ensure `.env.local` exists and has the correct variable name.
- **Invalid Token**: If the API returns 401/403, the token might be expired or have the wrong tenant. Run `update_jwt.ps1` to refresh.
