jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    quotation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    quotationOtp: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    quotationAction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../email/email.service', () => {
  const sendMock = jest.fn().mockResolvedValue(true);
  class EmailService {}
  (EmailService as any).prototype.sendEmail = sendMock;
  (EmailService as any).__sendMock = sendMock;
  return { __esModule: true, EmailService };
});

import prisma from '../../config/database';
import { ClientService } from './client.service';

describe('ClientService', () => {
  let service: ClientService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ClientService();
  });

  it('getUserAccess should throw when client not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect((service as any)['getUserAccess']('u1')).rejects.toMatchObject({ code: 'CLIENT_NOT_FOUND' });
  });

  it('getClientQuotations should return mapped quotations', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1', organizationId: 'org1', userType: 'CLIENT', isActive: true, organization: { id: 'org1', name: 'Org' } });

    (prisma.quotation.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'q1',
        title: 'Q1',
        description: 'D',
        amount: { toString: () => '1000' },
        currency: 'INR',
        valid_until: new Date(),
        status: 'SENT',
        createdAt: new Date(),
        lead: { id: 'lead1', title: 'Lead1', organization: { id: 'org1', name: 'Org' } }
      }
    ]);

    const res = await service.getClientQuotations('u1');

    expect(res).toHaveLength(1);
    expect(res[0].amount).toBe(1000);
    expect(res[0].currency).toBe('INR');
  });

  it('requestQuotationAction should throw when quotation not found', async () => {
    const txMock: any = {
      quotation: { findFirst: jest.fn().mockResolvedValue(null) },
      quotationOtp: { updateMany: jest.fn(), create: jest.fn() },
      user: { findUnique: jest.fn() }
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(txMock));

    await expect(service.requestQuotationAction('u1', 'q1', 'accept')).rejects.toMatchObject({ code: 'QUOTATION_NOT_FOUND' });
  });

  it('requestQuotationAction should succeed and send emails', async () => {
    const txMock: any = {
      quotation: { findFirst: jest.fn().mockResolvedValue({ id: 'q1', title: 'Q1', lead: { contact: { email: 'c@e.com' }, organization: { email: 'o@e.com', name: 'Org' } }, uploader: { email: 'u@e.com' } }) },
      quotationOtp: { updateMany: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) },
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'user@e.com', firstName: 'F', lastName: 'L' }) }
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(txMock));

    // stub private sendOTPEmail to return true
    (service as any)['sendOTPEmail'] = jest.fn().mockResolvedValue(true);

    // Spy on EmailService.prototype.sendEmail so we can assert it was called
    const EmailServiceMock = require('../email/email.service').EmailService;
    const sendSpy = jest.spyOn(EmailServiceMock.prototype as any, 'sendEmail').mockResolvedValue(true as any);

    const res = await service.requestQuotationAction('u1', 'q1', 'accept');

    expect(res.message).toMatch(/OTP sent/);
    // ensure email service was called for stakeholders
    expect(sendSpy).toHaveBeenCalled();
  });

  it('confirmQuotationAction should throw on invalid otp format', async () => {
    await expect(service.confirmQuotationAction('u1', 'q1', 'abc')).rejects.toMatchObject({ code: 'INVALID_OTP' });
  });

  it('confirmQuotationAction should throw when otp not found', async () => {
    const txMock: any = {
      quotationOtp: { findFirst: jest.fn().mockResolvedValue(null), updateMany: jest.fn() },
      quotation: { findFirst: jest.fn() }
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(txMock));

    await expect(service.confirmQuotationAction('u1', 'q1', '123456')).rejects.toMatchObject({ code: 'INVALID_OTP' });
  });

  it('confirmQuotationAction should succeed when otp valid', async () => {
    const now = new Date();
    const otpRecord = { id: 'o1', actionType: 'ACCEPT', userId: 'u1', quotationId: 'q1' };

    const txMock: any = {
      quotationOtp: { findFirst: jest.fn().mockResolvedValue(otpRecord), update: jest.fn() },
      quotation: { findFirst: jest.fn().mockResolvedValue({ id: 'q1', status: 'SENT' }), update: jest.fn().mockResolvedValue({ statusChangedAt: now }) },
      quotationAction: { create: jest.fn() }
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(txMock));

    const res = await service.confirmQuotationAction('u1', 'q1', '123456');

    expect(res.message).toMatch(/successfully/);
    expect(res.quotation.status).toBe('ACCEPTED');
  });
});