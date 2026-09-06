import { Router } from 'express';
import { resolveIdentifier } from '../controllers/resolverController.js';

const router = Router();

router.get('/:displayIdentifier', resolveIdentifier);

export default router;
