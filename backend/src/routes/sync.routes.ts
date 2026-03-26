import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getSyncStatus, pushSync, pullSync } from '../controllers/syncController';

const router = Router();

router.use(authenticate);

router.get('/status', authorize('admin', 'leader', 'manager'), getSyncStatus);
router.post('/push', authorize('admin', 'leader', 'manager'), pushSync);
router.get('/pull', authorize('admin', 'leader', 'manager'), pullSync);

export default router;
