import { z } from 'zod';

export const createMeetingValidator = z.object({
  leadId: z.string().uuid('Invalid lead ID'),
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().optional(),
  scheduledAt: z.string().datetime('Invalid scheduled date/time'),
  duration: z.number().int().min(15, 'Duration must be at least 15 minutes').max(480, 'Duration cannot exceed 8 hours').optional(),
  location: z.string().max(255, 'Location must be less than 255 characters').optional(),
  meetingLink: z.string().url('Invalid meeting link').optional().or(z.literal('')),
  meetingType: z.enum(['KICKOFF', 'FOLLOWUP', 'CLARIFICATION', 'CLOSURE']).optional(),
  clientSide: z.string().optional(),
  greenexSide: z.string().optional(),
});

export const updateMeetingValidator = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters').optional(),
  description: z.string().optional(),
  scheduledAt: z.string().datetime('Invalid scheduled date/time').optional(),
  duration: z.number().int().min(15, 'Duration must be at least 15 minutes').max(480, 'Duration cannot exceed 8 hours').optional(),
  location: z.string().max(255, 'Location must be less than 255 characters').optional(),
  meetingLink: z.string().url('Invalid meeting link').optional().or(z.literal('')),
  meetingType: z.enum(['KICKOFF', 'FOLLOWUP', 'CLARIFICATION', 'CLOSURE']).optional(),
  clientSide: z.string().optional(),
  greenexSide: z.string().optional(),
});

export const completeMeetingValidator = z.object({
  outcome: z.string().optional(),
  actionItems: z.string().optional(),
  followUpRequired: z.boolean().optional(),
  followUpDate: z.string().datetime('Invalid follow-up date/time').optional(),
  followUpNotes: z.string().optional(),
});

export const queryMeetingsValidator = z.object({
  page: z.string().transform(val => parseInt(val)).pipe(z.number().int().min(1)).optional().default('1'),
  pageSize: z.string().transform(val => parseInt(val)).pipe(z.number().int().min(1).max(100)).optional().default('10'),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  meetingType: z.enum(['KICKOFF', 'FOLLOWUP', 'CLARIFICATION', 'CLOSURE']).optional(),
  organizedBy: z.string().uuid('Invalid organizer ID').optional(),
  scheduledFrom: z.string().datetime('Invalid from date').optional(),
  scheduledTo: z.string().datetime('Invalid to date').optional(),
});