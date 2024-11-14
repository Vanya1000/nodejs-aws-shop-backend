import { APIGatewayRequestAuthorizerEventV2, PolicyDocument } from 'aws-lambda';

interface AuthResponseV2WithPolicy {
  principalId: string;
  policyDocument: PolicyDocument;
  context?: Record<string, any>;
}

const AUTH_HEADER_KEYS = ['authorization', 'Authorization'];
const BASIC_AUTH_PREFIX = 'Basic ';
const POLICY_VERSION = '2012-10-17';
const DENY_EFFECT: 'Deny' = 'Deny';
const ALLOW_EFFECT: 'Allow' = 'Allow';
const DEFAULT_PRINCIPAL_ID = 'anonymous';

export const handler = async (
  event: APIGatewayRequestAuthorizerEventV2
): Promise<AuthResponseV2WithPolicy> => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    const authorizationToken = extractAuthorizationToken(event.headers);

    if (
      !authorizationToken ||
      !authorizationToken.startsWith(BASIC_AUTH_PREFIX)
    ) {
      console.warn('Missing or invalid Authorization header.');
      return generatePolicy(DEFAULT_PRINCIPAL_ID, event.routeArn, DENY_EFFECT);
    }

    const credentials = parseBasicAuthToken(authorizationToken);
    if (!credentials) {
      console.warn('Failed to parse credentials.');
      return generatePolicy(DEFAULT_PRINCIPAL_ID, event.routeArn, DENY_EFFECT);
    }

    const { username, password } = credentials;
    const isAuthorized = verifyCredentials(username, password);

    const effect = isAuthorized ? ALLOW_EFFECT : DENY_EFFECT;
    const principalId = isAuthorized ? username : DEFAULT_PRINCIPAL_ID;

    return generatePolicy(principalId, event.routeArn, effect);
  } catch (error) {
    console.error('Authorization error:', error);
    return generatePolicy(DEFAULT_PRINCIPAL_ID, event.routeArn, DENY_EFFECT);
  }
};

function extractAuthorizationToken(headers?: {
  [name: string]: string | undefined;
}): string | undefined {
  if (!headers) {
    console.warn('Headers are undefined.');
    return undefined;
  }
  return AUTH_HEADER_KEYS.reduce<string | undefined>(
    (token, key) => token || headers[key],
    undefined
  );
}

interface Credentials {
  username: string;
  password: string;
}

function parseBasicAuthToken(token: string): Credentials | null {
  const encodedCredentials = token.slice(BASIC_AUTH_PREFIX.length).trim();

  try {
    const decoded = Buffer.from(encodedCredentials, 'base64').toString('utf-8');
    const [username, password] = decoded.split(':');

    if (!username || !password) {
      console.warn('Username or password is missing in the credentials.');
      return null;
    }

    return { username, password };
  } catch (error) {
    console.error('Error decoding credentials:', error);
    return null;
  }
}

function verifyCredentials(username: string, password: string): boolean {
  const storedPassword = process.env[username];

  if (!storedPassword) {
    console.warn(`No stored password found for user: ${username}`);
    return false;
  }

  const isMatch = storedPassword === password;
  if (!isMatch) {
    console.warn(`Password mismatch for user: ${username}`);
  }

  return isMatch;
}

function generatePolicy(
  principalId: string,
  resource: string,
  effect: 'Deny' | 'Allow' = DENY_EFFECT
): AuthResponseV2WithPolicy {
  return {
    principalId,
    policyDocument: {
      Version: POLICY_VERSION,
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
  };
}
