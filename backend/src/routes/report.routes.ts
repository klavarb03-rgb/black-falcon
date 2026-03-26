import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getInventoryReport,
  getOperationsReport,
  getSummaryReport,
  getDonorReport,
  getOffBalanceReport,
  exportItemsExcel,
  exportItemsPdf,
} from '../controllers/reportController';

const router = Router();

router.use(authenticate);

router.get('/inventory', authorize('admin', 'leader', 'manager'), getInventoryReport);
router.get('/operations', authorize('admin', 'leader', 'manager'), getOperationsReport);
router.get('/summary', authorize('admin', 'leader', 'manager'), getSummaryReport);
router.get('/donors', authorize('admin', 'leader'), getDonorReport);
router.get('/off-balance', authorize('admin', 'leader', 'manager'), getOffBalanceReport);

// МЦ Export endpoints
router.get('/export/excel', authorize('admin', 'leader', 'manager'), exportItemsExcel);
router.get('/export/pdf', authorize('admin', 'leader', 'manager'), exportItemsPdf);

export default router;
