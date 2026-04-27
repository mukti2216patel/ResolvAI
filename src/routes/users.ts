import { Router } from 'express';
import { asyncHandler } from '../middleware/async-handler';
import { UserController } from '../controllers/user.controller';

export const userRouter = Router();

// GET /api/users
userRouter.get('/', asyncHandler(UserController.getUsers));

// POST /api/users
userRouter.post('/', asyncHandler(UserController.createUser));

// PUT /api/users/:id
userRouter.put('/:id', asyncHandler(UserController.updateUser));

// DELETE /api/users/:id
userRouter.delete('/:id', asyncHandler(UserController.deleteUser));

// PATCH /api/users/:id
userRouter.patch('/:id', asyncHandler(UserController.restoreUser));

