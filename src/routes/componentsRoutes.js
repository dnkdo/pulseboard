import { Router } from 'express';
import { listComponents, getComponentById } from '../controllers/componentsController.js';

const router = Router();

router.get('/', listComponents);
router.get('/:id', getComponentById);

export default router;
