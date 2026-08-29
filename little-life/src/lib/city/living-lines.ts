import type { LivingLine } from '@/types'

/**
 * 생활 대사 표.
 *
 * ── 규칙 ────────────────────────────────────────────────
 *
 * 1. 한두 문장. 눌렀는데 소설이 나오면 안 읽는다.
 * 2. 비밀은 여기서 안 밝힌다 — 정체 · 과거 · 관계의 핵심은 이야기 몫이다.
 * 3. 그 사람이 모르는 남의 사정을 말하지 않는다. 지호는 시우의 옛 밴드를
 *    모르고, 라온은 준의 온라인 정체를 모른다.
 * 4. 직업이 성격 전체가 아니다. 그래서 일 밖(OFF_WORK) 대사가 다 있다.
 *
 * ── 붙는 조건 ───────────────────────────────────────────
 *
 * areaId  이 동네에 있을 때만
 * band    이 시간대에만
 * context WORK 일하는 중 · OFF_WORK 일 밖
 *
 * 조건이 많이 붙을수록 먼저 나온다 (living.ts 의 specificity).
 * 아무 조건 없는 줄이 그 사람의 기본값이다 — 누구에게나 하나는 있어야
 * 눌렀을 때 빈 화면이 뜨지 않는다.
 */

export const LIVING_LINES: LivingLine[] = [
  // ── 윤하루 · 카페 사장 ──────────────────────────────
  { id: 'MINA_WORK_1', npcId: 'MINA', text: '오늘은 조금 조용하네요. 이런 날도 좋아요.', context: 'WORK' },
  { id: 'MINA_WORK_2', npcId: 'MINA', text: '잠깐만요. 이거 내려놓고 이야기할게요.', context: 'WORK' },
  { id: 'MINA_WORK_3', npcId: 'MINA', text: '태오는 아침부터 나갔어요. 뭐, 늘 그렇죠.', context: 'WORK' },
  { id: 'MINA_MORNING_1', npcId: 'MINA', text: '아침은 먹었어요?', band: 'MORNING' },
  { id: 'MINA_MORNING_2', npcId: 'MINA', text: '문 열기 전 시간이 제일 조용해요.', band: 'MORNING' },
  { id: 'MINA_EVENING_1', npcId: 'MINA', text: '오늘은 생각보다 길었네요.', band: 'EVENING' },
  { id: 'MINA_OFF_1', npcId: 'MINA', text: '저도 카페 밖에 있을 때가 있어요.', context: 'OFF_WORK' },
  { id: 'MINA_OFF_2', npcId: 'MINA', text: '오늘은 커피 말고 다른 걸 마시려고요.', context: 'OFF_WORK' },
  { id: 'MINA_OFF_3', npcId: 'MINA', text: '가게 문 닫고 나면 한참을 그냥 걸어요.', context: 'OFF_WORK' },
  { id: 'MINA_PARK_1', npcId: 'MINA', text: '여기 오면 아무도 저한테 뭘 안 시켜서 좋아요.', areaId: 'GREEN_PARK' },
  { id: 'MINA_GEN_1', npcId: 'MINA', text: '오늘 뭐 드셨어요? 그냥 궁금해서요.' },
  { id: 'MINA_GEN_2', npcId: 'MINA', text: '천천히 오세요. 어디 안 가요.' },

  // ── 윤태오 · 스포츠 회사원 / 러너 ───────────────────
  { id: 'HARU_WORK_1', npcId: 'HARU', text: '오늘은 천천히 뛰려고요.', context: 'WORK' },
  { id: 'HARU_WORK_2', npcId: 'HARU', text: '매번 그렇게 말하긴 하는데.', context: 'WORK' },
  { id: 'HARU_PARK_MORNING', npcId: 'HARU', text: '처음 한 바퀴가 제일 귀찮아요.', areaId: 'GREEN_PARK', band: 'MORNING' },
  { id: 'HARU_EVENING_1', npcId: 'HARU', text: '저녁엔 그냥 걷는 것도 괜찮더라고요.', band: 'EVENING' },
  { id: 'HARU_CAFE_1', npcId: 'HARU', text: '여기서는 하루가 사장이고 저는 그냥 손님이에요.', areaId: 'CAFE_STREET' },
  { id: 'HARU_CAFE_2', npcId: 'HARU', text: '커피 한 잔 하고 갈까 하다가 두 잔째예요.', areaId: 'CAFE_STREET' },
  { id: 'HARU_GYM_1', npcId: 'HARU', text: '도윤 씨랑 예전에 같이 일했어요. 그때도 저랬어요.', areaId: 'TRAINING_ZONE' },
  { id: 'HARU_OFF_1', npcId: 'HARU', text: '운동 안 하는 날도 있어요. 정말이에요.', context: 'OFF_WORK' },
  { id: 'HARU_OFF_2', npcId: 'HARU', text: '오늘은 회사에서 하루 종일 앉아 있었어요.', context: 'OFF_WORK' },
  { id: 'HARU_GEN_1', npcId: 'HARU', text: '왔네요. 오늘 뭐 하고 지냈어요?' },
  { id: 'HARU_GEN_2', npcId: 'HARU', text: '무리하진 마요. 저도 그랬다가 무릎 한 번 갔어요.' },

  // ── 오미래 · 공방 주인 ──────────────────────────────
  { id: 'LULU_WORK_1', npcId: 'LULU', text: '저기 쌓인 거? 다 하다 만 거야.', context: 'WORK' },
  { id: 'LULU_WORK_2', npcId: 'LULU', text: '손대도 돼. 대신 망가뜨리면 같이 고쳐.', context: 'WORK' },
  { id: 'LULU_WORK_3', npcId: 'LULU', text: '배 안 고파? 일은 먹고 해야지.', context: 'WORK' },
  { id: 'LULU_WORK_4', npcId: 'LULU', text: '이안이? 걔는 옛날부터 밥을 제때 안 먹어.', context: 'WORK' },
  { id: 'LULU_NIGHT_1', npcId: 'LULU', text: '이 나이 되니 잠이 줄어. 손은 더 잘 가고.', band: 'NIGHT' },
  { id: 'LULU_OFF_1', npcId: 'LULU', text: '나도 가끔은 밖에 나와야지.', context: 'OFF_WORK' },
  { id: 'LULU_OFF_2', npcId: 'LULU', text: '오늘은 아무것도 안 만들려고 나왔어.', context: 'OFF_WORK' },
  { id: 'LULU_CAFE_1', npcId: 'LULU', text: '남이 내려준 커피가 제일 맛있어. 이건 진짜야.', areaId: 'CAFE_STREET' },
  { id: 'LULU_GEN_1', npcId: 'LULU', text: '얼굴 좋아 보이네. 잘 지냈어?' },
  { id: 'LULU_GEN_2', npcId: 'LULU', text: '급한 거 아니면 앉았다 가.' },

  // ── 서이안 · 빈티지숍 사장 ──────────────────────────
  { id: 'JUNE_WORK_1', npcId: 'JUNE', text: '그건 안 어울려요.', context: 'WORK' },
  { id: 'JUNE_WORK_2', npcId: 'JUNE', text: '…왜 그런 표정이에요. 다른 거 찾아드릴게요.', context: 'WORK' },
  { id: 'JUNE_WORK_3', npcId: 'JUNE', text: '그쪽 말고요. 왼쪽 두 번째.', context: 'WORK' },
  { id: 'JUNE_OFF_1', npcId: 'JUNE', text: '가게 밖에서 보면 이상해요?', context: 'OFF_WORK' },
  { id: 'JUNE_OFF_2', npcId: 'JUNE', text: '오늘은 아무것도 안 팝니다.', context: 'OFF_WORK' },
  { id: 'JUNE_NIGHT_1', npcId: 'JUNE', text: '아직 안 들어갔어요?', band: 'NIGHT' },
  { id: 'JUNE_NIGHT_2', npcId: 'JUNE', text: '이 시간에 걸어 다니는 사람은 대개 정해져 있어요.', band: 'NIGHT' },
  { id: 'JUNE_GEN_1', npcId: 'JUNE', text: '지난번에 만지작거리던 거, 아직 안 팔았어요.' },
  { id: 'JUNE_GEN_2', npcId: 'JUNE', text: '…뭐 물어볼 거 있으면 물어보든가요.' },

  // ── 한도윤 · 클라이밍짐 코치 ────────────────────────
  { id: 'RIO_WORK_1', npcId: 'RIO', text: '힘으로 안 당겨도 돼요. 발부터 한번 바꿔봐요.', context: 'WORK' },
  { id: 'RIO_WORK_2', npcId: 'RIO', text: '아까 거의 됐는데.', context: 'WORK' },
  { id: 'RIO_WORK_3', npcId: 'RIO', text: '쉬었다 해도 돼요. 벽은 안 도망가니까.', context: 'WORK' },
  { id: 'RIO_WORK_4', npcId: 'RIO', text: '시우 씨요? 처음엔 금방 질릴 줄 알았죠.', context: 'WORK' },
  { id: 'RIO_OFF_1', npcId: 'RIO', text: '오늘은 안 탈 생각이었는데.', context: 'OFF_WORK' },
  { id: 'RIO_OFF_2', npcId: 'RIO', text: '…여기까지 왔으면 한 번은 하겠네요.', context: 'OFF_WORK' },
  { id: 'RIO_PARK_1', npcId: 'RIO', text: '태오는 예전부터 아는 사이예요. 여기서 자주 마주쳐요.', areaId: 'GREEN_PARK' },
  { id: 'RIO_MORNING_1', npcId: 'RIO', text: '아침 벽이 제일 조용해요. 손도 덜 미끄럽고요.', band: 'MORNING' },
  { id: 'RIO_GEN_1', npcId: 'RIO', text: '왔네요. 오늘 몸은 좀 어때요?' },
  { id: 'RIO_GEN_2', npcId: 'RIO', text: '안 되는 날은 그냥 안 되더라고요.' },

  // ── 차세라 · BAR 사장 ───────────────────────────────
  { id: 'NOA_WORK_1', npcId: 'NOA', text: '아직 한가해요. 조금 있으면 달라지겠지만.', context: 'WORK' },
  { id: 'NOA_WORK_2', npcId: 'NOA', text: '편한 데 앉아요.', context: 'WORK' },
  { id: 'NOA_WORK_3', npcId: 'NOA', text: '오늘은 조용한 쪽이 좋아요?', context: 'WORK' },
  { id: 'NOA_NIGHT_1', npcId: 'NOA', text: '이 시간부터가 제 하루 같아요.', band: 'NIGHT' },
  { id: 'NOA_OFF_1', npcId: 'NOA', text: '낮에 보면 좀 낯설죠?', context: 'OFF_WORK' },
  { id: 'NOA_OFF_2', npcId: 'NOA', text: '저도 낮에는 평범하게 돌아다녀요.', context: 'OFF_WORK' },
  { id: 'NOA_GEN_1', npcId: 'NOA', text: '새로 생긴 데 있으면 알려줘요. 안 가본 데를 제일 좋아해요.' },
  { id: 'NOA_GEN_2', npcId: 'NOA', text: '오늘은 어땠어요? 짧게 말해도 돼요.' },

  // ── 정시우 · 타코야끼 푸드트럭 ──────────────────────
  { id: 'SIWOO_WORK_1', npcId: 'SIWOO', text: '조금만 기다려요. 지금 뒤집고 있어서.', context: 'WORK' },
  { id: 'SIWOO_WORK_2', npcId: 'SIWOO', text: '하나 더 넣어달라고요? 그런 건 기억 잘합니다.', context: 'WORK' },
  { id: 'SIWOO_WORK_3', npcId: 'SIWOO', text: '오늘은 꽤 잘 나왔는데.', context: 'WORK' },
  { id: 'SIWOO_NIGHT_1', npcId: 'SIWOO', text: '이제 냄새 좀 빠지려나.', band: 'NIGHT' },
  { id: 'SIWOO_CAFE_MORNING', npcId: 'SIWOO', text: '저도 오전에는 그냥 사람이에요.', areaId: 'CAFE_STREET', band: 'MORNING' },
  { id: 'SIWOO_CAFE_1', npcId: 'SIWOO', text: '아직 철판 앞에 세워두지 마세요.', areaId: 'CAFE_STREET' },
  { id: 'SIWOO_GYM_1', npcId: 'SIWOO', text: '벽을 왜 돈 주고 타나 했는데.', areaId: 'TRAINING_ZONE' },
  { id: 'SIWOO_GYM_2', npcId: 'SIWOO', text: '…지금은 그 말 취소할게요.', areaId: 'TRAINING_ZONE' },
  { id: 'SIWOO_OFF_1', npcId: 'SIWOO', text: '오늘은 트럭 안 끌고 나왔어요. 가끔 이래요.', context: 'OFF_WORK' },
  { id: 'SIWOO_GEN_1', npcId: 'SIWOO', text: '어, 왔어요? 오늘 뭐 좋은 일 있었어요?' },

  // ── 고은채 · 꽃집 사장 ──────────────────────────────
  { id: 'EUNCHAE_WORK_1', npcId: 'EUNCHAE', text: '그건 물 너무 많이 주면 안 돼요.', context: 'WORK' },
  { id: 'EUNCHAE_WORK_2', npcId: 'EUNCHAE', text: '아, 잠깐만요. 그쪽 말고 이쪽.', context: 'WORK' },
  { id: 'EUNCHAE_WORK_3', npcId: 'EUNCHAE', text: '예쁘다고 다 오래 가는 건 아니에요.', context: 'WORK' },
  { id: 'EUNCHAE_OFF_1', npcId: 'EUNCHAE', text: '오늘은 꽃 안 보고 싶어서 나왔어요.', context: 'OFF_WORK' },
  { id: 'EUNCHAE_OFF_2', npcId: 'EUNCHAE', text: '…그래도 보면 보게 되네요.', context: 'OFF_WORK' },
  { id: 'EUNCHAE_PARK_1', npcId: 'EUNCHAE', text: '여긴 관리하는 사람이 따로 있어서 편해요.', areaId: 'GREEN_PARK' },
  { id: 'EUNCHAE_MORNING_1', npcId: 'EUNCHAE', text: '아침에 물 주고 나면 하루가 시작돼요.', band: 'MORNING' },
  { id: 'EUNCHAE_GEN_1', npcId: 'EUNCHAE', text: '시우요? 어릴 때부터 알았어요. 그게 다예요.' },
  { id: 'EUNCHAE_GEN_2', npcId: 'EUNCHAE', text: '말이 좀 빨랐다면 미안해요. 원래 그래요.' },
  // ── 서민지 · 편의점 오전 ────────────────────────────
  { id: 'MINJI_WORK_1', npcId: 'MINJI', text: '아침엔 늘 오는 사람이 비슷해.', context: 'WORK' },
  { id: 'MINJI_WORK_2', npcId: 'MINJI', text: '그거 새로 들어왔는데, 생각보다 괜찮더라.', context: 'WORK' },
  { id: 'MINJI_WORK_3', npcId: 'MINJI', text: '밥 안 먹었으면 이거라도 챙겨.', context: 'WORK' },
  { id: 'MINJI_MORNING_1', npcId: 'MINJI', text: '애 학교 보내고 나면 여기가 제일 조용해.', band: 'MORNING' },
  { id: 'MINJI_OFF_1', npcId: 'MINJI', text: '오늘은 손님 아니라 그냥 나온 거야.', context: 'OFF_WORK' },
  { id: 'MINJI_CREATIVE_1', npcId: 'MINJI', text: '내가 이런 거 좋아하면 의외야?', areaId: 'CREATIVE_DISTRICT' },
  { id: 'MINJI_CREATIVE_2', npcId: 'MINJI', text: '이안 씨가 골라주는 건 얄미운데 잘 맞아.', areaId: 'CREATIVE_DISTRICT' },
  { id: 'MINJI_GEN_1', npcId: 'MINJI', text: '요즘도 공연 가요. 갈 때는 가야지.' },
  { id: 'MINJI_GEN_2', npcId: 'MINJI', text: '동네 얘기는 많이 듣는데, 옮기지는 않아.' },

  // ── 박준 · 편의점 오후 / 휴학생 ─────────────────────
  { id: 'JUN_WORK_1', npcId: 'JUN', text: '아… 네. 계산해드릴게요.', context: 'WORK' },
  { id: 'JUN_WORK_2', npcId: 'JUN', text: '그거 아래쪽에도 있어요.', context: 'WORK' },
  { id: 'JUN_WORK_3', npcId: 'JUN', text: '…찾아드릴까요?', context: 'WORK' },
  { id: 'JUN_OFF_1', npcId: 'JUN', text: '사람 적은 데가 좋아서요.', context: 'OFF_WORK' },
  { id: 'JUN_OFF_2', npcId: 'JUN', text: '집에 가면 할 게 좀 있어서.', context: 'OFF_WORK' },
  { id: 'JUN_NIGHT_1', npcId: 'JUN', text: '밤에 하는 게 더 잘 돼요. 뭐든.', band: 'NIGHT' },
  { id: 'JUN_CREATIVE_1', npcId: 'JUN', text: '그거… 꽤 오래된 건데. 아니, 그냥 본 적 있어서요.', areaId: 'CREATIVE_DISTRICT' },
  { id: 'JUN_GEN_1', npcId: 'JUN', text: '(고개만 까딱한다)' },
  { id: 'JUN_GEN_2', npcId: 'JUN', text: '…아, 안녕하세요.' },

  // ── 조현우 · 약사 ───────────────────────────────────
  { id: 'HYUNWOO_WORK_1', npcId: 'HYUNWOO', text: '어디 아픈 건 아니죠?', context: 'WORK' },
  { id: 'HYUNWOO_WORK_2', npcId: 'HYUNWOO', text: '약 말고 잠이 필요한 얼굴인데.', context: 'WORK' },
  { id: 'HYUNWOO_WORK_3', npcId: 'HYUNWOO', text: '처방전 없으면 이쪽에서 골라야 해요. 봐드릴게요.', context: 'WORK' },
  { id: 'HYUNWOO_OFF_1', npcId: 'HYUNWOO', text: '가운 벗으면 그냥 동네 아저씨예요.', context: 'OFF_WORK' },
  { id: 'HYUNWOO_OFF_2', npcId: 'HYUNWOO', text: '저녁엔 좀 걸어요. 앉아 있는 게 일이라서.', context: 'OFF_WORK' },
  { id: 'HYUNWOO_GEN_1', npcId: 'HYUNWOO', text: '동네 일은 잘 몰라요. …근데 아까 연주 씨가 그러던데.' },
  { id: 'HYUNWOO_GEN_2', npcId: 'HYUNWOO', text: '물 많이 드세요. 다들 그 말 흘려듣던데.' },
  { id: 'HYUNWOO_MORNING_1', npcId: 'HYUNWOO', text: '이 시간에 오는 사람들은 대개 밤을 샜더라고요.', band: 'MORNING' },

  // ── 이하린 · 대학원생 ───────────────────────────────
  { id: 'HARIN_WORK_1', npcId: 'HARIN', text: '오늘은 진짜 일찍 갈 거예요. …어제도 그렇게 말했지만.', context: 'WORK' },
  { id: 'HARIN_WORK_2', npcId: 'HARIN', text: '프린터가 또 말을 안 들어요.', context: 'WORK' },
  { id: 'HARIN_CAFE_1', npcId: 'HARIN', text: '카페인이 이제 효과가 있는지도 모르겠어요.', areaId: 'CAFE_STREET' },
  { id: 'HARIN_CAFE_2', npcId: 'HARIN', text: '이 자리 콘센트 있어서요. 그것 때문에 여기 와요.', areaId: 'CAFE_STREET' },
  { id: 'HARIN_NIGHT_1', npcId: 'HARIN', text: '새벽이 제일 잘 돼요. 다음 날이 망하지만.', band: 'NIGHT' },
  { id: 'HARIN_OFF_1', npcId: 'HARIN', text: '오늘은 아무것도 안 읽으려고요.', context: 'OFF_WORK' },
  { id: 'HARIN_GEN_1', npcId: 'HARIN', text: '논문은 원래 안 읽혀요. 저만 그런 게 아니래요.' },
  { id: 'HARIN_GEN_2', npcId: 'HARIN', text: '수아요? 아까도 봤어요. 오늘 두 번째예요.' },

  // ── 김재희 · 독립서점 사장 ──────────────────────────
  { id: 'JAEHUI_WORK_1', npcId: 'JAEHUI', text: '천천히 봐도 돼요.', context: 'WORK' },
  { id: 'JAEHUI_WORK_2', npcId: 'JAEHUI', text: '그 책은 뒤쪽에 한 권 더 있어요.', context: 'WORK' },
  { id: 'JAEHUI_WORK_3', npcId: 'JAEHUI', text: '꼭 사지 않아도 괜찮아요.', context: 'WORK' },
  { id: 'JAEHUI_OFF_1', npcId: 'JAEHUI', text: '아무 일정 없는 날이 좋아요.', context: 'OFF_WORK' },
  { id: 'JAEHUI_OFF_2', npcId: 'JAEHUI', text: '집에 갈까 생각 중이었어요.', context: 'OFF_WORK' },
  { id: 'JAEHUI_MORNING_1', npcId: 'JAEHUI', text: '문 열고 커피 내리고 책 정리하고. 매일 같아요.', band: 'MORNING' },
  { id: 'JAEHUI_GEN_1', npcId: 'JAEHUI', text: '라온 씨랑 일하면 조용하진 않아요.' },
  { id: 'JAEHUI_GEN_2', npcId: 'JAEHUI', text: '오늘 아무 일도 없었어요. 그게 좋은 하루죠.' },

  // ── 최라온 · 사진가 ─────────────────────────────────
  { id: 'RAON_WORK_1', npcId: 'RAON', text: '그대로 있어봐요. 아, 찍는 건 아니고.', context: 'WORK' },
  { id: 'RAON_WORK_2', npcId: 'RAON', text: '잠깐만요. 지금 되게 좋은데.', context: 'WORK' },
  { id: 'RAON_OFF_1', npcId: 'RAON', text: '카메라 안 들고 나오면 자꾸 뭘 놓친 기분이에요.', context: 'OFF_WORK' },
  { id: 'RAON_EVENING_1', npcId: 'RAON', text: '해 지기 십 분 전이 제일 좋아요. 매일 십 분뿐이에요.', band: 'EVENING' },
  { id: 'RAON_PARK_1', npcId: 'RAON', text: '여기 원래 이렇게 빛 들어왔어요?', areaId: 'GREEN_PARK' },
  { id: 'RAON_NIGHT_1', npcId: 'RAON', text: '밤에는 간판이 다 조명이라서 좋아요.', band: 'NIGHT' },
  { id: 'RAON_GEN_1', npcId: 'RAON', text: '요즘 뭐 해요? 진짜로 궁금해서 묻는 거예요.' },
  { id: 'RAON_GEN_2', npcId: 'RAON', text: '내 사진은 안 찍어요. 그건 좀 그래요.' },

  // ── 남지호 · 레코드숍 직원 ──────────────────────────
  { id: 'JIHO_WORK_1', npcId: 'JIHO', text: '찾는 거 있으면 말해요.', context: 'WORK' },
  { id: 'JIHO_WORK_2', npcId: 'JIHO', text: '없으면 그냥 들어봐도 되고요.', context: 'WORK' },
  { id: 'JIHO_WORK_3', npcId: 'JIHO', text: '그 앨범은 앞보다 뒤쪽이 좋아요.', context: 'WORK' },
  { id: 'JIHO_OFF_1', npcId: 'JIHO', text: '오늘은 아무것도 안 듣고 싶어요. 가끔 그래요.', context: 'OFF_WORK' },
  { id: 'JIHO_NIGHT_1', npcId: 'JIHO', text: '밤에 듣는 거랑 낮에 듣는 거랑 완전히 달라요.', band: 'NIGHT' },
  { id: 'JIHO_NIGHT_2', npcId: 'JIHO', text: '민지 누나는 공연 볼 때 체력이 저보다 좋아요.', band: 'NIGHT' },
  { id: 'JIHO_GEN_1', npcId: 'JIHO', text: '아 네... 편하게 보세요.' },
  { id: 'JIHO_GEN_2', npcId: 'JIHO', text: '아, 그 밴드 알아요? 그거 좋죠. 그거 좋아요.' },

  // ── 신유나 · 필라테스 강사 ──────────────────────────
  { id: 'YUNA_WORK_1', npcId: 'YUNA', text: '어깨 힘 조금만 빼볼까요.', context: 'WORK' },
  { id: 'YUNA_WORK_2', npcId: 'YUNA', text: '안 되는 날도 있어요. 오늘 몸 상태가 그런 거죠.', context: 'WORK' },
  { id: 'YUNA_WORK_3', npcId: 'YUNA', text: '수업 십 분 전에 와요. 몸이 좀 데워져야 해서.', context: 'WORK' },
  { id: 'YUNA_OFF_1', npcId: 'YUNA', text: '오늘은 아무것도 관리 안 하려고요.', context: 'OFF_WORK' },
  { id: 'YUNA_OFF_2', npcId: 'YUNA', text: '…그래도 자세는 자꾸 보이네요.', context: 'OFF_WORK' },
  { id: 'YUNA_NIGHT_1', npcId: 'YUNA', text: '집에서는 좀 다른 걸 해요.', band: 'NIGHT' },
  { id: 'YUNA_MORNING_1', npcId: 'YUNA', text: '아침 수업이 제일 조용해요. 다들 말할 힘이 없어서.', band: 'MORNING' },
  { id: 'YUNA_GEN_1', npcId: 'YUNA', text: '거울 보라고 있는 거예요. 부끄러워할 거 없어요.' },
  // ── 류선재 · 프리랜서 번역가 ────────────────────────
  { id: 'SUNJAE_WORK_1', npcId: 'SUNJAE', text: '집에서 안 풀리면 여기 와요.', context: 'WORK' },
  { id: 'SUNJAE_WORK_2', npcId: 'SUNJAE', text: '같은 문장을 너무 오래 보면 이상해져서.', context: 'WORK' },
  { id: 'SUNJAE_CAFE_1', npcId: 'SUNJAE', text: '마감이라 나왔어요. 집에 있으면 더 안 돼서.', areaId: 'CAFE_STREET' },
  { id: 'SUNJAE_OFF_1', npcId: 'SUNJAE', text: '오늘은 아무것도 안 옮길 거예요.', context: 'OFF_WORK' },
  { id: 'SUNJAE_NIGHT_1', npcId: 'SUNJAE', text: '밤에 하면 빨라요. 대신 다음 날이 없어지고요.', band: 'NIGHT' },
  { id: 'SUNJAE_GEN_1', npcId: 'SUNJAE', text: '그건 어디서 났어요? …아니요. 그냥 좀 익숙해서.' },
  { id: 'SUNJAE_GEN_2', npcId: 'SUNJAE', text: '버리기 애매한 게 제일 잘 쌓이죠.' },
  { id: 'SUNJAE_GEN_3', npcId: 'SUNJAE', text: '이 단어는 우리말에 없어요. 그래서 재밌는 거고요.' },

  // ── 임소라 · 심야영화관 직원 ────────────────────────
  { id: 'SORA_WORK_1', npcId: 'SORA', text: '오늘 마지막 회가 좀 늦어요.', context: 'WORK' },
  { id: 'SORA_WORK_2', npcId: 'SORA', text: '끝나고 나면 밖이 너무 조용해서 좋아요.', context: 'WORK' },
  { id: 'SORA_WORK_3', npcId: 'SORA', text: '팝콘은 옆에서 사셔야 해요. 저희는 표만 팔아요.', context: 'WORK' },
  { id: 'SORA_NIGHT_1', npcId: 'SORA', text: '저한텐 지금이 오후 같은 느낌이에요.', band: 'NIGHT' },
  { id: 'SORA_CAFE_1', npcId: 'SORA', text: '이건 오늘 두 번째예요. …세 번째였나?', areaId: 'CAFE_STREET' },
  { id: 'SORA_OFF_1', npcId: 'SORA', text: '쉬는 날엔 낮에 자요. 해가 아까운 건 좀 그렇지만요.', context: 'OFF_WORK' },
  { id: 'SORA_GEN_1', npcId: 'SORA', text: '괜찮아요 괜찮아요. 진짜 괜찮아요.' },
  { id: 'SORA_GEN_2', npcId: 'SORA', text: '자막 있는 거 좋아하세요? 그럼 3관이요.' },

  // ── 유정원 · 회사원 ─────────────────────────────────
  { id: 'JEONGWON_OFF_1', npcId: 'JEONGWON', text: '퇴근했으면 퇴근한 거죠. 회사 생각하지 마요.', context: 'OFF_WORK' },
  { id: 'JEONGWON_OFF_2', npcId: 'JEONGWON', text: '저도 그게 잘 안 되긴 하지만.', context: 'OFF_WORK' },
  { id: 'JEONGWON_WORK_1', npcId: 'JEONGWON', text: '점심시간이에요. 딱 사십 분.', context: 'WORK' },
  { id: 'JEONGWON_NIGHT_1', npcId: 'JEONGWON', text: '오늘은 좀 길었네요.', band: 'NIGHT' },
  { id: 'JEONGWON_NIGHT_2', npcId: 'JEONGWON', text: '이 시간에 걸어 다니면 하루가 정리돼요.', band: 'NIGHT' },
  { id: 'JEONGWON_GYM_1', npcId: 'JEONGWON', text: '몸을 좀 쓰면 화가 덜 나요. 그것 때문에 와요.', areaId: 'TRAINING_ZONE' },
  { id: 'JEONGWON_GEN_1', npcId: 'JEONGWON', text: '또 커피 마셨죠? 말려도 안 들어요.' },
  { id: 'JEONGWON_GEN_2', npcId: 'JEONGWON', text: '할 말은 해야죠. 안 하면 그게 쌓여요.' },

  // ── 문해인 · 식물가게 ───────────────────────────────
  { id: 'HAEIN_WORK_1', npcId: 'HAEIN', text: '저쪽은 오늘 물 안 줘도 돼요.', context: 'WORK' },
  { id: 'HAEIN_WORK_2', npcId: 'HAEIN', text: '아침이랑 잎 모양이 조금 다르네요.', context: 'WORK' },
  { id: 'HAEIN_WORK_3', npcId: 'HAEIN', text: '사람보다 식물이 쉽다는 말은 안 믿어요. 얘들도 까다로워요.', context: 'WORK' },
  { id: 'HAEIN_PARK_1', npcId: 'HAEIN', text: '여기는 그냥 보고 있기 좋아요.', areaId: 'GREEN_PARK' },
  { id: 'HAEIN_OFF_1', npcId: 'HAEIN', text: '오늘은 아무 말도 안 하려고 나왔어요. 이건 빼고요.', context: 'OFF_WORK' },
  { id: 'HAEIN_NIGHT_1', npcId: 'HAEIN', text: '밤에 잎이 접히는 애가 있어요. 보면 좀 기특해요.', band: 'NIGHT' },
  { id: 'HAEIN_GEN_1', npcId: 'HAEIN', text: '흙 한번 만져봐요. 마르면 그때 주면 돼요.' },
  { id: 'HAEIN_GEN_2', npcId: 'HAEIN', text: '말 안 걸어도 돼요. 저도 안 걸게요.' },

  // ── 장우식 · 공원 관리인 ────────────────────────────
  { id: 'WOOSIK_WORK_1', npcId: 'WOOSIK', text: '거긴 오늘 미끄러워.', context: 'WORK' },
  { id: 'WOOSIK_WORK_2', npcId: 'WOOSIK', text: '그 고양이는 아침에 이미 밥 먹었어.', context: 'WORK' },
  { id: 'WOOSIK_WORK_3', npcId: 'WOOSIK', text: '저쪽 나무는 건드리지 마.', context: 'WORK' },
  { id: 'WOOSIK_EVENING_1', npcId: 'WOOSIK', text: '해 떨어지면 금방 추워져.', band: 'EVENING' },
  { id: 'WOOSIK_MORNING_1', npcId: 'WOOSIK', text: '해 뜨기 전이 제일 조용해. 나만 아는 건 아니겠지만.', band: 'MORNING' },
  { id: 'WOOSIK_OFF_1', npcId: 'WOOSIK', text: '오늘은 일 안 해. 그냥 나와 있는 거야.', context: 'OFF_WORK' },
  { id: 'WOOSIK_GEN_1', npcId: 'WOOSIK', text: '예전엔 저쪽도 지금이랑 좀 달랐지.' },
  { id: 'WOOSIK_GEN_2', npcId: 'WOOSIK', text: '어. 왔나.' },

  // ── 배수아 · 대학생 ─────────────────────────────────
  { id: 'SUA_DAY_1', npcId: 'SUA', text: '어, 또 만났네요!', band: 'DAY' },
  { id: 'SUA_DAY_2', npcId: 'SUA', text: '오늘 사람 진짜 많죠?', band: 'DAY' },
  { id: 'SUA_NIGHT_1', npcId: 'SUA', text: '기숙사 들어가기 좀 아쉬워서요.', band: 'NIGHT' },
  { id: 'SUA_NIGHT_2', npcId: 'SUA', text: '밤에는 학교가 너무 조용해요.', band: 'NIGHT' },
  { id: 'SUA_PARK_1', npcId: 'SUA', text: '하린 선배 봤어요? 아까 여기 지나갔는데.', areaId: 'GREEN_PARK' },
  { id: 'SUA_CAFE_1', npcId: 'SUA', text: '여기 자리 좋은데 콘센트가 하나뿐이에요.', areaId: 'CAFE_STREET' },
  { id: 'SUA_OFF_1', npcId: 'SUA', text: '수업 없는 날은 하루가 좀 길어요.', context: 'OFF_WORK' },
  { id: 'SUA_GEN_1', npcId: 'SUA', text: '오늘 뭐 해요? 저 지금 시간 완전 많은데.' },
  { id: 'SUA_GEN_2', npcId: 'SUA', text: '아 맞다, 이거 보여드리려고 했는데.' },

  // ── 강유현 · 편의점 야간 ────────────────────────────
  { id: 'YUHYEON_WORK_1', npcId: 'YUHYEON', text: '이 시간엔 생각보다 오는 사람이 있어요.', context: 'WORK' },
  { id: 'YUHYEON_WORK_2', npcId: 'YUHYEON', text: '새벽 세 시쯤이 제일 조용해요.', context: 'WORK' },
  { id: 'YUHYEON_WORK_3', npcId: 'YUHYEON', text: '괜찮아요. 이 정도는 별일 아니에요.', context: 'WORK' },
  { id: 'YUHYEON_NIGHT_1', npcId: 'YUHYEON', text: '…저쪽에 뭐 있었어요? 아니면 됐어요.', band: 'NIGHT' },
  { id: 'YUHYEON_OFF_1', npcId: 'YUHYEON', text: '이제 저는 아침이 끝난 느낌이에요.', context: 'OFF_WORK' },
  { id: 'YUHYEON_GEN_1', npcId: 'YUHYEON', text: '따뜻한 거 하나 골라 가세요. 이 시간엔 그게 나아요.' },
  { id: 'YUHYEON_GEN_2', npcId: 'YUHYEON', text: '어서 오세요. …아, 그냥 구경이시구나.' },

  // ── 강연주 · 부동산 중개사 ──────────────────────────
  { id: 'YEONJU_WORK_1', npcId: 'YEONJU', text: '집 보러 온 건 아니죠? 그냥 들어와도 돼.', context: 'WORK' },
  { id: 'YEONJU_WORK_2', npcId: 'YEONJU', text: '이 동네는 오후가 제일 정신없어.', context: 'WORK' },
  { id: 'YEONJU_WORK_3', npcId: 'YEONJU', text: '요즘은 매물이 잘 안 나와. 다들 그것부터 묻더라.', context: 'WORK' },
  { id: 'YEONJU_OFF_1', npcId: 'YEONJU', text: '오늘은 일 접었어. 커피나 한잔 하려고.', context: 'OFF_WORK' },
  { id: 'YEONJU_MORNING_1', npcId: 'YEONJU', text: '아침엔 손님이 안 와. 커피 마시러 나온 거지 뭐.', band: 'MORNING' },
  { id: 'YEONJU_GEN_1', npcId: 'YEONJU', text: '내가 그걸 어떻게 알아. …저 골목 집은 볕이 좋더라만.' },
  { id: 'YEONJU_GEN_2', npcId: 'YEONJU', text: '어유, 오랜만이네. 밥은 먹었고?' },
]
