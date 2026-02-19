import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { MeetingsService } from './meetings.service';
import { successResponse, errorResponse } from '../../utils/response';
import { 
  createMeetingValidator, 
  updateMeetingValidator, 
  queryMeetingsValidator,
  completeMeetingValidator 
} from './validators';

const prisma = new PrismaClient();
const meetingsService = new MeetingsService(prisma);

/**
 * @swagger
 * components:
 *   schemas:
 *     Meeting:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         leadId:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         scheduledAt:
 *           type: string
 *           format: date-time
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         duration:
 *           type: integer
 *         location:
 *           type: string
 *         meetingLink:
 *           type: string
 *         meetingType:
 *           type: string
 *           enum: [KICKOFF, FOLLOWUP, CLARIFICATION, CLOSURE]
 *         status:
 *           type: string
 *           enum: [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW]
 *         outcome:
 *           type: string
 *         actionItems:
 *           type: string
 *         organizedBy:
 *           type: string
 *           format: uuid
 *         clientSide:
 *           type: string
 *         greenexSide:
 *           type: string
 *         followUpRequired:
 *           type: boolean
 *         followUpDate:
 *           type: string
 *           format: date-time
 *         followUpNotes:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/meetings:
 *   get:
 *     summary: Get all meetings
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW]
 *       - in: query
 *         name: meetingType
 *         schema:
 *           type: string
 *           enum: [KICKOFF, FOLLOWUP, CLARIFICATION, CLOSURE]
 *     responses:
 *       200:
 *         description: List of meetings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     meetings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Meeting'
 *                     meta:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         pageSize:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 */
export const getAllMeetings = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = queryMeetingsValidator.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid query parameters'));
      return;
    }

    const { page, pageSize, status, meetingType, organizedBy, scheduledFrom, scheduledTo } = validation.data;

    const { meetings, total } = await meetingsService.getAllMeetings({
      page,
      pageSize,
      status,
      meetingType,
      organizedBy,
      scheduledFrom: scheduledFrom ? new Date(scheduledFrom) : undefined,
      scheduledTo: scheduledTo ? new Date(scheduledTo) : undefined,
    });

    const totalPages = Math.ceil(total / pageSize);

    res.json(successResponse({
      meetings,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    }));
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to fetch meetings'));
  }
};

/**
 * @swagger
 * /api/v1/meetings/{id}:
 *   get:
 *     summary: Get meeting by ID
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Meeting details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Meeting'
 *       404:
 *         description: Meeting not found
 */
export const getMeetingById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const meeting = await meetingsService.getMeetingById(id);

    if (!meeting || meeting.isDeleted) {
      res.status(404).json(errorResponse('NOT_FOUND', 'Meeting not found'));
      return;
    }

    res.json(successResponse(meeting));
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to fetch meeting'));
  }
};

/**
 * @swagger
 * /api/v1/meetings/lead/{leadId}:
 *   get:
 *     summary: Get meetings by lead ID
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: List of meetings for the lead
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Meeting'
 */
export const getMeetingsByLead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { leadId } = req.params;
    const meetings = await meetingsService.getMeetingsByLead(leadId);

    res.json(successResponse(meetings));
  } catch (error) {
    console.error('Get lead meetings error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to fetch lead meetings'));
  }
};

export const getMeetingsByOrganization = async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.params;
    const meetings = await meetingsService.getMeetingsByOrganization(organizationId);

    res.json(successResponse(meetings));
  } catch (error) {
    console.error('Get organization meetings error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to fetch organization meetings'));
  }
};

/**
 * @swagger
 * /api/v1/meetings:
 *   post:
 *     summary: Schedule a new meeting
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leadId
 *               - title
 *               - scheduledAt
 *             properties:
 *               leadId:
 *                 type: string
 *                 format: uuid
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: integer
 *               location:
 *                 type: string
 *               meetingLink:
 *                 type: string
 *               meetingType:
 *                 type: string
 *                 enum: [KICKOFF, FOLLOWUP, CLARIFICATION, CLOSURE]
 *               clientSide:
 *                 type: string
 *               greenexSide:
 *                 type: string
 *     responses:
 *       201:
 *         description: Meeting scheduled successfully
 *       400:
 *         description: Invalid input data
 */
export const scheduleMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const validation = createMeetingValidator.safeParse(req.body);
    if (!validation.success) {
      console.error('Meeting validation failed:', validation.error.issues);
      console.error('Request body:', req.body);
      
      // Transform Zod issues into details format
      const details: Record<string, string[]> = {};
      validation.error.issues.forEach(issue => {
        const path = issue.path.join('.');
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(issue.message);
      });
      
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid meeting data', details));
      return;
    }

    const { leadId, ...meetingData } = validation.data;
    const organizerId = (req as any).user?.id;

    if (!organizerId) {
      res.status(401).json(errorResponse('UNAUTHORIZED', 'User not authenticated'));
      return;
    }

    const meeting = await meetingsService.scheduleMeeting(leadId, organizerId, {
      title: meetingData.title,
      description: meetingData.description,
      scheduledAt: new Date(meetingData.scheduledAt),
      duration: meetingData.duration,
      location: meetingData.location,
      meetingLink: meetingData.meetingLink,
      meetingType: meetingData.meetingType,
      clientSide: meetingData.clientSide,
      greenexSide: meetingData.greenexSide,
    });

    res.status(201).json(successResponse(meeting));
  } catch (error: any) {
    console.error('Schedule meeting error:', error);
    
    // If it's a validation error (time conflict), return 400
    if (error.message && error.message.includes('already has a meeting scheduled')) {
      res.status(400).json(errorResponse('MEETING_CONFLICT', error.message));
      return;
    }
    
    res.status(500).json(errorResponse('INTERNAL_ERROR', error.message || 'Failed to schedule meeting'));
  }
};

