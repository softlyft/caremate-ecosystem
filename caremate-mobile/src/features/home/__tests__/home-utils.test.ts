import {
  getDailyHealthTip,
  getHealthTipsForCategory,
} from '@/features/home/utils/daily-health-tip';

const mockFindActive = jest.fn();
const mockFindActiveByCategory = jest.fn();

jest.mock('@/domains/tips/repository', () => ({
  healthTipRepository: {
    findActive: (...args: unknown[]) => mockFindActive(...args),
    findActiveByCategory: (...args: unknown[]) => mockFindActiveByCategory(...args),
  },
}));

describe('daily health tip', () => {
  beforeEach(() => {
    mockFindActive.mockReset();
    mockFindActiveByCategory.mockReset();
  });

  it('returns null when no tips exist', async () => {
    mockFindActive.mockResolvedValue([]);
    await expect(getDailyHealthTip('user-1', new Date('2026-01-15'))).resolves.toBeNull();
  });

  it('picks a deterministic tip for a user/day', async () => {
    mockFindActive.mockResolvedValue([
      { id: '1', categoryId: 'nutrition', body: 'Drink water', active: true },
      { id: '2', categoryId: 'fitness', body: 'Walk daily', active: true },
      { id: '3', categoryId: 'heart', body: 'Check blood pressure', active: true },
    ]);

    const tip = await getDailyHealthTip('guest', new Date('2026-01-15'));
    expect(tip).toEqual(
      expect.objectContaining({
        tip: expect.any(String),
        categoryId: expect.any(String),
        emoji: expect.any(String),
        tipIndex: expect.any(Number),
      }),
    );
  });

  it('returns null when chosen tip body is blank', async () => {
    mockFindActive.mockResolvedValue([
      { id: '1', categoryId: 'heart', body: '  ', active: true },
      { id: '2', categoryId: 'child', body: '  ', active: true },
      { id: '3', categoryId: 'pregnancy', body: '  ', active: true },
      { id: '4', categoryId: 'mental', body: '  ', active: true },
      { id: '5', categoryId: 'medication', body: '  ', active: true },
      { id: '6', categoryId: 'nutrition', body: '  ', active: true },
      { id: '7', categoryId: 'fitness', body: '  ', active: true },
      { id: '8', categoryId: 'infectious', body: '  ', active: true },
    ]);
    await expect(getDailyHealthTip('guest', new Date('2026-01-01'))).resolves.toBeNull();
  });

  it('lists tip bodies for a category', async () => {
    mockFindActiveByCategory.mockResolvedValue([
      { id: '1', categoryId: 'nutrition', body: 'Eat greens', active: true },
    ]);
    await expect(getHealthTipsForCategory('nutrition')).resolves.toEqual(['Eat greens']);
  });
});
