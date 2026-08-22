import type {
  AcquisitionSource,
  CollectionCategory,
  CollectionItemDef,
  CollectionRarity,
  CollectionShopId,
  Footprint,
} from '@/types'
import type { AreaId, Category, NpcId } from '@/types'

/**
 * 240개의 작은 것들.
 *
 * 이 표가 이 시스템의 전부다. 화면 코드에는 아이템 이름이 하나도 없다.
 * 여기에 한 줄을 더하면 상점·도감·제작·드롭·위시리스트가 전부 알아서 안다.
 *
 * 한 줄은 이렇게 읽는다:
 *   [id, 이름, 이모지, 등급, 가격, 한 줄 설명, 획득처]
 *
 * 가격 0 은 "돈으로는 못 산다" 는 뜻이다. 240개가 전부 상점 물건이면
 * 지도를 열 이유가 없어진다. 절반 조금 넘게만 판다.
 *
 * 획득처 코드 (여러 개면 | 로 잇는다):
 *   S:상점id   가게에서 판다
 *   C          만들 수 있다
 *   Q / Q:LIFE 퀘스트를 끝내다 얻는다 (분야를 적으면 그 분야에서만)
 *   N:사람:친밀도 도시 사람이 그만큼 가까워지면 준다
 *   B          보스를 넘으면
 *   E          그날 도시에 무슨 일이 있으면
 *   R:지역:단계 그 동네에서 얼굴이 알려지면
 *   M:개수     도감을 그만큼 채우면
 *   T          현실에서 쌓은 것이 트로피가 되어
 *   G:세트id   세트를 완성하면
 *   X:힌트     조건을 알려주지 않는 것 (힌트 없으면 그냥 X)
 */

type RCode = 'C' | 'R' | 'E' | 'L' | 'S'
type Row = readonly [id: string, name: string, icon: string, rarity: RCode, price: number, desc: string, src: string]

const RARITY: Record<RCode, CollectionRarity> = {
  C: 'COMMON',
  R: 'RARE',
  E: 'EPIC',
  L: 'LEGENDARY',
  S: 'SECRET',
}

/**
 * 방에서 차지하는 자리. 분류마다 대체로 정해져 있다.
 * 정확한 크기를 아이템마다 적게 하면 표가 두 배로 길어지고, 그만한 값어치는 없다.
 */
const FOOTPRINT: Record<CollectionCategory, Footprint> = {
  FURNITURE: { width: 26, height: 22 },
  LIGHTING: { width: 13, height: 17 },
  PLANT: { width: 13, height: 17 },
  RUG: { width: 40, height: 14 },
  WALL: { width: 16, height: 14 },
  LITTLE_THING: { width: 10, height: 10 },
  KITCHEN: { width: 11, height: 11 },
  FOOD: { width: 10, height: 10 },
  BOOK: { width: 11, height: 11 },
  HOBBY: { width: 15, height: 14 },
  TECH: { width: 15, height: 14 },
  OUTDOOR: { width: 17, height: 15 },
  MAGIC: { width: 11, height: 11 },
  TROPHY: { width: 13, height: 15 },
  MATERIAL: { width: 9, height: 9 },
}

const SUB_FOOTPRINT: Record<string, Footprint> = {
  // 담요와 쿠션은 러그처럼 바닥을 다 덮지 않는다
  천: { width: 15, height: 13 },
  침대: { width: 32, height: 22 },
  소파: { width: 31, height: 19 },
  의자: { width: 15, height: 17 },
  책상: { width: 27, height: 19 },
  수납: { width: 21, height: 23 },
}

function parseSources(code: string): AcquisitionSource[] {
  const out: AcquisitionSource[] = []

  for (const raw of code.split('|')) {
    const part = raw.trim()
    if (!part) continue
    const [kind, a, b] = part.split(':')

    switch (kind) {
      case 'S':
        out.push({ kind: 'SHOP', shopId: a as CollectionShopId })
        break
      case 'C':
        out.push({ kind: 'CRAFT' })
        break
      case 'Q':
        out.push({ kind: 'QUEST', category: (a as Category) ?? null })
        break
      case 'N':
        // N:MINA:40 — 그만큼 가까워지면 건네준다. 안 적으면 30.
        out.push({ kind: 'NPC', npcId: a as NpcId, friendship: Number(b) || 30 })
        break
      case 'B':
        out.push({ kind: 'BOSS' })
        break
      case 'E':
        out.push({ kind: 'EVENT' })
        break
      case 'R':
        out.push({ kind: 'REPUTATION', areaId: a as AreaId, level: Number(b) || 1 })
        break
      case 'M':
        out.push({ kind: 'MILESTONE', count: Number(a) || 10 })
        break
      case 'T':
        out.push({ kind: 'TROPHY' })
        break
      case 'G':
        out.push({ kind: 'SET', setId: a })
        break
      case 'X':
        out.push({ kind: 'SECRET', hint: a ?? null })
        break
      default:
        break
    }
  }
  return out
}

function group(
  category: CollectionCategory,
  subcategory: string,
  rows: readonly Row[],
): CollectionItemDef[] {
  return rows.map(([id, nameKo, icon, rarity, price, description, src]) => {
    const r = RARITY[rarity]
    const secret = r === 'SECRET'

    return {
      id,
      nameKo,
      category,
      subcategory,
      rarity: r,
      description,
      ...(price > 0 ? { price, sellPrice: Math.floor(price * 0.35) } : {}),
      ...(icon ? { icon } : {}),
      // 이모지가 곧 그림이다. 없는 것은 아직 그림이 없는 물건이고,
      // 도감에는 분류 실루엣으로 나오고 방에는 아직 놓을 수 없다.
      hasPlaceableAsset: icon !== '',
      placeable: category !== 'MATERIAL',
      footprint: SUB_FOOTPRINT[subcategory] ?? FOOTPRINT[category],
      acquisitionSources: parseSources(src),
      collectionSetIds: [],
      tags: [subcategory],
      stackable: r !== 'LEGENDARY' && !secret,
      unique: r === 'LEGENDARY' || secret,
      ...(secret ? { hiddenUntilDiscovered: true } : {}),
    }
  })
}

