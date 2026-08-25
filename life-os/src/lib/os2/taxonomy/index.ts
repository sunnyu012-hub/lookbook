/**
 * LIFE TAGS 사전 입구.
 * 바깥에서는 카테고리 파일을 하나씩 import 하지 말고 여기만 본다.
 */
export { defineTags, DEFAULT_CONFIDENCE, type TagSpec } from './define'
export {
  ALL_TAGS,
  DERIVED_TAGS,
  LEAF_TAGS,
  LIFE_TAGS,
  TAGS_BY_CATEGORY,
  TAG_BY_ID,
  categoryNameOf,
  childrenOf,
  collapseToLeaves,
  displayNameOf,
  expandForAnalysis,
  getAncestors,
  getTag,
  isDescendantOf,
  isLeaf,
  searchTags,
  tagsInCategory,
  taxonomyStats,
  validateTaxonomy,
  type TaxonomyProblem,
} from './registry'
