import { PersonalInfo } from '@/types/profile';

interface UserState {
  profile: PersonalInfo | null;
  lastSearch: {
    jobTitle: string;
    location: string;
    timestamp: number;
  } | null;
  profileCompletion: {
    isComplete: boolean;
    lastUpdated: number;
  } | null;
}

const STORAGE_KEY = 'userState';

export const StorageManager = {
  // 保存用户状态
  saveUserState: (state: Partial<UserState>) => {
    const currentState = StorageManager.getUserState();
    const newState = {
      ...currentState,
      ...state,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  },

  // 获取用户状态
  getUserState: (): UserState => {
    const state = localStorage.getItem(STORAGE_KEY);
    return state ? JSON.parse(state) : {
      profile: null,
      lastSearch: null,
      profileCompletion: null,
    };
  },

  // 保存用户档案
  saveProfile: (profile: PersonalInfo) => {
    StorageManager.saveUserState({
      profile,
      profileCompletion: {
        isComplete: true,
        lastUpdated: Date.now(),
      },
    });
  },

  // 保存搜索记录
  saveLastSearch: (jobTitle: string, location: string) => {
    StorageManager.saveUserState({
      lastSearch: {
        jobTitle,
        location,
        timestamp: Date.now(),
      },
    });
  },

  // 清除用户状态
  clearUserState: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  // 检查用户是否完成档案
  isProfileComplete: (): boolean => {
    const state = StorageManager.getUserState();
    return state.profileCompletion?.isComplete || false;
  },

  // 获取上次搜索
  getLastSearch: () => {
    const state = StorageManager.getUserState();
    return state.lastSearch;
  },
}; 