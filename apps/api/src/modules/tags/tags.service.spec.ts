jest.mock('../../config/database', () => ({
  __esModule: true,
  default: {
    tag: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createMany: jest.fn(),
    },
  },
}));

import prisma from '../../config/database';
import { TagsService } from './tags.service';

const prismaMock: any = {
  tag: prisma.tag,
};

describe('TagsService', () => {
  let service: TagsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TagsService();
  });

  it('create should create and return tag when no conflict', async () => {
    (prisma.tag.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.tag.create as jest.Mock).mockResolvedValue({ id: 't1', name: 'Tag1', slug: 'tag1', _count: { contentTags: 0 } });

    const res = await service.create({ name: 'Tag1' });

    expect(res.id).toBe('t1');
    expect(prisma.tag.create).toHaveBeenCalled();
  });

  it('create should throw when name exists', async () => {
    (prisma.tag.findFirst as jest.Mock).mockResolvedValue({ id: 't1', name: 'Tag1' });

    await expect(service.create({ name: 'Tag1' })).rejects.toThrow(/Tag with this name already exists/);
  });

  it('findMany should return tags and meta', async () => {
    (prisma.tag.findMany as jest.Mock).mockResolvedValue([{ id: 't1', name: 'A', _count: { contentTags: 2 } }]);
    (prisma.tag.count as jest.Mock).mockResolvedValue(1);

    const res = await service.findMany({ page: 1, pageSize: 10 });

    expect(res.tags.length).toBe(1);
    expect(res.meta.total).toBe(1);
  });

  it('findById should throw when not found', async () => {
    (prisma.tag.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.findById('no')).rejects.toThrow(/Tag not found/);
  });

  it('delete should throw when tag in use', async () => {
    (prisma.tag.findUnique as jest.Mock).mockResolvedValue({ id: 't1', _count: { contentTags: 3 } });

    await expect(service.delete('t1')).rejects.toThrow(/Cannot delete tag that is assigned to content/);
  });

  it('bulkCreate should create new tags and return list', async () => {
    (prisma.tag.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.tag.createMany as jest.Mock).mockResolvedValue({ count: 2 });
    (prisma.tag.findMany as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 't1', name: 'One' }, { id: 't2', name: 'Two' }]);

    const res = await service.bulkCreate(['One', 'Two']);

    expect(Array.isArray(res)).toBe(true);
  });

  it('getTagStats should return counts', async () => {
    (prisma.tag.count as jest.Mock).mockResolvedValueOnce(10).mockResolvedValueOnce(6).mockResolvedValueOnce(4);
    (prisma.tag.findMany as jest.Mock).mockResolvedValue([{ id: 't1', name: 'Top', _count: { contentTags: 5 } }]);

    const stats = await service.getTagStats();

    expect(stats.totalTags).toBe(10);
    expect(stats.topTags.length).toBeGreaterThan(0);
  });
});