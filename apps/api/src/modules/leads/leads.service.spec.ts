jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    organization: { findFirst: jest.fn(), create: jest.fn() },
    contact: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    lead: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), update: jest.fn(), aggregate: jest.fn(), groupBy: jest.fn() },
  },
}));

jest.mock('../email/email.service', () => {
  const notifyMock = jest.fn().mockResolvedValue(true);
  const ackMock = jest.fn().mockResolvedValue(true);
  class EmailService {}
  (EmailService as any).prototype.notifySalesTeamOfEnquiry = notifyMock;
  (EmailService as any).prototype.sendEnquiryAcknowledgment = ackMock;
  (EmailService as any).__notifyMock = notifyMock;
  (EmailService as any).__ackMock = ackMock;
  return { __esModule: true, EmailService };
});

import prisma from '../../config/database';
import { LeadsService } from './leads.service';

describe('LeadsService', () => {
  let service: LeadsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LeadsService();
  });

  it('create should create organization and contact when companyName provided', async () => {
    (prisma.organization.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.organization.create as jest.Mock).mockResolvedValue({ id: 'org1', name: 'New Org' });
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.contact.create as jest.Mock).mockResolvedValue({ id: 'c1' });
    (prisma.lead.create as jest.Mock).mockResolvedValue({ id: 'l1', organization: { id: 'org1' }, contact: { id: 'c1' } });

    const lead = await service.create({ source: 'MOBILE_APP', title: 'Lead 1', companyName: 'New Org', contactName: 'John Doe', contactEmail: 'john@example.com' });

    expect(lead).toBeDefined();
    expect(prisma.organization.create).toHaveBeenCalled();
    expect(prisma.contact.create).toHaveBeenCalled();
  });

  it('create should not fail if email sending throws', async () => {
    (prisma.organization.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.organization.create as jest.Mock).mockResolvedValue({ id: 'org2', name: 'Org2' });
    (prisma.contact.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.contact.create as jest.Mock).mockResolvedValue({ id: 'c2' });
    (prisma.lead.create as jest.Mock).mockResolvedValue({ id: 'l2' });

    const EmailMock = require('../email/email.service').EmailService;
    EmailMock.prototype.notifySalesTeamOfEnquiry.mockRejectedValueOnce(new Error('SMTP down'));

    const lead = await service.create({ source: 'MOBILE_APP', title: 'Lead 2', companyName: 'Org2', contactName: 'Jane Doe', contactEmail: 'jane@example.com' });

    expect(lead).toBeDefined();
  });

  it('findById should throw when not found', async () => {
    (prisma.lead.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.findById('no')).rejects.toMatchObject({ code: 'LEAD_NOT_FOUND' });
  });

  it('update should validate status transitions and throw on invalid', async () => {
    (prisma.lead.findFirst as jest.Mock).mockResolvedValue({ id: 'l1', status: 'CLOSED', organizationId: 'org1', contactId: null });

    await expect(service.update('l1', { status: 'NEW' })).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
  });

  it('delete should throw when not found', async () => {
    (prisma.lead.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.delete('no')).rejects.toMatchObject({ code: 'LEAD_NOT_FOUND' });
  });

  it('getStats should return aggregated stats', async () => {
    (prisma.lead.count as jest.Mock).mockResolvedValueOnce(10).mockResolvedValueOnce(4).mockResolvedValueOnce(3).mockResolvedValueOnce(3);
    (prisma.lead.aggregate as jest.Mock).mockResolvedValue({ _avg: { estimatedValue: 200 } });
    (prisma.lead.findMany as jest.Mock).mockResolvedValue([{ id: 'l1' }]);
    (prisma.lead.groupBy as jest.Mock).mockResolvedValue([{ source: 'MOBILE_APP', _count: { id: 6 } }]);

    const stats = await service.getStats();

    expect(stats.totalLeads).toBe(10);
    expect(stats.byStatus.closed).toBe(3);
    expect(stats.avgDealSize).toBe(200);
  });
});