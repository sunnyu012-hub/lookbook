import type { AppState } from '@/types'

export const STATE_VERSION = 1

export function createDefaultState(): AppState {
  return {
    version: STATE_VERSION,
    user: {
      name: 'Traveler',
      level: 1,
      currentExp: 0,
      totalExp: 0,
    },
    quests: [],
  }
}
