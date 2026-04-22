import { PrismaClient } from './lib/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Configure PostgreSQL connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Instantiate the Prisma PG adapter
const adapter = new PrismaPg(pool);

// Initialize Prisma Client with the adapter
export const db = new PrismaClient({ adapter });
