import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';

export const generateToken = (user: User): string => {
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  const payload = { userId: user.id };
  const options: any = { expiresIn: process.env.JWT_EXPIRE || '7d' };
  
  return jwt.sign(payload, secret, options) as string;
};

export const verifyToken = (token: string) => {
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  return jwt.verify(token, secret);
};

export interface TokenPayload {
  userId: string;
  iat: number;
  exp: number;
}