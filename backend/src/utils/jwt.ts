import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '@prisma/client';
import { optionalEnv, requireEnv } from './env';

export interface TokenPayload {
  userId: string;
  iat: number;
  exp: number;
}

export const generateToken = (user: User): string => {
  const secret = requireEnv('JWT_SECRET');
  const payload = { userId: user.id };
  const options: SignOptions = {
    expiresIn: optionalEnv('JWT_EXPIRE', '7d') as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, secret, options);
};

export const verifyToken = (token: string): TokenPayload => {
  const secret = requireEnv('JWT_SECRET');
  return jwt.verify(token, secret) as TokenPayload;
};
