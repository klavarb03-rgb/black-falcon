import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRoles } from '../middleware/rbac';
import { getUsers, getUserById, createUser, updateUser } from '../controllers/userController';

const router = Router();

// All user routes require a valid JWT
router.use(authenticate);

// GET /api/users - list all users (admin and leader)
router.get('/', requireRoles('admin', 'leader'), getUsers);

// GET /api/users/:id - get a user by id (admin and leader)
router.get('/:id', requireRoles('admin', 'leader'), getUserById);

// POST /api/users - create a new user (admin only)
router.post('/', requireRoles('admin'), createUser);

// PUT /api/users/:id - update a user (admin and leader)
router.put('/:id', requireRoles('admin', 'leader'), updateUser);

export default router;