// ── A. 가구 50 ──────────────────────────────────────────
const BEDS: readonly Row[] = [
  ['cream_bed', '포근한 크림 침대', '🛏️', 'C', 120, '하루가 시작되고 끝나는 자리.', 'S:HOME_ATELIER'],
  ['cloud_bed', '구름처럼 푹신한 침대', '🛏️', 'E', 650, '누우면 5분이 30분이 된다.', 'S:HOME_ATELIER'],
  ['wood_bed', '작은 원목 침대', '🛏️', 'C', 110, '삐걱대는 소리까지 익숙해졌다.', 'S:HOME_ATELIER'],
  ['daybed', '낮잠용 데이베드', '🛋️', 'R', 290, '밤에 자려고 산 건 아니었다.', 'S:HOME_ATELIER'],
]

const SOFAS: readonly Row[] = [
  ['check_sofa', '체크무늬 소파', '🛋️', 'C', 145, '앉으면 일어나기가 조금 어려워진다.', 'S:HOME_ATELIER'],
  ['pink_sofa', '말랑 핑크 소파', '🛋️', 'R', 310, '누가 봐도 낮잠용이다.', 'S:HOME_ATELIER'],
  ['sage_chair', '세이지 1인 소파', '🪑', 'R', 265, '혼자 앉기 딱 좋은 크기.', 'S:HOME_ATELIER'],
  ['vintage_sofa', '빈티지 브라운 소파', '🛋️', 'E', 640, '먼저 쓰던 사람의 자국이 조금 남아 있다.', 'S:JUNE_VINTAGE'],
]

const CHAIRS: readonly Row[] = [
  ['rattan_chair', '작은 라탄 의자', '🪑', 'C', 95, '앉을 때마다 여름 소리가 난다.', 'S:HOME_ATELIER'],
  ['round_stool', '동그란 스툴', '🪑', 'C', 55, '의자였다가 발판이었다가 한다.', 'S:TINY_MARKET|S:FLEA_MARKET'],
  ['mushroom_stool', '버섯 스툴', '🍄', 'R', 0, '앉으면 조금 웃기다. 그게 좋다.', 'C'],
  ['work_chair', '작업용 나무 의자', '🪑', 'C', 85, '등을 펴게 만드는 각도.', 'S:HOME_ATELIER'],
  ['reading_chair', '푹신한 독서 의자', '🪑', 'E', 700, '한 장만 더, 를 세 번쯤 한다.', 'S:HOME_ATELIER'],
  ['acrylic_chair', '투명 아크릴 의자', '🪑', 'R', 0, '방이 좁아 보이지 않는다는 이유 하나로.', 'B'],
]

const DESKS: readonly Row[] = [
  ['wood_desk', '작은 원목 책상', '', 'C', 135, '노트북 하나와 컵 하나면 꽉 찬다.', 'S:HOME_ATELIER'],
  ['window_desk', '창가 작업 책상', '', 'R', 300, '고개만 들면 바깥이 있다.', 'S:HOME_ATELIER'],
  ['cafe_table', '둥근 카페 테이블', '', 'E', 0, '집에서 마시는 커피 맛이 조금 달라진다.', 'R:CAFE_STREET:3'],
  ['tea_table', '낮은 티 테이블', '', 'R', 180, '책이 한 권씩 쌓이는 자리.', 'S:HOME_ATELIER'],
  ['vintage_side_table', '빈티지 사이드테이블', '', 'R', 260, '서랍에서 오래된 영수증이 나왔다.', 'S:JUNE_VINTAGE|S:FLEA_MARKET'],
  ['star_side_table', '별빛 사이드테이블', '✨', 'E', 0, '밤에만 아주 조금 빛난다.', 'C'],
  ['small_nightstand', '작은 협탁', '', 'C', 70, '안경과 물컵의 자리.', 'S:HOME_ATELIER'],
]

const STORAGE: readonly Row[] = [
  ['drawer_nightstand', '서랍 달린 협탁', '🗄️', 'C', 110, '뭘 넣었는지 잊어버리기 좋은 크기.', 'S:HOME_ATELIER'],
  ['mini_shelf', '미니 책장', '📚', 'C', 120, '세 칸이면 충분할 줄 알았다.', 'S:PAPER_MOON'],
  ['low_shelf', '낮은 원목 책장', '📚', 'C', 140, '위에 화분을 올리게 된다.', 'S:PAPER_MOON|S:JUNE_VINTAGE'],
  ['full_shelf', '꽉 찬 책장', '📚', 'L', 0, '언젠가 다 읽을 것들.', 'B'],
  ['glass_cabinet', '빈티지 유리 장식장', '🪟', 'L', 0, '안에 넣을 것부터 고민하게 된다.', 'B'],
  ['small_cabinet', '작은 수납장', '🗄️', 'C', 100, '치웠다기보다 넣어둔 것에 가깝다.', 'S:HOME_ATELIER'],
  ['cream_drawer', '크림색 서랍장', '🗄️', 'C', 150, '세 번째 칸은 늘 잡동사니.', 'S:HOME_ATELIER|S:FLEA_MARKET|S:JUNE_VINTAGE'],
  ['sage_cabinet', '세이지 캐비닛', '🗄️', 'E', 660, '색만으로 방이 조용해졌다.', 'S:HOME_ATELIER'],
  ['rattan_storage', '라탄 수납장', '🧺', 'R', 250, '안 보이면 없는 거나 마찬가지.', 'S:HOME_ATELIER|S:FLEA_MARKET'],
  ['small_hanger', '작은 옷걸이 행거', '🧥', 'C', 90, '옷장이 되기 직전의 상태.', 'S:TINY_MARKET|S:FLEA_MARKET|S:JUNE_VINTAGE'],
  ['coat_rack', '벽걸이 코트랙', '🧥', 'C', 0, '돌아오면 제일 먼저 걸리는 것.', 'C'],
]

