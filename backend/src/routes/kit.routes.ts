import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  deleteTemplate,
  getAvailableKits,
  getKits,
  getKitById,
  assembleKit,
  disassembleKit,
  deleteKit,
} from '../controllers/kitController';

const router = Router();

router.use(authenticate);

// Template routes — admin/leader only for mutations
router.get('/templates', authorize('admin', 'leader', 'manager'), getTemplates);
router.post('/templates', authorize('admin', 'leader'), createTemplate);
router.get('/templates/:id', authorize('admin', 'leader', 'manager'), getTemplateById);
router.delete('/templates/:id', authorize('admin', 'leader'), deleteTemplate);

// Availability check — all roles
router.get('/available', authorize('admin', 'leader', 'manager'), getAvailableKits);

// Kit instance routes
router.get('/', authorize('admin', 'leader', 'manager'), getKits);
router.get('/:id', authorize('admin', 'leader', 'manager'), getKitById);
router.delete('/:id', authorize('admin', 'leader', 'manager'), deleteKit);

// Assembly/disassembly
router.post('/assemble', authorize('admin', 'leader', 'manager'), assembleKit);
router.post('/disassemble', authorize('admin', 'leader', 'manager'), disassembleKit);

export default router;
