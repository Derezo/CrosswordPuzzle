import 'express';
import type { User as PrismaUser } from '@prisma/client';

declare module 'express-serve-static-core' {
  interface Request {
    user?: PrismaUser;
  }
}
