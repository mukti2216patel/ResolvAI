import type { Response } from 'express';
import { db as prisma } from '../db';
import type { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '../types';
import { auth } from '../auth';
import { createUserSchema, updateUserSchema } from 'core';
import { mapTicket } from '../lib/ticket-mapper';

export const UserController = {
  async getUsers(req: AuthenticatedRequest, res: Response) {
    // 1. Authorization Check: Only ADMIN can access this endpoint
    if (req.user?.role !== UserRole.ADMIN) {
      res.status(403).json({ error: 'Forbidden: Administrator access required' });
      return;
    }

    // 2. Fetch users from database, excluding soft-deleted users
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        email: { not: 'ai@example.com' },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(users);
  },

  async createUser(req: AuthenticatedRequest, res: Response) {
    // 1. Authorization Check: Only ADMIN can create users
    if (req.user?.role !== UserRole.ADMIN) {
      res.status(403).json({ error: 'Forbidden: Administrator access required' });
      return;
    }

    // 2. Server-side validation using Zod
    const validatedData = createUserSchema.parse(req.body);

    // 3. Create the user using better-auth admin API (bypasses disableSignUp)
    const newUser = await auth.api.createUser({
      body: {
        name: validatedData.name,
        email: validatedData.email.toLowerCase(),
        password: validatedData.password,
      },
    });

    // 4. Set the role to AGENT via Prisma (bypassing better-auth's restricted role types)
    await prisma.user.update({
      where: { id: newUser.user.id },
      data: { role: UserRole.AGENT },
    });

    res.status(201).json(newUser.user);
  },

  async updateUser(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    // 1. Authorization Check: Only ADMIN can update users
    if (req.user?.role !== UserRole.ADMIN) {
      res.status(403).json({ error: 'Forbidden: Administrator access required' });
      return;
    }

    // 2. Server-side validation
    const validatedData = updateUserSchema.parse(req.body);

    // 3. Email Uniqueness Check (excluding current user)
    const existingUser = await prisma.user.findFirst({
      where: {
        email: validatedData.email.toLowerCase(),
        NOT: { id },
      },
    });

    if (existingUser) {
      res.status(400).json({ error: 'Email is already in use by another user' });
      return;
    }

    // 4. Update Basic Profile
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name: validatedData.name,
        email: validatedData.email.toLowerCase(),
      },
    });

    // 5. Optional Password Update (via better-auth admin API)
    if (validatedData.password !== '') {
      try {
        await auth.api.setUserPassword({
          body: {
            userId: id,
            newPassword: validatedData.password,
          },
          headers: req.headers,
        });
      } catch (err: any) {
        console.error('DEBUG: Password update failed:', err);
        throw err;
      }
    }

    res.json(updatedUser);
  },

  async deleteUser(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    // 1. Authorization Check: Only ADMIN can delete users
    if (req.user?.role !== UserRole.ADMIN) {
      res.status(403).json({ error: 'Forbidden: Administrator access required' });
      return;
    }

    // 2. Check if user exists and is not an admin
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.role === UserRole.ADMIN) {
      res.status(403).json({ error: 'Administrative accounts cannot be deleted' });
      return;
    }

    // 3. Soft delete the user, unassign their tickets, and revoke sessions
    await prisma.$transaction([
      prisma.ticket.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null },
      }),
      prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      prisma.session.deleteMany({
        where: { userId: id },
      }),
    ]);

    res.json({ message: 'User successfully deleted' });
  },

  async restoreUser(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;

    // 1. Authorization Check: Only ADMIN can restore users
    if (req.user?.role !== UserRole.ADMIN) {
      res.status(403).json({ error: 'Forbidden: Administrator access required' });
      return;
    }

    // 2. Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (req.body.deletedAt !== null) {
      res.status(400).json({ error: 'Invalid request: deletedAt must be set to null to restore' });
      return;
    }

    // 3. Wrap restore logic in transaction
    const tickets = await prisma.ticket.findMany({
      where: { assignedToId: id },
      select: { id: true },
    });
    const ticketIds = tickets.map((t) => t.id);

    const [_, restoredUser, updatedTickets] = await prisma.$transaction([
      prisma.ticket.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null },
      }),
      prisma.user.update({
        where: { id },
        data: { deletedAt: null },
      }),
      prisma.ticket.findMany({
        where: { id: { in: ticketIds } },
        include: { user: true, assignedTo: true },
      }),
    ]);

    res.json({
      user: restoredUser,
      tickets: updatedTickets.map(mapTicket),
    });
  },
};
