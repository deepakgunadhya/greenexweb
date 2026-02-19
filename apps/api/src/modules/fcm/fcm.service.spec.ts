// Tests for FcmService
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    deviceToken: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }
}));

jest.mock('firebase-admin', () => {
  const sendEachForMulticast = jest.fn();
  const sendToTopic = jest.fn();
  const subscribeToTopic = jest.fn();
  const unsubscribeFromTopic = jest.fn();
  const messaging = jest.fn(() => ({
    sendEachForMulticast,
    sendToTopic,
    subscribeToTopic,
    unsubscribeFromTopic
  }));
  return {
    __esModule: true,
    default: {
      initializeApp: jest.fn(),
      app: jest.fn(),
      messaging
    },
    messaging
  };
});

import prisma from '../../config/database';
import admin from 'firebase-admin';
import { FCMService } from './fcm.service';

describe('FCMService', () => {
  let service: FCMService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FCMService();
  });

  describe('registerToken', () => {
    it('should register new token', async () => {
      const txMock: any = { deviceToken: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 't1' }) } };
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(txMock));

      const res = await service.registerToken({ userId: 'u1', token: 'token', platform: 'ANDROID', type: 'USER' } as any);
      expect(txMock.deviceToken.create).toHaveBeenCalled();
      expect(res).toBeDefined();
    });

    it('should update existing token active flag', async () => {
      const txMock: any = { deviceToken: { findFirst: jest.fn().mockResolvedValue({ id: 't1' }), update: jest.fn().mockResolvedValue({ id: 't1', isActive: true }) } };
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(txMock));

      const res = await service.registerToken({ userId: 'u1', token: 'token', platform: 'ANDROID', type: 'USER' } as any);
      expect(txMock.deviceToken.update).toHaveBeenCalled();
      expect(res).toBeDefined();
    });
  });

  describe('getTokens', () => {
    it('should return tokens', async () => {
      (prisma.deviceToken.findMany as jest.Mock).mockResolvedValue([{ id: 't1' }]);
      const res = await service.getTokens({});
      expect(res).toEqual([{ id: 't1' }]);
    });
  });

  describe('deleteToken and deleteUserTokens', () => {
    it('deleteToken should remove token', async () => {
      (prisma.deviceToken.findFirst as jest.Mock).mockResolvedValue({ id: 't1' });
      (prisma.deviceToken.delete as jest.Mock).mockResolvedValue({});
      const res = await service.deleteToken('t1');
      expect(res).toMatchObject({ message: 'Token deleted' });
    });

    it('deleteUserTokens should soft delete tokens', async () => {
      (prisma.deviceToken.update as jest.Mock).mockResolvedValue({});
      const res = await service.deleteUserTokens('u1');
      expect(res).toBeDefined();
    });
  });

  describe('send functions', () => {
    it('sendToTokens should call firebase send', async () => {
      ((admin.messaging() as any).sendEachForMulticast as jest.Mock).mockResolvedValue({ responses: [] });
      const res = await service.sendToTokens(['t1'], { notification: { title: 'Hi' } } as any);
      expect((admin.messaging() as any).sendEachForMulticast).toHaveBeenCalled();
      expect(res).toBeDefined();
    });

    it('sendToTopic should call firebase sendToTopic', async () => {
      ((admin.messaging() as any).sendToTopic as jest.Mock).mockResolvedValue({});
      const res = await service.sendToTopic('topic', { notification: { title: 'Hello' } } as any);
      expect((admin.messaging() as any).sendToTopic).toHaveBeenCalled();
      expect(res).toBeDefined();
    });
  });
});