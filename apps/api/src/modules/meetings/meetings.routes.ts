import { Router } from 'express';
import { authenticateToken, requirePermissions } from '../../middleware/auth.middleware';
import {
  getAllMeetings,
  getMeetingById,
  getMeetingsByLead,
  getMeetingsByOrganization,
  scheduleMeeting,
  updateMeeting,
  startMeeting,
  completeMeeting,
  cancelMeeting,
  rescheduleMeeting,
  deleteMeeting,
  getMeetingStats,
} from './meetings.controller';

const router = Router();

// All meeting routes require authentication
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Meetings
 *   description: Meeting management endpoints
 */

// Meeting statistics
router.get('/stats', requirePermissions(['meetings:read']), getMeetingStats);

// Meeting management
router.get('/', requirePermissions(['meetings:read']), getAllMeetings);
router.get('/:id', requirePermissions(['meetings:read']), getMeetingById);
router.post('/', requirePermissions(['meetings:create']), scheduleMeeting);
router.put('/:id', requirePermissions(['meetings:update']), updateMeeting);
router.delete('/:id', requirePermissions(['meetings:delete']), deleteMeeting);

// Meeting actions
router.post('/:id/start', requirePermissions(['meetings:update']), startMeeting);
router.post('/:id/complete', requirePermissions(['meetings:update']), completeMeeting);
router.post('/:id/cancel', requirePermissions(['meetings:update']), cancelMeeting);
router.post('/:id/reschedule', requirePermissions(['meetings:update']), rescheduleMeeting);

// Lead-specific meetings
router.get('/lead/:leadId', requirePermissions(['meetings:read']), getMeetingsByLead);

// Organization-specific meetings
router.get('/organization/:organizationId', requirePermissions(['meetings:read']), getMeetingsByOrganization);

export default router;