const OTHER_FURNITURE: readonly Row[] = [
  ['wood_bench', '원목 벤치', '', 'C', 0, '앉기도 하고 올려두기도 한다.', 'C'],
  ['window_bench', '창가 벤치', '', 'R', 0, '여기 앉으면 시간이 늦게 간다.', 'B'],
  ['beanbag', '푹신한 빈백', '', 'R', 180, '한 번 앉으면 자세가 무너진다.', 'S:HOME_ATELIER'],
  ['pink_beanbag', '분홍 빈백', '', 'R', 260, '방에서 제일 위험한 자리.', 'S:HOME_ATELIER'],
  ['floor_chair', '낮잠용 플로어 체어', '', 'R', 230, '바닥과 의자 사이 어디쯤.', 'S:HOME_ATELIER'],
  ['vanity', '작은 화장대', '🪞', 'R', 0, '아침에 3분쯤 더 쓰게 된다.', 'R:HOME_BASE:3'],
  ['round_vanity', '둥근 거울 화장대', '🪞', 'L', 0, '거울이 둥글면 얼굴도 둥글게 보인다.', 'B'],
  ['mini_table', '미니 식탁', '', 'R', 170, '혼자 먹기 좋은 크기.', 'S:HOME_ATELIER'],
  ['duo_table', '둘이 앉는 식탁', '', 'R', 0, '언젠가 누가 오면.', 'B'],
  ['kitchen_shelf', '작은 주방 선반', '', 'C', 95, '자주 쓰는 것만 남는다.', 'S:TINY_MARKET'],
  ['home_cafe_cart', '홈카페 카트', '☕', 'E', 0, '여기 있으면 나가기가 귀찮아진다.', 'R:CAFE_STREET:2'],
  ['trolley', '이동식 트롤리', '', 'C', 130, '굴러다니는 수납.', 'S:TINY_MARKET'],
  ['record_cabinet', '레코드 수납장', '💿', 'E', 0, '제목이 보이게 꽂아두는 편.', 'R:CREATIVE_DISTRICT:3'],
  ['craft_cabinet', '취미 재료 캐비닛', '🧰', 'E', 720, '언젠가 다 쓸 것들.', 'S:HOBBY_CORNER'],
  ['shoe_cabinet', '작은 신발장', '👟', 'C', 120, '현관이 조금 넓어졌다.', 'S:TINY_MARKET'],
  ['entry_bench', '현관 벤치', '', 'C', 105, '신발 신을 때만 쓰는 자리.', 'S:TINY_MARKET'],
  ['window_ledge', '창가 선반', '', 'C', 0, '화분 두 개가 딱 들어간다.', 'C'],
  ['secret_drawer', '비밀 서랍장', '🗝️', 'S', 0, '안에 뭐가 있었는지는 나만 안다.', 'X'],
]

// ── B. 조명 20 ──────────────────────────────────────────
const LIGHTS: readonly Row[] = [
  ['floor_lamp', '따뜻한 플로어 램프', '💡', 'C', 130, '천장 불을 안 켜게 된다.', 'S:HOME_ATELIER'],
  ['mushroom_lamp', '작은 버섯 램프', '🍄', 'R', 0, '머리맡에 두면 밤이 둥글어진다.', 'C'],
  ['cloud_light', '구름 무드등', '☁️', 'R', 0, '천장에 작은 날씨가 생긴다.', 'C'],
  ['moon_light', '달빛 무드등', '🌙', 'R', 320, '불을 끄기 전 마지막 빛.', 'S:MOON_STALL'],
  ['star_lamp', '별 조각 램프', '⭐', 'E', 560, '작은 조각인데 방을 다 채운다.', 'S:MOON_STALL'],
  ['vintage_lamp', '빈티지 테이블 램프', '💡', 'E', 600, '스위치 소리가 좋다.', 'S:JUNE_VINTAGE'],
  ['green_stand', '초록 갓 스탠드', '💡', 'C', 145, '책상만 밝히는 빛.', 'S:PAPER_MOON'],
  ['pink_glass_lamp', '핑크 유리 램프', '💡', 'R', 340, '빛이 살구색으로 나온다.', 'S:HOME_ATELIER'],
  ['reading_light', '작은 독서등', '🔦', 'C', 90, '옆 사람을 깨우지 않는 밝기.', 'S:PAPER_MOON'],
  ['candle_light', '캔들 라이트', '🕯️', 'C', 0, '불이 아닌데 흔들린다.', 'C'],
  ['sunset_lamp', '노을빛 조명', '🌇', 'E', 760, '6시의 색을 아무 때나 켠다.', 'S:MOON_STALL'],
  ['raindrop_light', '빗방울 조명', '💧', 'R', 0, '비 오는 날에만 켜고 싶어진다.', 'C'],
  ['bud_lamp', '꽃봉오리 램프', '🌷', 'E', 660, '아직 피지 않은 채로 빛난다.', 'S:GREEN_HOUSE'],
  ['paper_lantern', '종이등', '🏮', 'C', 0, '빛이 종이를 지나면 부드러워진다.', 'N:NOA:20'],
  ['neon_star', '작은 네온 별', '⭐', 'R', 0, '방 한쪽만 조금 시끄럽다.', 'G:little_gamer'],
  ['firefly_jar', '반딧불 유리병', '🫙', 'E', 0, '잡은 게 아니라 놀러 온 거라고 해두자.', 'C'],
  ['star_projector', '밤하늘 프로젝터', '🌌', 'L', 1400, '천장이 없어진다.', 'S:MOON_STALL'],
  ['moon_globe', 'Moon Globe', '🌕', 'L', 0, '밤 도시를 다 돌고 나서야 손에 들어온 것.', 'T'],
  ['cat_lamp', '잠든 고양이 램프', '🐈', 'E', 0, '불을 켜도 안 깬다.', 'G:vintage_soul'],
  ['dawn_lamp', '새벽빛 램프', '🌅', 'L', 0, '제일 먼저 켜지는 빛.', 'B'],
]

