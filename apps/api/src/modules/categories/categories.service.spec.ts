// Tests for CategoriesService
jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    category: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import prisma from '../../config/database';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoriesService();
  });

  it('create should succeed and generate slug', async () => {
    (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.category.create as jest.Mock).mockResolvedValue({ id: 'c1', name: 'My Category', slug: 'my-category', _count: { content: 0 } });

    const res = await service.create({ name: 'My Category' });

    expect(res.name).toBe('My Category');
    expect(res.slug).toBe('my-category');
    expect(prisma.category.create).toHaveBeenCalled();
  });

  it('create should throw on duplicate name', async () => {
    (prisma.category.findFirst as jest.Mock).mockResolvedValue({ id: 'c1', name: 'My Category' });

    await expect(service.create({ name: 'My Category' })).rejects.toMatchObject({ code: 'CATEGORY_NAME_EXISTS' });
  });

  it('create should throw on duplicate slug', async () => {
    // Name will generate slug 'my-category', and existing has same slug
    (prisma.category.findFirst as jest.Mock).mockResolvedValue({ id: 'c2', slug: 'my-category' });

    await expect(service.create({ name: 'My Category' })).rejects.toMatchObject({ code: 'CATEGORY_SLUG_EXISTS' });
  });

  it('findById should throw when not found', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.findById('no')).rejects.toMatchObject({ code: 'CATEGORY_NOT_FOUND' });
  });

  it('update should succeed when no conflicts', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ id: 'c1', name: 'Old' });
    (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.category.update as jest.Mock).mockResolvedValue({ id: 'c1', name: 'New' });

    const res = await service.update('c1', { name: 'New' });

    expect(res.name).toBe('New');
    expect(prisma.category.update).toHaveBeenCalled();
  });

  it('update should throw on name conflict', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ id: 'c1', name: 'Old' });
    (prisma.category.findFirst as jest.Mock).mockResolvedValue({ id: 'c2', name: 'New' });

    await expect(service.update('c1', { name: 'New' })).rejects.toMatchObject({ code: 'CATEGORY_NAME_EXISTS' });
  });

  it('delete should throw when not found', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.delete('no')).rejects.toMatchObject({ code: 'CATEGORY_NOT_FOUND' });
  });

  it('delete should throw when has content', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ id: 'c1', _count: { content: 2 } });

    await expect(service.delete('c1')).rejects.toMatchObject({ code: 'CATEGORY_HAS_CONTENT' });
  });

  it('delete should succeed when no content', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue({ id: 'c1', _count: { content: 0 } });
    (prisma.category.delete as jest.Mock).mockResolvedValue({});

    const res = await service.delete('c1');

    expect(res).toMatchObject({ message: 'Category deleted successfully' });
  });
});