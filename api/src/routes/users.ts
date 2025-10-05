import { Router } from 'express';

const router = Router();

// TODO: Implement user routes
router.get('/', async (_req: any, res: any) => {
  res.json({ success: true, message: 'Users endpoint - TODO' });
});

export default router;