// ── C. 식물 25 ──────────────────────────────────────────
const PLANTS: readonly Row[] = [
  ['small_monstera', '작은 몬스테라', '🪴', 'C', 90, '잎이 하나 늘 때마다 기분이 좋다.', 'S:GREEN_HOUSE'],
  ['big_monstera', '커다란 몬스테라', '🪴', 'E', 0, '방에서 제일 큰 생물.', 'R:GREEN_PARK:3'],
  ['succulent', '동글동글 다육이', '🪴', 'C', 40, '물을 잊어도 화내지 않는다.', 'S:GREEN_HOUSE'],
  ['mini_cactus', '미니 선인장', '🌵', 'C', 45, '가시가 있어도 귀엽다.', 'S:GREEN_HOUSE'],
  ['bunny_cactus', '토끼귀 선인장', '🌵', 'R', 180, '귀가 두 개라 그렇게 부른다.', 'S:GREEN_HOUSE'],
  ['rubber_tree', '작은 고무나무', '🪴', 'C', 110, '튼튼해서 미안할 지경.', 'S:GREEN_HOUSE'],
  ['olive_tree', '올리브 나무', '🫒', 'E', 0, '햇빛만 있으면 알아서 산다.', 'R:GREEN_PARK:2'],
  ['window_ivy', '창가 아이비', '🌿', 'C', 0, '창틀을 따라 조금씩 간다.', 'C'],
  ['pothos', '늘어진 포토스', '🌿', 'C', 0, '선반 위에서 아래로 흐른다.', 'C'],
  ['herb_pot', '작은 허브 화분', '🌿', 'C', 0, '손으로 스치면 냄새가 난다.', 'C'],
  ['basil_pot', '바질 화분', '🌿', 'C', 0, '요리를 안 해도 키운다.', 'C'],
  ['rosemary_pot', '로즈마리 화분', '🌿', 'C', 0, '지나갈 때마다 한 번씩 만진다.', 'C'],
  ['lavender_pot', '라벤더 화분', '💜', 'R', 0, '밤에 냄새가 더 진하다.', 'G:sage_day'],
  ['yellow_tulip', '노란 튤립', '🌷', 'C', 55, '봄이 며칠 먼저 왔다.', 'S:GREEN_HOUSE'],
  ['pink_tulip', '분홍 튤립', '🌷', 'C', 55, '한 송이만 사도 된다.', 'S:GREEN_HOUSE'],
  ['white_daisy', '흰 데이지', '🌼', 'C', 50, '아무 데나 두어도 어울린다.', 'S:GREEN_HOUSE'],
  ['rose_vase', '작은 장미 화병', '🌹', 'R', 210, '다 시들 때까지 두게 된다.', 'S:GREEN_HOUSE'],
  ['wildflowers', '들꽃 한 다발', '💐', 'C', 0, '산책하다 주워 온 것 같은 얼굴.', 'Q:LIFE'],
  ['baby_breath', '안개꽃 화병', '💐', 'C', 0, '혼자서도 충분하다.', 'E'],
  ['sunflower', '해바라기 한 송이', '🌻', 'R', 0, '고개를 창 쪽으로 돌려둔다.', 'G:picnic_day'],
  ['sprout_jar', '유리병 속 새싹', '🌱', 'C', 0, '물만 갈아주면 된다.', 'C'],
  ['clover', '행운의 네잎클로버', '🍀', 'R', 0, '찾으려고 해서 찾은 건 아니다.', 'Q'],
  ['night_flower', '밤에 피는 꽃', '🌙', 'S', 0, '낮에는 어디 있는지도 모른다.', 'X'],
  ['star_pot', '별빛 화분', '✨', 'E', 0, '흙에서 별가루 냄새가 난다.', 'C'],
  ['mushroom_pot', '작은 버섯 화분', '🍄', 'R', 0, '심은 적은 없다.', 'X'],
]

// ── D. 러그와 천 20 ─────────────────────────────────────
const RUGS: readonly Row[] = [
  ['cream_rug', '크림 타원 러그', '', 'C', 120, '발이 먼저 좋아한다.', 'S:HOME_ATELIER'],
  ['check_rug', '체크 러그', '', 'C', 130, '먼지가 잘 안 보인다는 장점.', 'S:HOME_ATELIER'],
  ['pink_cloud_rug', '핑크 구름 러그', '', 'E', 560, '밟으면 소리가 안 난다.', 'S:HOME_ATELIER'],
  ['sage_rug', '세이지 러그', '', 'R', 260, '방 색이 한 번에 정리된다.', 'S:HOME_ATELIER'],
  ['sunlight_rug', '햇빛 러그', '', 'R', 250, '해가 안 드는 날에도 밝다.', 'S:HOME_ATELIER'],
  ['raindrop_rug', '빗방울 러그', '', 'R', 270, '비 오는 날 제일 잘 어울린다.', 'S:HOME_ATELIER'],
  ['constellation_rug', '별자리 러그', '', 'E', 520, '누워서 보면 별자리가 맞다.', 'S:MOON_STALL'],
  ['flower_rug', '작은 꽃밭 러그', '', 'R', 240, '밟는 게 조금 미안하다.', 'S:HOME_ATELIER'],
  ['mushroom_rug', '버섯 러그', '🍄', 'R', 0, '동그라미 세 개면 충분하다.', 'C'],
  ['cat_paw_rug', '고양이 발바닥 러그', '🐾', 'R', 0, '고양이는 없다.', 'X'],
  ['white_rug', '폭신한 흰 러그', '', 'R', 200, '관리가 힘들 걸 알면서 샀다.', 'S:HOME_ATELIER'],
  ['persian_rug', '빈티지 페르시안 러그', '', 'L', 1800, '방 하나가 통째로 바뀐다.', 'S:JUNE_VINTAGE'],
  ['picnic_mat', '피크닉 매트', '🧺', 'C', 0, '펼치면 바닥이 밖이 된다.', 'C'],
]

