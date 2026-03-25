import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import {
  validateCreateItem,
  validateUpdateItem,
  validatePaginationParams,
} from '../validators/item.validator';
import {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
} from '../controllers/itemController';

const router = Router();

router.use(authenticate);

router.post('/', authorize('admin', 'leader', 'manager'), validateCreateItem, createItem);
router.get('/', authorize('admin', 'leader', 'manager'), validatePaginationParams, getItems);
router.get('/:id', authorize('admin', 'leader', 'manager'), getItemById);
router.put('/:id', authorize('admin', 'leader', 'manager'), validateUpdateItem, updateItem);
router.delete('/:id', authorize('admin', 'leader', 'manager'), deleteItem);

export default router;
