// Tests for ContentService
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    category: { findFirst: jest.fn() },
    content: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
    tag: { findMany: jest.fn() },
    contentTag: { createMany: jest.fn(), deleteMany: jest.fn() }
  }
}));

import prisma from '../../config/database';
import { ContentService } from './content.service';

describe('ContentService', () => {
  let service: ContentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContentService();
  });

  describe('create', () => {
    it('should throw when category not found', async () => {
      const txMock: any = { category: { findFirst: jest.fn().mockResolvedValue(null) } };
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(txMock));

      await expect(service.create({ type: 'BLOG', title: 'T', categoryId: 'c1', authorName: 'A', content: 'C' } as any)).rejects.toMatchObject({ code: 'CATEGORY_NOT_FOUND' });
    });

    it('should throw when slug exists', async () => {
      const txMock: any = {
        category: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
        content: { findFirst: jest.fn().mockResolvedValue({ id: 'exists' }) }
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(txMock));

      await expect(service.create({ type: 'BLOG', title: 'T', slug: 's', categoryId: 'c1', authorName: 'A', content: 'C' } as any)).rejects.toMatchObject({ code: 'SLUG_EXISTS' });
    });

    it('should validate blog content field', async () => {
      const txMock: any = {
        category: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
        content: { findFirst: jest.fn().mockResolvedValue(null) }
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(txMock));

      await expect(service.create({ type: 'BLOG', title: 'T', categoryId: 'c1', authorName: 'A', content: '' } as any)).rejects.toMatchObject({ code: 'BLOG_CONTENT_REQUIRED' });
    });

    it('should create content and return with relations', async () => {
      const created = { id: 'ct1' };
      const txMock: any = {
        category: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
        content: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(created), findUnique: jest.fn().mockResolvedValue({ id: 'ct1', title: 'T' }) },
        tag: { findMany: jest.fn().mockResolvedValue([]) },
        contentTag: { createMany: jest.fn() }
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(txMock));

      const res = await service.create({ type: 'BLOG', title: 'T', categoryId: 'c1', authorName: 'A', content: 'Body' } as any);

      expect(res).toBeDefined();
      expect(txMock.content.create).toHaveBeenCalled();
    });
  });

  describe('findById and findBySlug', () => {
    it('findById should throw when not found', async () => {
      (prisma.content.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.findById('no')).rejects.toMatchObject({ code: 'CONTENT_NOT_FOUND' });
    });

    it('findBySlug should throw when not found', async () => {
      (prisma.content.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.findBySlug('no')).rejects.toMatchObject({ code: 'CONTENT_NOT_FOUND' });
    });
  });

  describe('update', () => {
    it('update should throw when content not found', async () => {
      const txMock: any = { content: { findFirst: jest.fn().mockResolvedValue(null) } };
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(txMock));

      await expect(service.update('c1', { title: 'X' })).rejects.toMatchObject({ code: 'CONTENT_NOT_FOUND' });
    });

    it('update should throw when new slug exists', async () => {
      const txMock: any = { content: { findFirst: jest.fn().mockResolvedValue({ id: 'c1', slug: 'old' }), update: jest.fn(), findUnique: jest.fn() } };
      txMock.content.findFirst
        .mockResolvedValueOnce({ id: 'c1', slug: 'old' }) // existingContent
        .mockResolvedValueOnce({ id: 'other', slug: 'new' }); // existingWithSlug

      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(txMock));

      await expect(service.update('c1', { title: 'X', slug: 'new' } as any)).rejects.toMatchObject({ code: 'SLUG_EXISTS' });
    });

    it('update should succeed and update tags', async () => {
      const txMock: any = {
        content: { findFirst: jest.fn().mockResolvedValue({ id: 'c1', slug: 'old' }), update: jest.fn().mockResolvedValue({ id: 'c1' }), findUnique: jest.fn().mockResolvedValue({ id: 'c1' }) },
        category: { findFirst: jest.fn().mockResolvedValue({ id: 'cat' }) },
        tag: { findMany: jest.fn().mockResolvedValue([{ id: 't1' }]) },
        contentTag: { deleteMany: jest.fn(), createMany: jest.fn() }
      };
    // first findFirst returns existingContent, second findFirst should return null (no conflict)
    txMock.content.findFirst.mockResolvedValueOnce({ id: 'c1', slug: 'old' }).mockResolvedValueOnce(null);
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => fn(txMock));

      const res = await service.update('c1', { title: 'New', tagIds: ['t1'] } as any);

      expect(txMock.content.update).toHaveBeenCalled();
      expect(txMock.contentTag.createMany).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('delete should throw when not found', async () => {
      (prisma.content.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.delete('no')).rejects.toMatchObject({ code: 'CONTENT_NOT_FOUND' });
    });

    it('delete should succeed', async () => {
      (prisma.content.findFirst as jest.Mock).mockResolvedValue({ id: 'c1' });
      (prisma.content.update as jest.Mock).mockResolvedValue({});

      const res = await service.delete('c1');
      expect(res).toMatchObject({ message: 'Content deleted successfully' });
    });
  });
});