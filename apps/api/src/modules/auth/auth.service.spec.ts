jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => {
  const hashMock = jest.fn();
  const compareMock = jest.fn();
  return {
    __esModule: true,
    hash: hashMock,
    compare: compareMock,
    default: { hash: hashMock, compare: compareMock },
  };
});

jest.mock('jsonwebtoken', () => {
  const signMock = jest.fn();
  const verifyMock = jest.fn();
  return {
    __esModule: true,
    sign: signMock,
    verify: verifyMock,
    default: { sign: signMock, verify: verifyMock },
  };
});

import prisma from '../../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.BCRYPT_ROUNDS = '1';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService();
  });

  it('register should throw if user exists', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1' });

    await expect(
      service.register({ email: 'a@b.com', password: 'pass', firstName: 'A', lastName: 'B' })
    ).rejects.toMatchObject({ code: 'USER_EXISTS' });
  });

  it('register should assign default role and return tokens', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'u2',
      email: 'u2@x.com',
      firstName: 'A',
      lastName: 'B',
      roles: [],
    });

    (prisma.role.findFirst as jest.Mock).mockResolvedValue({ id: 'r1', name: 'User' });
    (prisma.userRole.create as jest.Mock).mockResolvedValue({});

    // After assigning role, findUnique returns user with role included
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'u2',
      email: 'u2@x.com',
      firstName: 'A',
      lastName: 'B',
      roles: [{ role: { id: 'r1', name: 'User', permissions: JSON.stringify(['users:read']) } }],
    });

    (jwt.sign as jest.Mock).mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

    const res = await service.register({ email: 'u2@x.com', password: 'pass', firstName: 'A', lastName: 'B' });

    expect(res.tokens.accessToken).toBe('access-token');
    expect(res.tokens.refreshToken).toBe('refresh-token');
    expect(res.user.roles).toContain('User');
    expect(prisma.userRole.create).toHaveBeenCalled();
  });

  it('login should throw if user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.login({ email: 'no@one', password: 'p' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('login should throw if account deactivated', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u3', isActive: false, password: 'x' });

    await expect(service.login({ email: 'x@y', password: 'p' })).rejects.toMatchObject({ code: 'ACCOUNT_DEACTIVATED' });
  });

  it('login should throw when password invalid', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u4', isActive: true, password: 'hashed' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login({ email: 'u4@x', password: 'wrong' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('login should succeed with valid credentials and update lastLogin', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u5', isActive: true, password: 'hashed', email: 'u5@x', firstName: 'F', lastName: 'L', roles: [{ role: { id: 'r1', name: 'User', permissions: JSON.stringify(['users:read']) } }] });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (prisma.user.update as jest.Mock).mockResolvedValue({});
    (jwt.sign as jest.Mock).mockReturnValueOnce('atk').mockReturnValueOnce('rtk');

    const res = await service.login({ email: 'u5@x', password: 'correct' });

    expect(res.tokens.accessToken).toBe('atk');
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('refreshToken should throw on invalid token', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('invalid'); });

    await expect(service.refreshToken('bad')).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('refreshToken should return auth response when valid', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 'u6' });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u6', isActive: true, email: 'u6@x', firstName: 'F', lastName: 'L', roles: [{ role: { id: 'r1', name: 'User', permissions: JSON.stringify(['users:read']) } }] });
    (jwt.sign as jest.Mock).mockReturnValueOnce('a1').mockReturnValueOnce('r1');

    const res = await service.refreshToken('good');

    expect(res.tokens.accessToken).toBe('a1');
  });

  it('changePassword should throw when user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.changePassword('no', 'old', 'new')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('changePassword should throw when old password invalid', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u7', password: 'hashed' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.changePassword('u7', 'wrong', 'new')).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
  });

  it('changePassword should succeed when old password valid', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u8', password: 'oldhash' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('newhash');
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    await expect(service.changePassword('u8', 'old', 'new')).resolves.toBeUndefined();
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u8' }, data: { password: 'newhash' } });
  });

  it('getProfile should throw when user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.getProfile('no')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('getProfile should return profile with roles and permissions', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u9',
      email: 'u9@x',
      firstName: 'F',
      lastName: 'L',
      userType: 'INTERNAL',
      organizationId: null,
      phone: null,
      isActive: true,
      isVerified: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      roles: [{ role: { id: 'r1', name: 'User', permissions: JSON.stringify(['users:read','roles:read']) } }]
    });

    const profile = await service.getProfile('u9');

    expect(profile.roles).toHaveLength(1);
    expect(profile.permissions).toEqual(expect.arrayContaining(['users:read','roles:read']));
  });
});