const FABRICS: readonly Row[] = [
  ['small_blanket', '작은 담요', '', 'C', 0, '무릎만 덮어도 다르다.', 'C'],
  ['check_blanket', '체크 담요', '', 'C', 0, '소파 등받이에 늘 걸려 있다.', 'C'],
  ['cloud_blanket', '구름 담요', '☁️', 'R', 0, '덮으면 소리가 조금 줄어든다.', 'G:sunday_morning'],
  ['yellow_cushion', '노란 쿠션', '', 'C', 0, '방에서 제일 밝은 것.', 'C'],
  ['sleepy_bear_cushion', '졸린 곰 쿠션', '🧸', 'R', 0, '아무것도 안 했는데 같이 피곤해 보인다.', 'C'],
  ['cat_cushion', '고양이 쿠션', '🐈', 'R', 0, '밟으면 미안해진다.', 'G:soft_pink'],
  ['star_cushion', '별 쿠션', '⭐', 'E', 0, '모서리가 다섯 개라 안기 애매하다.', 'C'],
]

// ── E. 작은 물건 35 ─────────────────────────────────────
const LITTLE_THINGS: readonly Row[] = [
  ['my_mug', '좋아하는 머그컵', '☕', 'C', 0, '손잡이 각도가 제일 중요하다.', 'N:MINA:20'],
  ['glass_teacup', '유리 찻잔', '🫖', 'C', 0, '색이 보이니까 더 천천히 마신다.', 'N:MINA:40'],
  ['small_tumbler', '작은 텀블러', '🥤', 'C', 0, '들고 나가면 하루가 조금 정리된다.', 'R:TRAINING_ZONE:3'],
  ['water_bottle', '물병', '💧', 'C', 0, '책상에 있으면 마시게 된다.', 'N:RIO:20'],
  ['flower_plate', '꽃무늬 접시', '🍽️', 'C', 0, '특별한 날에만 꺼내다가 매일 쓰게 됐다.', 'G:tiny_cafe'],
  ['toast_plate', '토스트 접시', '🍽️', 'C', 0, '딱 한 조각 크기.', 'C'],
  ['wood_tray', '작은 나무 트레이', '', 'C', 0, '한 번에 옮길 수 있는 만큼.', 'C'],
  ['rattan_basket', '라탄 바구니', '🧺', 'C', 0, '넣으면 정리된 것처럼 보인다.', 'C'],
  ['laundry_basket', '빨래 바구니', '🧺', 'C', 0, '비어 있는 날이 드물다.', 'Q:LIFE'],
  ['small_bin', '작은 휴지통', '🗑️', 'C', 0, '생각보다 자주 비운다.', 'Q:LIFE'],
  ['cream_clock', '크림색 시계', '🕰️', 'R', 0, '초침 소리가 안 난다.', 'G:home_worker'],
  ['vintage_alarm', '빈티지 알람시계', '⏰', 'R', 0, '울린 적은 거의 없다.', 'N:JUNE:60'],
  ['desk_calendar', '탁상 달력', '📅', 'C', 40, '넘기는 걸 자주 잊는다.', 'S:PAPER_MOON|S:FLEA_MARKET|S:JUNE_VINTAGE'],
  ['small_candle', '작은 향초', '🕯️', 'C', 0, '켜는 날은 대체로 좋은 날.', 'C'],
  ['rainy_candle', '비 오는 날 향초', '🕯️', 'R', 190, '창을 안 열어도 비 냄새가 난다.', 'S:TINY_MARKET'],
  ['matchbox', '성냥갑', '🔥', 'C', 0, '쓸 일은 별로 없지만 있어야 한다.', 'Q:LIFE'],
  ['small_umbrella', '작은 우산', '☂️', 'C', 70, '가방에 늘 들어 있다.', 'S:TINY_MARKET|S:FLEA_MARKET'],
  ['clear_umbrella', '투명 우산', '☂️', 'C', 80, '비 오는 날이 조금 기다려진다.', 'S:TINY_MARKET|S:FLEA_MARKET'],
  ['umbrella_stand', '우산꽂이', '☂️', 'C', 95, '현관에서 제일 조용한 물건.', 'S:TINY_MARKET|S:FLEA_MARKET'],
  ['eco_bag', '에코백', '👜', 'C', 0, '결국 이것만 들고 다닌다.', 'Q:HEART'],
  ['small_pouch', '작은 파우치', '👛', 'C', 0, '안에 뭐가 있는지는 열어봐야 안다.', 'Q:HEART'],
  ['lucky_keyring_c', '행운의 키링', '🔑', 'R', 180, '잃어버릴까 봐 안 달고 다닌다.', 'S:FLEA_MARKET'],
  ['cloud_keyring', '구름 키링', '☁️', 'R', 0, '가방에서 하나만 다르게 흔들린다.', 'G:rainy_afternoon'],
  ['moon_keyring_c', '달 키링', '🌙', 'R', 200, '밤에 만지면 차갑다.', 'S:MOON_STALL'],
  ['jewel_box', '작은 보석함', '💍', 'R', 0, '안에 든 건 대부분 보석이 아니다.', 'N:JUNE:40'],
  ['glasses_case', '안경 케이스', '👓', 'C', 0, '안경보다 케이스를 더 자주 잃어버린다.', 'Q:MIND'],
  ['vintage_camera', '빈티지 카메라', '📷', 'L', 1500, '필름값이 더 든다.', 'S:JUNE_VINTAGE'],
  ['instant_camera', '즉석 카메라', '📸', 'E', 760, '찍고 나서 기다리는 시간이 좋다.', 'S:HOBBY_CORNER'],
  ['film_roll', '작은 필름통', '🎞️', 'C', 0, '아직 안 맡긴 게 두 통 있다.', 'Q:PLAY'],
  ['headphones_c', '헤드폰', '🎧', 'R', 300, '쓰면 방이 조금 넓어진다.', 'S:HOBBY_CORNER'],
  ['small_radio', '작은 라디오', '📻', 'E', 0, '듣는다기보다 켜둔다.', 'G:music_evening'],
  ['turntable', '턴테이블', '🎛️', 'L', 1600, '한 면이 끝나면 일어나야 한다.', 'S:JUNE_VINTAGE'],
  ['record', '레코드 한 장', '💿', 'R', 190, '표지가 좋아서 샀다.', 'S:JUNE_VINTAGE'],
  ['hand_mirror', '손거울', '🪞', 'C', 0, '가끔 확인만 한다.', 'Q:HEART'],
  ['small_comb', '작은 빗', '', 'C', 0, '책상 서랍에 하나쯤 있다.', 'Q:LIFE'],
]

