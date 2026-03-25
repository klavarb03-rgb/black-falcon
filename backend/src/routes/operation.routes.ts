import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  validateTransferOperation,
  validateWriteoffOperation,
} from '../validators/operation.validator';
import {
  createTransfer,
  createWriteoff,
  getOperations,
  getOperationById,
} from '../controllers/operationController';

const router = Router();

router.use(authenticate);

// POST /api/operations/transfer — create a transfer between users
router.post(
  '/transfer',
  authorize('admin', 'leader'),
  validateTransferOperation,
  createTransfer
);

// POST /api/operations/writeoff — write off item quantity (used or lost)
router.post(
  '/writeoff',
  authorize('admin', 'leader'),
  validateWriteoffOperation,
  createWriteoff
);

// GET /api/operations — list operations (filterable by ?type= or ?itemId=)
router.get('/', authorize('admin', 'leader', 'manager'), getOperations);

// GET /api/operations/:id — get single operation
router.get('/:id', authorize('admin', 'leader', 'manager'), getOperationById);

export default router;
