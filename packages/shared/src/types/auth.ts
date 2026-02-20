export interface JWTPayload {
  iss?: string;
  sub?: string;
  aud?: string;
  exp: number;
  nbf?: number;
  iat: number;
  jti?: string;
  action: string;
  conversationId: string;
}

export interface UserData {
  appId: string;
  userId: string;
}
