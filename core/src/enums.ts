/**
 * UserRole — single source of truth, shared by server and client via the `core` package.
 * Values must stay in sync with the Prisma `UserRole` enum in schema.prisma.
 */
export enum UserRole {
  ADMIN = 'admin',
  AGENT = 'agent',
}
