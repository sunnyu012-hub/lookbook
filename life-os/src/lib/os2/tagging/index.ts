/** 자동 태깅 입구. 바깥에서는 여기만 본다 */
export {
  CONFIDENCE_THRESHOLD,
  MAX_TAGS_PER_LOG,
  TAGGING_RULE_VERSION,
  analyze,
  tagName,
  type RejectedTag,
  type TaggingInput,
  type TaggingResult,
} from './engine'
export {
  activeTags,
  addUserTag,
  clearDecision,
  isDecided,
  needsRetag,
  rejectTag,
  retag,
  verifyTag,
  withTags,
  type TagStamp,
} from './apply'
export { countsAsHappened, temporalLabel } from './temporal'
export { conflicts } from './conflicts'
export { makeView, findTerm, splitClauses, type TextView } from './normalize'
