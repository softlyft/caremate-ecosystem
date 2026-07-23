import { migrateGuestLocalData } from '@/domains/auth/migrate-guest-data';
import { GUEST_USER_ID } from '@/constants/guest';

const mockIsDatabaseInitialized = jest.fn();
const mockMigrateGuestToUser = jest.fn();
const mockEmergencyFind = jest.fn();
const mockEmergencySave = jest.fn();
const mockGetSettings = jest.fn();
const mockSaveSettings = jest.fn();
const mockFindProfile = jest.fn();
const mockSaveProfile = jest.fn();
const mockFindHousehold = jest.fn();
const mockIsBookmarked = jest.fn();
const mockToggleBookmark = jest.fn();
const mockGetReadStatus = jest.fn();
const mockMarkRead = jest.fn();
const mockMarkReading = jest.fn();

const mockDbState = {
  bookmarks: [] as { articleId: string }[],
  reads: [] as { articleId: string; status: string }[],
  members: [] as { id: string; linkedUserId: string | null }[],
  requests: [] as {
    id: string;
    fromUserId: string;
    toUserId: string;
  }[],
  queue: [] as { id: string; entityType: string; entityId: string; payload: string }[],
  updates: [] as unknown[],
  selectResults: [] as unknown[][],
};

jest.mock('@/database/client', () => ({
  isDatabaseInitialized: (...args: unknown[]) => mockIsDatabaseInitialized(...args),
  getDatabase: () => ({
    select: () => ({
      from: () => {
        let consumed = false;
        const take = () => {
          if (consumed) {
            return [];
          }
          consumed = true;
          if (mockDbState.selectResults.length > 0) {
            return mockDbState.selectResults.shift() ?? [];
          }
          return [];
        };
        return {
          where: () => {
            const rowsPromise = Promise.resolve().then(() => take());
            return {
              orderBy: () => ({
                limit: () => rowsPromise,
              }),
              then: (resolve: (value: unknown) => void, reject?: (reason: unknown) => void) =>
                rowsPromise.then(resolve, reject),
            };
          },
          then: (resolve: (value: unknown) => void, reject?: (reason: unknown) => void) =>
            Promise.resolve(take()).then(resolve, reject),
        };
      },
    }),
    update: () => ({
      set: (values: unknown) => ({
        where: async () => {
          mockDbState.updates.push(values);
        },
      }),
    }),
  }),
}));

jest.mock('@/domains/emergency/repository', () => ({
  emergencyRepository: {
    findByUserId: (...args: unknown[]) => mockEmergencyFind(...args),
    save: (...args: unknown[]) => mockEmergencySave(...args),
  },
}));

jest.mock('@/domains/articles/repository', () => ({
  articleRepository: {
    isBookmarked: (...args: unknown[]) => mockIsBookmarked(...args),
    toggleBookmark: (...args: unknown[]) => mockToggleBookmark(...args),
    getReadStatus: (...args: unknown[]) => mockGetReadStatus(...args),
    markRead: (...args: unknown[]) => mockMarkRead(...args),
    markReading: (...args: unknown[]) => mockMarkReading(...args),
  },
}));

jest.mock('@/domains/profile/repository', () => ({
  profileRepository: {
    getSettings: (...args: unknown[]) => mockGetSettings(...args),
    saveSettings: (...args: unknown[]) => mockSaveSettings(...args),
    findByUserId: (...args: unknown[]) => mockFindProfile(...args),
    save: (...args: unknown[]) => mockSaveProfile(...args),
  },
}));

jest.mock('@/domains/family/repository', () => ({
  familyRepository: {
    findHouseholdForUser: (...args: unknown[]) => mockFindHousehold(...args),
  },
}));

jest.mock('@/domains/notifications/repository', () => ({
  notificationRepository: {
    migrateGuestToUser: (...args: unknown[]) => mockMigrateGuestToUser(...args),
  },
}));