// ── F. 책과 종이 20 ─────────────────────────────────────
const BOOKS: readonly Row[] = [
  ['unfinished_novel', '읽다 만 소설', '📖', 'C', 70, '책갈피가 3년째 같은 자리.', 'S:PAPER_MOON|S:FLEA_MARKET|S:JUNE_VINTAGE'],
  ['thick_essay', '두꺼운 에세이', '📕', 'C', 0, '한 챕터씩 읽기 좋다.', 'G:cozy_reader'],
  ['poem_book', '작은 시집', '📗', 'C', 60, '아무 데나 펴도 된다.', 'S:PAPER_MOON|S:FLEA_MARKET'],
  ['travel_magazine', '여행 잡지', '📰', 'C', 0, '안 가도 조금 다녀온 기분.', 'N:HARU:50'],
  ['fashion_magazine', '패션 잡지', '📰', 'C', 55, '결국 사진만 본다.', 'S:PAPER_MOON|S:FLEA_MARKET'],
  ['old_picture_book', '오래된 그림책', '📙', 'R', 0, '글보다 그림이 기억난다.', 'N:JUNE:20'],
  ['plant_book', '식물 도감', '📗', 'R', 230, '이름을 알면 다르게 보인다.', 'S:GREEN_HOUSE'],
  ['star_book', '별자리 책', '🌌', 'E', 0, '밤에 읽으면 밖에 나가고 싶어진다.', 'N:NOA:40'],
  ['cook_book', '요리책', '📒', 'C', 0, '펼친 페이지가 늘 같다.', 'N:MINA:60'],
  ['small_notebook', '작은 노트', '📓', 'C', 0, '첫 장만 예쁘게 쓴다.', 'Q:WORK'],
  ['checklist_notebook', '체크리스트 노트', '📔', 'C', 40, '지우는 맛으로 쓴다.', 'S:PAPER_MOON'],
  ['secret_diary', '비밀 일기장', '📔', 'R', 0, '자물쇠는 장식이다.', 'N:NOA:30'],
  ['sketchbook', '스케치북', '📓', 'C', 0, '잘 그릴 필요는 없다.', 'N:LULU:20'],
  ['pencil_case', '색연필 통', '🖍️', 'C', 0, '제일 짧은 색이 제일 좋아하는 색.', 'N:LULU:40'],
  ['fountain_pen', '만년필', '🖊️', 'E', 640, '글씨가 조금 느려진다.', 'S:PAPER_MOON'],
  ['pencil_cup', '연필컵', '✏️', 'C', 0, '펜은 많은데 나오는 건 하나.', 'C'],
  ['sticky_notes', '포스트잇 더미', '🗒️', 'C', 0, '붙여놓고 안 본다.', 'Q:WORK'],
  ['letter', '편지 한 장', '✉️', 'R', 0, '언제 받은 건지 기억이 난다.', 'N:MINA:30'],
  ['postcards', '엽서 묶음', '📮', 'C', 0, '보낼 데를 정하지 않고 산다.', 'C'],
  ['old_map', '오래된 지도', '🗺️', 'L', 0, '이제 없는 길이 그려져 있다.', 'B'],
]

// ── G. 부엌과 먹을 것 20 ────────────────────────────────
const KITCHEN: readonly Row[] = [
  ['small_pot', '작은 냄비', '🍲', 'C', 80, '라면 하나 끓이기 딱.', 'S:TINY_MARKET'],
  ['frying_pan', '프라이팬', '🍳', 'C', 90, '계란 하나로도 요리라고 한다.', 'S:TINY_MARKET'],
  ['cutting_board', '나무 도마', '🔪', 'C', 75, '쓸수록 자국이 는다.', 'S:TINY_MARKET'],
  ['oven_mitt', '체크 주방장갑', '🧤', 'C', 0, '한 짝만 쓴다.', 'Q:LIFE'],
]

const FOODS: readonly Row[] = [
  ['toast_butter', '토스트와 버터', '🍞', 'C', 0, '아침이 아니어도 된다.', 'Q:LIFE'],
  ['jam_toast', '딸기잼 토스트', '🍓', 'C', 0, '가장자리를 남기는 사람도 있다.', 'Q:LIFE'],
  ['pancake', '작은 팬케이크', '🥞', 'C', 50, '세 장이면 충분하다.', 'S:TINY_MARKET'],
  ['croissant', '크루아상', '🥐', 'C', 45, '부스러기는 각오해야 한다.', 'S:TINY_MARKET'],
  ['cake_slice', '조각 케이크', '🍰', 'C', 0, '혼자 먹기 좋은 크기.', 'E'],
  ['strawberry_cake', '딸기 케이크', '🍰', 'R', 0, '위에 딸기부터 먹는 편.', 'E'],
  ['cookie_plate', '작은 쿠키 접시', '🍪', 'C', 50, '하나만 먹기로 했다.', 'S:TINY_MARKET'],
  ['apple_basket', '사과 한 바구니', '🍎', 'C', 0, '며칠은 버틴다.', 'E'],
  ['tangerine_basket', '귤 바구니', '🍊', 'C', 0, '까는 소리가 겨울 소리.', 'E'],
  ['strawberry_pack', '딸기 한 팩', '🍓', 'C', 0, '제일 큰 걸 마지막에 남긴다.', 'E'],
  ['coffee_cup', '커피 한 잔', '☕', 'C', 0, '식어도 마신다.', 'Q:WORK'],
  ['latte_cup', '라떼 한 잔', '🥛', 'C', 45, '위의 그림은 30초짜리.', 'S:TINY_MARKET'],
  ['warm_tea', '따뜻한 차', '🍵', 'C', 0, '손부터 녹인다.', 'Q:MIND'],
  ['lemonade', '레모네이드', '🍋', 'C', 0, '여름에만 생각난다.', 'E'],
  ['milk_bottle', '우유병', '🥛', 'C', 0, '냉장고 문에 늘 있는 자리.', 'Q:LIFE'],
  ['cereal_bowl', '시리얼 볼', '🥣', 'C', 0, '설거지가 제일 쉬운 아침.', 'Q:LIFE'],
]

