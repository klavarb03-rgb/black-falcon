import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getDonors,
  createDonor,
  updateDonor,
  deleteDonor,
  getDonorReport,
} from '../controllers/donorController';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin', 'leader', 'manager'), getDonors);
router.post('/', authorize('admin', 'leader'), createDonor);
router.put('/:id', authorize('admin', 'leader'), updateDonor);
router.delete('/:id', authorize('admin', 'leader'), deleteDonor);
router.get('/:id/report', authorize('admin', 'leader', 'manager'), getDonorReport);

export default router;