describe('migrateGuestLocalData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDbState.bookmarks = [];
    mockDbState.reads = [];
    mockDbState.members = [];
    mockDbState.requests = [];
    mockDbState.queue = [];
    mockDbState.updates = [];
    mockDbState.selectResults = [];
    mockIsDatabaseInitialized.mockReturnValue(true);
    mockMigrateGuestToUser.mockResolvedValue(undefined);
    mockEmergencyFind.mockResolvedValue(null);
    mockGetSettings.mockResolvedValue(null);
    mockFindProfile.mockResolvedValue(null);
    mockFindHousehold.mockResolvedValue(null);
    mockIsBookmarked.mockResolvedValue(false);
    mockGetReadStatus.mockResolvedValue(null);
  });

  it('no-ops for missing db, blank user, or guest target', async () => {
    mockIsDatabaseInitialized.mockReturnValue(false);
    await migrateGuestLocalData('user-1');
    mockIsDatabaseInitialized.mockReturnValue(true);
    await migrateGuestLocalData('');
    await migrateGuestLocalData(GUEST_USER_ID);
    expect(mockMigrateGuestToUser).not.toHaveBeenCalled();
  });

  it('copies guest emergency profile onto an empty target', async () => {
    mockEmergencyFind.mockImplementation(async (userId: string) =>
      userId === GUEST_USER_ID
        ? {
            fullName: 'Guest',
            photoUrl: null,
            bloodGroup: 'O+',
            genotype: null,
            allergies: ['peanut'],
            currentMedications: [],
            chronicConditions: [],
            emergencyContacts: [],
            preferredHospital: null,
            insuranceProvider: null,
            notes: null,
          }
        : null,
    );

    await migrateGuestLocalData('user-1');
    expect(mockEmergencySave).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ fullName: 'Guest', bloodGroup: 'O+' }),
    );
  });

  it('merges guest emergency into a sparse target profile', async () => {
    mockEmergencyFind.mockImplementation(async (userId: string) =>
      userId === GUEST_USER_ID
        ? {
            fullName: 'Guest Name',
            photoUrl: 'guest.png',
            bloodGroup: 'A+',
            genotype: 'AA',
            allergies: ['dust'],
            currentMedications: ['asa'],
            chronicConditions: [],
            emergencyContacts: [{ name: 'Mom', phone: '1' }],
            preferredHospital: 'Lagos General',
            insuranceProvider: 'AIICO',
            notes: 'note',
          }
        : {
            fullName: 'Ada',
            photoUrl: null,
            bloodGroup: null,
            genotype: null,
            allergies: [],
            currentMedications: [],
            chronicConditions: [],
            emergencyContacts: [],
            preferredHospital: null,
            insuranceProvider: null,
            notes: null,
          },
    );

    await migrateGuestLocalData('user-1');
    expect(mockEmergencySave).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        bloodGroup: 'A+',
        preferredHospital: 'Lagos General',
        allergies: ['dust'],
      }),
    );
  });

  it('merges guest settings and profile into an existing account', async () => {
    mockGetSettings.mockImplementation(async (userId: string) =>
      userId === GUEST_USER_ID
        ? { theme: 'dark', notificationsEnabled: true, subscribedCategoryIds: ['heart'] }
        : { theme: 'system', notificationsEnabled: false, subscribedCategoryIds: [] },
    );
    mockFindProfile.mockImplementation(async (userId: string) =>
      userId === GUEST_USER_ID
        ? {
            fullName: 'Guest',
            email: null,
            phone: null,
            dateOfBirth: '2000-01-01',
            avatarUrl: null,
            countryCode: 'NG',
            languageCode: 'en',
            state: 'Lagos',
            patientId: null,
          }
        : {
            fullName: 'Ada',
            email: 'a@example.com',
            phone: null,
            dateOfBirth: null,
            avatarUrl: null,
            countryCode: null,
            languageCode: null,
            state: null,
            patientId: '123',
          },
    );

    await migrateGuestLocalData('user-1');
    expect(mockSaveSettings).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ theme: 'light', subscribedCategoryIds: ['heart'] }),
    );
    expect(mockSaveProfile).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ countryCode: 'NG', dateOfBirth: '2000-01-01' }),
    );
  });

  it('copies settings and profile when the target has none', async () => {
    mockGetSettings.mockImplementation(async (userId: string) =>
      userId === GUEST_USER_ID
        ? { theme: 'light', notificationsEnabled: true, subscribedCategoryIds: [] }
        : null,
    );
    mockFindProfile.mockImplementation(async (userId: string) =>
      userId === GUEST_USER_ID
        ? {
            fullName: 'Guest',
            email: 'g@example.com',
            phone: null,
            dateOfBirth: null,
            avatarUrl: null,
            countryCode: 'GH',
            languageCode: 'en',
            state: null,
            patientId: null,
          }
        : null,
    );

    await migrateGuestLocalData('user-1');
    expect(mockSaveSettings).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ theme: 'light' }),
    );
    expect(mockSaveProfile).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ countryCode: 'GH', email: 'g@example.com' }),
    );
  });

  it('migrates guest bookmarks and article reads', async () => {
    mockDbState.selectResults = [
      [{ articleId: 'a1', userId: 'guest', deletedAt: null }],
      [
        { articleId: 'a2', status: 'read', userId: 'guest', deletedAt: null },
        { articleId: 'a3', status: 'reading', userId: 'guest', deletedAt: null },
      ],
    ];
    mockIsBookmarked.mockResolvedValue(false);
    mockGetReadStatus.mockResolvedValue(null);

    await migrateGuestLocalData('user-1');
    expect(mockToggleBookmark).toHaveBeenCalledWith('user-1', 'a1');
    expect(mockMarkRead).toHaveBeenCalledWith('user-1', 'a2');
    expect(mockMarkReading).toHaveBeenCalledWith('user-1', 'a3');
  });

  it('reassigns guest family ownership when the user has no household', async () => {
    mockFindHousehold.mockImplementation(async (userId: string) =>
      userId === GUEST_USER_ID ? { id: 'hh-1' } : null,
    );
    mockDbState.selectResults = [
      // rewriteQueuePayloads for household
      [
        {
          id: 'q1',
          entityType: 'family_households',
          entityId: 'hh-1',
          payload: JSON.stringify({ createdByUserId: GUEST_USER_ID }),
        },
      ],
      // members
      [{ id: 'm1', linkedUserId: GUEST_USER_ID, householdId: 'hh-1', deletedAt: null }],
      // rewriteQueuePayloads for member
      [
        {
          id: 'q2',
          entityType: 'family_members',
          entityId: 'm1',
          payload: JSON.stringify({ linkedUserId: GUEST_USER_ID }),
        },
      ],
      // connection requests
      [
        {
          id: 'r1',
          fromUserId: GUEST_USER_ID,
          toUserId: 'u2',
          householdId: 'hh-1',
          deletedAt: null,
        },
      ],
      // rewriteQueuePayloads for request
      [
        {
          id: 'q3',
          entityType: 'family_connection_requests',
          entityId: 'r1',
          payload: JSON.stringify({ fromUserId: GUEST_USER_ID, toUserId: 'u2' }),
        },
      ],
    ];

    await migrateGuestLocalData('user-1');
    expect(mockDbState.updates.length).toBeGreaterThan(0);
  });
});
