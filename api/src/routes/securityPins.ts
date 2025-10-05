import { Router } from 'express';

const router = Router();

// TODO: Implement security PIN routes
router.post('/setup', async (_req: any, res: any) => {
  res.json({ success: true, message: 'Security PIN setup - TODO' });
});

export default router;