/**
 * @swagger
 * /api/v1/meetings/{id}:
 *   put:
 *     summary: Update meeting
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: integer
 *               location:
 *                 type: string
 *               meetingLink:
 *                 type: string
 *               clientSide:
 *                 type: string
 *               greenexSide:
 *                 type: string
 *     responses:
 *       200:
 *         description: Meeting updated successfully
 *       404:
 *         description: Meeting not found
 */
export const updateMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const validation = updateMeetingValidator.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid meeting data'));
      return;
    }

    const updateData: any = validation.data;

    // Convert scheduledAt to Date if provided
    if (updateData.scheduledAt) {
      updateData.scheduledAt = new Date(updateData.scheduledAt);
    }

    const meeting = await meetingsService.updateMeeting(id, updateData);
    res.json(successResponse(meeting));
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to update meeting'));
  }
};

/**
 * @swagger
 * /api/v1/meetings/{id}/start:
 *   post:
 *     summary: Start a meeting
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Meeting started successfully
 *       404:
 *         description: Meeting not found
 */
export const startMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const meeting = await meetingsService.startMeeting(id);
    res.json(successResponse(meeting));
  } catch (error) {
    console.error('Start meeting error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to start meeting'));
  }
};

/**
 * @swagger
 * /api/v1/meetings/{id}/complete:
 *   post:
 *     summary: Complete a meeting
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               outcome:
 *                 type: string
 *               actionItems:
 *                 type: string
 *               followUpRequired:
 *                 type: boolean
 *               followUpDate:
 *                 type: string
 *                 format: date-time
 *               followUpNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Meeting completed successfully
 *       404:
 *         description: Meeting not found
 */
export const completeMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const validation = completeMeetingValidator.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'Invalid completion data'));
      return;
    }

    const completionData: any = validation.data;

    // Convert followUpDate to Date if provided
    if (completionData.followUpDate) {
      completionData.followUpDate = new Date(completionData.followUpDate);
    }

    const meeting = await meetingsService.completeMeeting(id, completionData);
    res.json(successResponse(meeting));
  } catch (error) {
    console.error('Complete meeting error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to complete meeting'));
  }
};

/**
 * @swagger
 * /api/v1/meetings/{id}/cancel:
 *   post:
 *     summary: Cancel a meeting
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Meeting cancelled successfully
 *       404:
 *         description: Meeting not found
 */
export const cancelMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const meeting = await meetingsService.cancelMeeting(id, reason);
    res.json(successResponse(meeting));
  } catch (error) {
    console.error('Cancel meeting error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to cancel meeting'));
  }
};

/**
 * @swagger
 * /api/v1/meetings/{id}/reschedule:
 *   post:
 *     summary: Reschedule a meeting
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - scheduledAt
 *             properties:
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Meeting rescheduled successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Meeting not found
 */
export const rescheduleMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { scheduledAt, reason } = req.body;

    if (!scheduledAt) {
      res.status(400).json(errorResponse('VALIDATION_ERROR', 'New scheduled time is required'));
      return;
    }

    const meeting = await meetingsService.rescheduleMeeting(id, new Date(scheduledAt), reason);
    res.json(successResponse(meeting));
  } catch (error) {
    console.error('Reschedule meeting error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to reschedule meeting'));
  }
};

/**
 * @swagger
 * /api/v1/meetings/{id}:
 *   delete:
 *     summary: Delete meeting
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Meeting deleted successfully
 *       404:
 *         description: Meeting not found
 */
export const deleteMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await meetingsService.deleteMeeting(id);
    res.status(204).send();
  } catch (error) {
    console.error('Delete meeting error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to delete meeting'));
  }
};

/**
 * @swagger
 * /api/v1/meetings/stats:
 *   get:
 *     summary: Get meeting statistics
 *     tags: [Meetings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizerId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter stats by organizer
 *     responses:
 *       200:
 *         description: Meeting statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     scheduled:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                     cancelled:
 *                       type: integer
 *                     upcomingThisWeek:
 *                       type: integer
 */
export const getMeetingStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizerId } = req.query;
    const stats = await meetingsService.getMeetingStats(organizerId as string);
    res.json(successResponse(stats));
  } catch (error) {
    console.error('Get meeting stats error:', error);
    res.status(500).json(errorResponse('INTERNAL_ERROR', 'Failed to fetch meeting statistics'));
  }
};