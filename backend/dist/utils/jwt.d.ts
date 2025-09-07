import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
export declare const generateToken: (user: User) => string;
export declare const verifyToken: (token: string) => string | jwt.JwtPayload;
export interface TokenPayload {
    userId: string;
    iat: number;
    exp: number;
}
//# sourceMappingURL=jwt.d.ts.map