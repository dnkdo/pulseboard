import { Router } from 'express';
import { loadComponents } from '../models/component.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(loadComponents());
});

export default router;
