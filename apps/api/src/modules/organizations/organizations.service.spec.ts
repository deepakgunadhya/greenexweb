import { OrganizationsService } from './organizations.service';

// Mock prisma module
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    organization: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock EmailService
jest.mock('../email/email.service', () => {
  const sendMock = jest.fn().mockResolvedValue(true);
  class EmailService {}
  (EmailService as any).prototype.sendEmail = sendMock;
  (EmailService as any).__sendMock = sendMock;
  return { __esModule: true, EmailService };
});

import prisma from '../../config/database';

describe('OrganizationsService', () => {
  const service = new OrganizationsService();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('create should send email when organization has email', async () => {
    (prisma.organization.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.organization.create as jest.Mock).mockResolvedValue({
      id: 'org1',
      name: 'Test Org',
      email: 'org@example.com',
      type: 'CLIENT',
      industry: 'Tech',
      isActive: true,
    });

    const result = await service.create({
      name: 'Test Org',
      type: 'CLIENT',
      email: 'org@example.com',
    });

    expect(result).toBeDefined();
    // EmailService.sendEmail should have been called (constructed inside service)
    const EmailServiceMock = require('../email/email.service').EmailService;
    expect(EmailServiceMock.prototype.sendEmail).toHaveBeenCalled();
  });

  it('create should throw when duplicate org exists', async () => {
    (prisma.organization.findFirst as jest.Mock).mockResolvedValue({ id: 'org1' });

    await expect(
      service.create({ name: 'Test Org', type: 'CLIENT' } as any)
    ).rejects.toMatchObject({ code: 'DUPLICATE_ORGANIZATION' });
  });

  it('findMany should return organizations and meta', async () => {
    (prisma.organization.findMany as jest.Mock).mockResolvedValue([
      { id: 'o1', name: 'A' },
      { id: 'o2', name: 'B' },
    ]);
    (prisma.organization.count as jest.Mock).mockResolvedValue(2);

    const res = await service.findMany({ page: 1, pageSize: 10 });

    expect(res.organizations).toHaveLength(2);
    expect(res.meta.total).toBe(2);
  });

  it('delete should throw when dependencies exist', async () => {
    (prisma.organization.findFirst as jest.Mock).mockResolvedValue({
      id: 'org1',
      _count: { projects: 1, leads: 0 },
    });

    await expect(service.delete('org1', {})).rejects.toMatchObject({ code: 'ORGANIZATION_HAS_DEPENDENCIES' });
  });
});
