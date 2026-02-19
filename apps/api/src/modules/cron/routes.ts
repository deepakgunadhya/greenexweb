import { Router, Request, Response, NextFunction } from 'express';
import { CronController } from './cron.controller';
import { errorResponse } from '../../utils/response';

const router: Router = Router();
const cronController = new CronController();

/**
 * Simple secret-based authentication for cron endpoints.
 * Validates the x-cron-secret header against CRON_SECRET env variable.
 * If CRON_SECRET is not set, the endpoint is accessible without authentication (dev mode).
 */
const authenticateCron = (req: Request, res: Response, next: NextFunction) => {
  const cronSecret = process.env.CRON_SECRET;

  // If no secret configured, allow access (development mode)
  if (!cronSecret) {
    return next();
  }

  const providedSecret = req.headers['x-cron-secret'];

  if (!providedSecret || providedSecret !== cronSecret) {
    return res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid or missing cron secret'));
  }

  next();
};

// Apply cron authentication to all routes
router.use(authenticateCron);

// POST & GET /api/v1/cron/lead-closing-reminder
router.post('/lead-closing-reminder', cronController.sendLeadClosingReminders);
router.get('/lead-closing-reminder', cronController.sendLeadClosingReminders);

// POST & GET /api/v1/cron/auto-lock-tasks
router.post('/auto-lock-tasks', cronController.autoLockOverdueTasks);
router.get('/auto-lock-tasks', cronController.autoLockOverdueTasks);

export default router;
