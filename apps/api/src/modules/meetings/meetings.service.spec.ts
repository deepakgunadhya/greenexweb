jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    meeting: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
    lead: { update: jest.fn(), findMany: jest.fn() },
    googleAuth: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../email/email.service', () => {
  const sendMock = jest.fn().mockResolvedValue(true);
  class EmailService {}
  // ensure prototype method is the mock so spies work
  (EmailService as any).prototype.sendEmail = sendMock;
  (EmailService as any).__sendMock = sendMock;
  return { __esModule: true, EmailService };
});

jest.mock('./meetings.google', () => ({
  createCalendarEvent: jest.fn(),
  updateCalendarEvent: jest.fn(),
  deleteCalendarEvent: jest.fn(),
}));

import prisma from '../../config/database';
import { MeetingsService } from './meetings.service';

const { createCalendarEvent } = require('./meetings.google');

describe('MeetingsService', () => {
  let service: MeetingsService;
  const prismaMock: any = {
    meeting: prisma.meeting,
    lead: prisma.lead,
    googleAuth: prisma.googleAuth,
    $transaction: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MeetingsService(prismaMock as any);
  });

  it('createMeeting should call prisma.create and return meeting', async () => {
    (prisma.meeting.create as jest.Mock).mockResolvedValue({ id: 'm1', title: 'Meet' });

    const res = await service.createMeeting({ title: 'Meet', lead: { connect: { id: 'l1' } }, organizedBy: 'u1' } as any);

    expect(res.id).toBe('m1');
    expect(prisma.meeting.create).toHaveBeenCalled();
  });

  it('scheduleMeeting should throw on time conflict', async () => {
    const existing = [{ scheduledAt: new Date('2026-01-10T10:00:00Z'), duration: 60 }];

    const txMock: any = { meeting: { findMany: jest.fn().mockResolvedValue(existing) } };
    prismaMock.$transaction.mockImplementation(async (fn: Function) => fn(txMock));

    await expect(service.scheduleMeeting('lead1', 'u1', { title: 'T', scheduledAt: new Date('2026-01-10T10:30:00Z') })).rejects.toThrow(/already has a meeting/);
  });

  it('scheduleMeeting should create meeting and send emails when no google calendar', async () => {
    const created = { id: 'm2', title: 'New', organizer: { email: 'o@e.com' }, lead: { contact: { email: 'c@e.com' }, organization: { email: 'org@e.com' } } };

    const txMock: any = { meeting: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue(created), findUnique: jest.fn().mockResolvedValue(created) } };
    prismaMock.$transaction.mockImplementation(async (fn: Function) => fn(txMock));

    const res = await service.scheduleMeeting('lead1', 'u1', { title: 'New', scheduledAt: new Date('2026-02-01T10:00:00Z') });

    expect(res).toBeDefined();
    const EmailServiceMock = require('../email/email.service').EmailService;
    // Spy exists because mock defines a prototype method
    expect(EmailServiceMock.__sendMock).toHaveBeenCalled();
  });

  it('cancelMeeting should throw when meeting not found', async () => {
    const txMock: any = { meeting: { findUnique: jest.fn().mockResolvedValue(null) } };
    prismaMock.$transaction.mockImplementation(async (fn: Function) => fn(txMock));

    await expect(service.cancelMeeting('no')).rejects.toThrow(/not found/);
  });

  it('cancelMeeting should succeed and call email', async () => {
    const txMock: any = {
      meeting: { 
        findUnique: jest.fn().mockResolvedValue({ id: 'm3', title: 'T', organizedBy: 'u1', meetingType: 'KICKOFF', calendarEventId: null }),
        update: jest.fn().mockResolvedValue({ id: 'm3', title: 'T', meetingType: 'KICKOFF', organizer: { email: 'o@e.com' }, lead: { contact: { email: 'c@e.com' }, organization: { email: 'org@e.com' } } }) 
      },
      lead: { update: jest.fn() }
    };
    prismaMock.$transaction.mockImplementation(async (fn: Function) => fn(txMock));

    const res = await service.cancelMeeting('m3', 'Reason');

    expect(res.meetingType).toBe('KICKOFF');
    const EmailServiceMock = require('../email/email.service').EmailService;
    // check the prototype mock was called
    expect((EmailServiceMock as any).__sendMock).toHaveBeenCalled();
  });

  it('getMeetingStats should return counts', async () => {
    (prisma.meeting.count as jest.Mock).mockResolvedValueOnce(10).mockResolvedValueOnce(4).mockResolvedValueOnce(3).mockResolvedValueOnce(2).mockResolvedValueOnce(1);

    const stats = await service.getMeetingStats('u1');

    expect(stats.total).toBe(10);
    expect(stats.scheduled).toBe(4);
  });
});