import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getInventoryReport,
  getOperationsReport,
  getSummaryReport,
  getDonorReport,
  getOffBalanceReport,
} from '../controllers/reportController';

const router = Router();

router.use(authenticate);

router.get('/inventory', authorize('admin', 'leader', 'manager'), getInventoryReport);
router.get('/operations', authorize('admin', 'leader', 'manager'), getOperationsReport);
router.get('/summary', authorize('admin', 'leader', 'manager'), getSummaryReport);
router.get('/donors', authorize('admin', 'leader'), getDonorReport);
router.get('/off-balance', authorize('admin', 'leader', 'manager'), getOffBalanceReport);

export default router;
