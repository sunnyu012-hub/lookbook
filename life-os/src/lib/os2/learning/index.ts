/** 개인 학습 입구. 바깥에서는 여기만 본다 */
export * from './types'
export {
  extractCorrections,
  isLearnable,
  learnableOnly,
  normalizeText,
  skipReason,
  type SkipReason,
} from './correction'
export {
  buildCandidates,
  candidateKey,
  sharedContext,
  specificityOf,
  type Candidate,
} from './candidates'
export {
  BASE_CONFIDENCE,
  POSITIVE_MIN_COUNT,
  POSITIVE_MIN_DAYS,
  SUPPRESS_MIN_COUNT,
  SUPPRESS_MIN_DAYS,
  TIER_LABEL,
  agreementOf,
  confidenceOf,
  judge,
  reinforce,
  tierOf,
  toRule,
} from './promotion'
export {
  buildMemories,
  canRemember,
  findMemory,
  mergeMemory,
  newMemory,
  type MemoryInput,
} from './memory'
export {
  analyzeWithPersonal,
  matches,
  sameRule,
  type Overlay,
  type PersonalTaggingResult,
} from './apply'
export {
  MIN_ACTIVE_CONFIDENCE,
  STATUS_LABEL,
  applyReview,
  idleDays,
  markMatched,
  review,
  weaken,
  type LifecycleChange,
} from './lifecycle'
export {
  candidatePhrases,
  checkTrigger,
  commonPhrases,
  isLearnableTrigger,
  normalizeTrigger,
  sameTrigger,
} from './trigger'
