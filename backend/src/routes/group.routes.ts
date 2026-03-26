import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  moveItems,
} from '../controllers/groupController';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'leader', 'manager'), getGroups);
router.post('/', authorize('admin', 'leader', 'manager'), createGroup);
router.put('/:id', authorize('admin', 'leader', 'manager'), updateGroup);
router.delete('/:id', authorize('admin', 'leader', 'manager'), deleteGroup);
router.put('/:id/move', authorize('admin', 'leader', 'manager'), moveItems);

export default router;