// ── H. 취미와 기계 20 ───────────────────────────────────
const TECH: readonly Row[] = [
  ['small_laptop', '작은 노트북', '💻', 'R', 420, '일도 하고 딴짓도 한다.', 'S:HOBBY_CORNER'],
  ['monitor', '데스크 모니터', '🖥️', 'R', 380, '목이 편해졌다.', 'S:HOBBY_CORNER'],
  ['keyboard', '무선 키보드', '⌨️', 'C', 150, '소리 때문에 고른다.', 'S:HOBBY_CORNER|S:FLEA_MARKET'],
  ['mouse', '작은 마우스', '🖱️', 'C', 90, '손에 맞는 게 제일 중요하다.', 'S:HOBBY_CORNER|S:FLEA_MARKET'],
  ['tablet', '태블릿', '📱', 'R', 350, '그림도 그리고 영상도 본다.', 'S:HOBBY_CORNER'],
  ['controller', '게임 컨트롤러', '🎮', 'R', 200, '충전이 늘 애매하다.', 'S:HOBBY_CORNER'],
  ['handheld', '휴대용 게임기', '🕹️', 'R', 320, '누워서 하기 좋다.', 'S:HOBBY_CORNER'],
  ['speaker', '작은 스피커', '🔊', 'R', 220, '방 크기에 딱 맞는 음량.', 'S:HOBBY_CORNER'],
]

const HOBBIES: readonly Row[] = [
  ['guitar', '기타', '🎸', 'E', 800, '세워두기만 해도 그럴듯하다.', 'S:HOBBY_CORNER'],
  ['mini_piano', '미니 키보드 피아노', '🎹', 'E', 760, '한 손으로 치는 곡이 하나 있다.', 'S:HOBBY_CORNER'],
  ['knitting_basket', '뜨개질 바구니', '🧶', 'C', 0, '완성한 건 아직 없다.', 'C'],
  ['yarn', '실타래', '🧶', 'C', 0, '색만 보고 산다.', 'C'],
  ['art_box', '그림 도구 상자', '🎨', 'R', 0, '열 때가 제일 설렌다.', 'N:LULU:60'],
  ['easel', '작은 이젤', '🖼️', 'R', 0, '세워두면 그리게 된다.', 'B'],
  ['palette', '페인트 팔레트', '🎨', 'C', 120, '섞은 색이 더 마음에 든다.', 'S:HOBBY_CORNER'],
  ['puzzle_box', '퍼즐 상자', '🧩', 'C', 130, '가장자리부터 맞춘다.', 'S:HOBBY_CORNER|S:FLEA_MARKET'],
  ['board_game', '보드게임 상자', '🎲', 'R', 0, '둘이서도 되는 걸로.', 'B'],
  ['yoga_mat', '운동 매트', '🧘', 'C', 0, '펴는 게 절반이다.', 'R:TRAINING_ZONE:2'],
  ['chalk_bag', '클라이밍 초크백', '🧗', 'E', 0, '손에 하얀 게 묻는다.', 'N:RIO:60'],
  ['sneakers_c', '운동화 한 켤레', '👟', 'C', 0, '신으면 나가게 된다.', 'N:RIO:40'],
]

// ── I. 벽과 장식 15 ─────────────────────────────────────
const WALLS: readonly Row[] = [
  ['landscape_poster', '작은 풍경 포스터', '🖼️', 'C', 0, '가본 적 없는 곳.', 'N:HARU:20'],
  ['abstract_poster', '추상화 포스터', '🖼️', 'C', 80, '뭘 그린 건지 안 물어본다.', 'S:PAPER_MOON'],
  ['flower_poster', '꽃 포스터', '🖼️', 'C', 75, '시들지 않는 쪽.', 'S:PAPER_MOON'],
  ['moon_poster', '달 포스터', '🌙', 'R', 180, '밤이 벽에 걸려 있다.', 'S:MOON_STALL'],
  ['movie_poster', '빈티지 영화 포스터', '🎞️', 'R', 0, '본 적 없는 영화.', 'R:CREATIVE_DISTRICT:2'],
  ['small_frame', '작은 액자', '🖼️', 'C', 0, '아직 아무것도 안 넣었다.', 'C'],
  ['friend_photo', '친구와 찍은 사진 액자', '📷', 'R', 0, '그날 웃긴 일이 있었다.', 'N:HARU:30'],
  ['polaroid_wall', '폴라로이드 벽', '📸', 'E', 0, '순서 없이 붙인다.', 'G:little_artist'],
  ['wall_clock', '작은 벽시계', '🕐', 'R', 160, '5분 빠르게 맞춰뒀다.', 'S:TINY_MARKET|S:FLEA_MARKET|S:JUNE_VINTAGE'],
  ['cloud_mobile', '구름 모빌', '☁️', 'R', 0, '바람이 지나가면 안다.', 'E'],
  ['star_mobile', '별 모빌', '⭐', 'E', 480, '누워서 보는 용도.', 'S:MOON_STALL'],
  ['garland', '작은 가랜드', '🎏', 'C', 0, '생일이 아니어도 걸어둔다.', 'C'],
  ['fairy_lights', '페어리 라이트', '✨', 'R', 0, '일 년 내내 켜둔다.', 'E'],
  ['wall_mirror', '벽걸이 거울', '🪞', 'C', 130, '방이 두 배로 보인다.', 'S:HOME_ATELIER'],
  ['cork_board', '작은 코르크보드', '📌', 'C', 0, '붙여놓고 잊어버린다.', 'C'],
]

