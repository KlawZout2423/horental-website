import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import jwt from 'jsonwebtoken';

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
});

import { NextRequest } from 'next/server';

const apolloHandler = startServerAndCreateNextHandler(server, {
  context: async (req) => {
    const headers = req.headers;
    let authHeader: string | null = null;
    if (headers && typeof (headers as any).get === 'function') {
      authHeader = (headers as any).get('authorization');
    } else if (headers) {
      const auth = (headers as any)['authorization'];
      authHeader = Array.isArray(auth) ? auth[0] : auth || null;
    }
    const token = authHeader?.replace('Bearer ', '') || '';
    if (!token) return { user: null };

    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'horentals-super-secret-jwt-key-2026';
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      return { user: { id: decoded.id } };
    } catch (e) {
      return { user: null };
    }
  },
});

export async function GET(request: NextRequest) {
  return apolloHandler(request);
}

export async function POST(request: NextRequest) {
  return apolloHandler(request);
}
export const dynamic = 'force-dynamic';