// ── J. 마법과 보물 15 ───────────────────────────────────
const MAGIC: readonly Row[] = [
  ['star_piece', '작은 별 조각', '⭐', 'R', 0, '주웠다고 하기엔 좀 이상하다.', 'Q:MIND|E'],
  ['stardust_jar', '별가루 유리병', '🫙', 'R', 0, '흔들면 조금 밝아진다.', 'Q:PLAY|E'],
  ['moondust_jar', '달가루 유리병', '🫙', 'E', 0, '밤에만 무게가 느껴진다.', 'E|R:NIGHT_TOWN:2'],
  ['shiny_pebble', '반짝이는 조약돌', '🪨', 'C', 0, '그냥 돌이라고 하기엔 아깝다.', 'Q:BODY'],
  ['clover_bottle', '행운의 네잎클로버 병', '🍀', 'R', 0, '두 번째로 찾은 건 병에 넣었다.', 'C'],
  ['cloud_piece', '작은 구름 조각', '☁️', 'L', 0, '손에 닿으면 차갑다.', 'E'],
  ['dream_piece', '꿈 조각', '💭', 'E', 0, '아침에 기억나는 만큼만 남는다.', 'Q:MIND'],
  ['dawn_crystal', '새벽 결정', '🔷', 'E', 0, '가장 조용한 시간에만 굳는다.', 'B'],
  ['sunset_crystal', '노을 결정', '🔶', 'E', 0, '6시의 색이 그대로 굳었다.', 'B'],
  ['raindrop_crystal', '빗방울 결정', '💧', 'E', 0, '떨어지기 직전에서 멈췄다.', 'E'],
  ['moon_ticket_c', 'Moon Ticket', '🎫', 'L', 0, '어디로 가는 표인지는 안 적혀 있다.', 'R:NIGHT_TOWN:3'],
  ['night_ticket_c', 'Night Ticket', '🎟️', 'R', 160, '밤 시장 입구에서 나눠준다.', 'S:MOON_STALL'],
  ['star_music_box', '별빛 오르골', '🎶', 'L', 0, '한 곡만 들어 있다.', 'G:star_collector'],
  ['sleeping_star', '잠든 별', '💫', 'S', 0, '깨우지 않기로 했다.', 'X'],
  ['little_moon', '작은 달', '🌝', 'S', 0, '주머니에 들어가는 크기.', 'X'],
]

/** 240개. 순서는 도감에 나오는 순서다. */
export const CATALOG_ROWS: CollectionItemDef[] = [
  ...group('FURNITURE', '침대', BEDS),
  ...group('FURNITURE', '소파', SOFAS),
  ...group('FURNITURE', '의자', CHAIRS),
  ...group('FURNITURE', '책상', DESKS),
  ...group('FURNITURE', '수납', STORAGE),
  ...group('FURNITURE', '가구', OTHER_FURNITURE),
  ...group('LIGHTING', '조명', LIGHTS),
  ...group('PLANT', '식물', PLANTS),
  ...group('RUG', '러그', RUGS),
  ...group('RUG', '천', FABRICS),
  ...group('LITTLE_THING', '소품', LITTLE_THINGS),
  ...group('BOOK', '책', BOOKS),
  ...group('KITCHEN', '주방', KITCHEN),
  ...group('FOOD', '먹을 것', FOODS),
  ...group('TECH', '기계', TECH),
  ...group('HOBBY', '취미', HOBBIES),
  ...group('WALL', '벽', WALLS),
  ...group('MAGIC', '보물', MAGIC),
]

// ── 재료 ────────────────────────────────────────────────
/**
 * 만들기에 쓰는 것들.
 *
 * 도감의 240개에는 넣지 않는다. 도감은 "발견한 물건" 을 세는 곳이지
 * "가진 부품" 을 세는 곳이 아니다. 가진 재료는 작은 작업실에서 본다.
 *
 * 별 조각 · 별가루 · 달가루 · 꿈 조각처럼 그 자체로 예쁜 것은
 * 재료를 따로 만들지 않고 도감 물건을 그대로 쓴다 (위 J 묶음).
 */
const MATERIAL_ROWS: readonly Row[] = [
  ['m_wood', '작은 나무조각', '🪵', 'C', 0, '어디서 났는지는 모르겠다.', 'Q:LIFE'],
  ['m_cloth', '부드러운 천', '🧵', 'C', 0, '빨래를 개다 남은 것.', 'Q:LIFE'],
  ['m_glass', '유리 조각', '🔹', 'C', 0, '다치지 않게 다듬어져 있다.', 'Q:WORK'],
  ['m_metal', '금속 조각', '🔩', 'C', 0, '뭔가의 일부였던 것.', 'Q:WORK'],
  ['m_paper', '종이 조각', '📄', 'C', 0, '접었다 편 자국이 있다.', 'Q:WORK'],
  ['m_leaf', '초록 잎', '🍃', 'C', 0, '산책길에 하나씩 줍는다.', 'Q:BODY'],
  ['m_petal', '꽃잎', '🌸', 'C', 0, '떨어진 걸 주웠다.', 'Q:HEART'],
  ['m_stone', '작은 돌', '🪨', 'C', 0, '모양이 마음에 들었다.', 'Q:BODY'],
]

export const MATERIALS: CollectionItemDef[] = group('MATERIAL', '재료', MATERIAL_ROWS).map((m) => ({
  ...m,
  placeable: false,
  hasPlaceableAsset: false,
}))

/** 재료로 쓰이는 도감 물건 — 레시피에서 이 이름으로 부른다 */
export const MAGIC_MATERIAL_IDS = ['star_piece', 'stardust_jar', 'moondust_jar', 'dream_piece'] as const
