import type { QuestPackDef, QuestPreset } from '@/types'

/**
 * 준비된 퀘스트 세트.
 *
 * 첫날에는 이게 타이핑을 대신한다. 고르기만 하면 된다.
 *
 * 특정 약이나 영양제를 새로 권하지 않는다 — 이미 챙기기로 한 것을
 * 잊지 않게 하는 자리다.
 *
 * ── 난이도를 어떻게 매기는가 ────────────────────────────
 *
 * 행동의 객관적 난이도가 아니라 **미루기 쉬운 정도**로 매긴다.
 * 시간 · 귀찮음 · 집중력 · 단계 수를 같이 본다.
 *
 *   EASY    1~5분. 시작 장벽을 낮추는 것. ("컵 하나 씻기")
 *   NORMAL  5~30분. 실제로 해야 하는 일을 끝내는 것. ("설거지 끝내기")
 *   HARD    30분 이상이거나 여러 단계. 계속 미뤄온 것. ("옷장 정리")
 *
 * 예전에는 142개 중 119개가 EASY 였다. 그래서 무엇을 골라도 하루가
 * "물 마시기 · 창문 열기" 로만 채워졌고, 정작 미뤄둔 일은 이 앱 밖에 남았다.
 * EASY 를 지우지는 않았다 — 아무것도 하기 싫은 날에 내밀 게 있어야 한다.
 * 대신 잘못 매겨져 있던 것을 제자리로 옮기고, NORMAL·HARD 를 크게 늘렸다.
 *
 * preset id 는 사용 기록의 열쇠라서 바꾸지 않는다. 난이도만 고친다.
 * (id 를 바꾸면 그 사람이 그동안 쌓은 기록이 남남이 된다)
 */
export const QUEST_PACKS: QuestPackDef[] = [
  {
    id: 'wellness',
    name: '웰니스 기본',
    icon: '🌿',
    description: '하루에 최소한 챙기면 좋은 것들.',
    items: [
      { id: 'water', title: '물 챙겨 마시기', category: 'BODY', difficulty: 'EASY' },
      { id: 'supplement', title: '평소 챙기는 약·영양제', category: 'LIFE', difficulty: 'EASY' },
      { id: 'one_meal', title: '한 끼 잘 챙겨 먹기', category: 'BODY', difficulty: 'NORMAL' },
      { id: 'move_5', title: '5분 이상 몸 움직이기', category: 'BODY', difficulty: 'EASY' },
      { id: 'fresh_air', title: '잠깐 바깥 공기 쐬기', category: 'MIND', difficulty: 'EASY' },
      { id: 'short_rest', title: '잠깐 쉬기', category: 'MIND', difficulty: 'EASY' },
      { id: 'stretch_10', title: '10분 스트레칭', category: 'BODY', difficulty: 'NORMAL' },
      { id: 'neck_care', title: '목과 어깨 제대로 풀기', category: 'BODY', difficulty: 'NORMAL' },
    ],
  },
  {
    id: 'good_morning',
    name: '기분 좋은 아침',
    icon: '🌅',
    description: '하루를 가볍게 여는 몇 가지.',
    bands: ['MORNING'],
    items: [
      { id: 'morning_water', title: '물 한 잔', category: 'BODY', difficulty: 'EASY' },
      { id: 'wash_face', title: '세수와 양치', category: 'LIFE', difficulty: 'EASY' },
      { id: 'open_window', title: '커튼 또는 창문 열기', category: 'LIFE', difficulty: 'EASY' },
      { id: 'morning_stretch', title: '간단히 몸 풀기', category: 'BODY', difficulty: 'EASY' },
      { id: 'breakfast', title: '아침 챙기기', category: 'BODY', difficulty: 'NORMAL' },
      { id: 'check_today', title: '오늘 중요한 일 확인', category: 'WORK', difficulty: 'EASY' },
      { id: 'morning_plan', title: '오늘 할 일 세 가지 정해두기', category: 'WORK', difficulty: 'NORMAL' },
      { id: 'no_phone_first', title: '일어나서 30분 폰 안 보기', category: 'MIND', difficulty: 'HARD' },
    ],
  },
  {
    id: 'calm_night',
    name: '편안한 밤',
    icon: '🌙',
    description: '하루를 잘 닫는 순서.',
    bands: ['NIGHT', 'EVENING'],
    items: [
      { id: 'shower', title: '씻기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'brush_teeth', title: '양치', category: 'LIFE', difficulty: 'EASY' },
      { id: 'prep_tomorrow', title: '내일 필요한 것 준비', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'tidy_5', title: '방 5분 정리', category: 'LIFE', difficulty: 'EASY' },
      { id: 'screen_down', title: '화면 잠시 내려놓기', category: 'MIND', difficulty: 'EASY' },
      { id: 'dim_light', title: '조명 낮추기', category: 'MIND', difficulty: 'EASY' },
      { id: 'bed_ready', title: '잠자리 준비', category: 'MIND', difficulty: 'EASY' },
      { id: 'phone_away', title: '잘 때 폰 손 안 닿는 곳에 두기', category: 'MIND', difficulty: 'NORMAL' },
      { id: 'sleep_ontime', title: '정한 시간에 눕기', category: 'BODY', difficulty: 'HARD' },
    ],
  },
  {
    id: 'recover',
    name: '컨디션 회복',
    icon: '🫧',
    description: '몸이 안 좋은 날, 이것만.',
    items: [
      { id: 'recover_water', title: '물 챙기기', category: 'BODY', difficulty: 'EASY' },
      { id: 'easy_meal', title: '편한 식사 챙기기', category: 'BODY', difficulty: 'EASY' },
      { id: 'light_move', title: '5분 가볍게 몸 풀기', category: 'BODY', difficulty: 'EASY' },
      { id: 'lie_down', title: '편하게 앉거나 누워 쉬기', category: 'MIND', difficulty: 'EASY' },
      { id: 'warm_shower', title: '따뜻하게 씻기', category: 'LIFE', difficulty: 'EASY' },
      { id: 'cut_todo', title: '오늘 할 일 줄이기', category: 'MIND', difficulty: 'EASY' },
    ],
  },
  {
    id: 'move_light',
    name: '가볍게 움직이기',
    icon: '🏃',
    description: '운동까지는 아니어도 몸을 좀 쓰는 날.',
    items: [
      { id: 'walk_10', title: '10분 걷기', category: 'BODY', difficulty: 'NORMAL' },
      { id: 'neck_shoulder', title: '목과 어깨 풀기', category: 'BODY', difficulty: 'EASY' },
      { id: 'hip_move', title: '허리와 고관절 가볍게 움직이기', category: 'BODY', difficulty: 'EASY' },
      { id: 'stand_up', title: '오래 앉았다면 한번 일어나기', category: 'BODY', difficulty: 'EASY' },
      { id: 'short_walk', title: '짧은 산책', category: 'BODY', difficulty: 'NORMAL' },
      { id: 'prep_workout', title: '운동할 준비하기', category: 'BODY', difficulty: 'EASY' },
      { id: 'stairs', title: '엘리베이터 대신 계단으로', category: 'BODY', difficulty: 'NORMAL' },
      { id: 'stretch_full', title: '전신 스트레칭 15분', category: 'BODY', difficulty: 'NORMAL' },
      { id: 'workout_30', title: '30분 운동하기', category: 'BODY', difficulty: 'HARD' },
    ],
  },
  {
    id: 'eat_well',
    name: '잘 먹기',
    icon: '🥗',
    description: '끼니를 미루지 않는 하루.',
    items: [
      { id: 'first_meal', title: '첫 끼 챙기기', category: 'BODY', difficulty: 'NORMAL' },
      { id: 'protein', title: '단백질 있는 음식 포함하기', category: 'BODY', difficulty: 'EASY' },
      { id: 'fruit_veg', title: '과일 또는 채소 하나 먹기', category: 'BODY', difficulty: 'EASY' },
      { id: 'eat_water', title: '물 챙기기', category: 'BODY', difficulty: 'EASY' },
      { id: 'no_skip', title: '너무 오래 식사를 미루지 않기', category: 'BODY', difficulty: 'EASY' },
      { id: 'prep_meal', title: '다음 끼니 준비하기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'cook_one', title: '직접 한 끼 요리하기', category: 'LIFE', difficulty: 'HARD' },
      { id: 'groceries', title: '장보기', category: 'LIFE', difficulty: 'NORMAL' },
    ],
  },
  {
    id: 'mind_reset',
    name: '마음 정비',
    icon: '🧠',
    description: '머릿속이 복잡할 때.',
    items: [
      { id: 'breathe', title: '천천히 호흡하기', category: 'MIND', difficulty: 'EASY' },
      { id: 'brain_dump', title: '머릿속 할 일 전부 적어내기', category: 'MIND', difficulty: 'NORMAL' },
      { id: 'pick_one', title: '가장 중요한 것 하나 고르기', category: 'WORK', difficulty: 'EASY' },
      { id: 'rest_10', title: '10분 편하게 쉬기', category: 'MIND', difficulty: 'NORMAL' },
      { id: 'music', title: '좋아하는 음악 듣기', category: 'PLAY', difficulty: 'EASY' },
      { id: 'reach_out', title: '생각나는 사람에게 짧게 연락', category: 'HEART', difficulty: 'EASY' },
      { id: 'worry_out', title: '걱정되는 것 종이에 적어보기', category: 'MIND', difficulty: 'NORMAL' },
    ],
  },
  {
    id: 'home_reset',
    name: '집 리셋',
    icon: '🧹',
    description: '집이 어수선할 때 순서대로.',
    items: [
      { id: 'make_bed', title: '침대 정리', category: 'LIFE', difficulty: 'EASY' },
      { id: 'dishes', title: '설거지 끝내기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'trash', title: '쓰레기 버리기', category: 'LIFE', difficulty: 'EASY' },
      { id: 'laundry', title: '빨래 돌리기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'floor_items', title: '바닥 물건 몇 개 제자리', category: 'LIFE', difficulty: 'EASY' },
      { id: 'desk_5', title: '책상 5분 정리', category: 'LIFE', difficulty: 'EASY' },
      { id: 'air_out', title: '환기', category: 'LIFE', difficulty: 'EASY' },
      { id: 'fold_laundry', title: '빨래 개서 넣기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'recycle_out', title: '분리배출 하기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'floor_sweep', title: '바닥 청소', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'boxes', title: '쌓인 택배 상자 정리', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'chair_clothes', title: '의자 위에 쌓인 옷 치우기', category: 'LIFE', difficulty: 'NORMAL' },
    ],
  },
  {
    id: 'deep_clean',
    name: '방 대청소',
    icon: '✨',
    description: '큰맘 먹고 하는 날.',
    weekend: true,
    items: [
      { id: 'bedding', title: '침구 교체', category: 'LIFE', difficulty: 'HARD' },
      { id: 'wash', title: '세탁', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'deep_dishes', title: '설거지', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'recycle', title: '쓰레기·재활용', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'bathroom', title: '욕실 정리', category: 'LIFE', difficulty: 'HARD' },
      { id: 'floor_clean', title: '바닥 청소', category: 'LIFE', difficulty: 'HARD' },
      { id: 'desk_table', title: '책상·화장대', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'fridge', title: '냉장고 정리', category: 'LIFE', difficulty: 'HARD' },
      { id: 'one_zone', title: '방 한 구역 완전히 정리', category: 'LIFE', difficulty: 'HARD' },
      { id: 'kitchen_all', title: '주방 전체 정리', category: 'LIFE', difficulty: 'HARD' },
      { id: 'closet', title: '옷장 정리', category: 'LIFE', difficulty: 'HARD' },
    ],
  },
  {
    id: 'work_start',
    name: '업무 시작',
    icon: '💼',
    description: '일을 여는 순서.',
    bands: ['MORNING', 'DAY'],
    items: [
      { id: 'scan_todo', title: '오늘 할 일 훑기', category: 'WORK', difficulty: 'EASY' },
      { id: 'pick_top', title: '가장 중요한 일 하나 고르기', category: 'WORK', difficulty: 'EASY' },
      { id: 'check_mail', title: '메일 또는 메신저 확인', category: 'WORK', difficulty: 'NORMAL' },
      { id: 'focus_25', title: '25분 집중', category: 'WORK', difficulty: 'NORMAL' },
      { id: 'clean_tabs', title: '불필요한 파일·탭 정리', category: 'WORK', difficulty: 'EASY' },
      { id: 'log_done', title: '완료한 일 기록', category: 'WORK', difficulty: 'EASY' },
      { id: 'reply_mail', title: '밀린 이메일 답장하기', category: 'WORK', difficulty: 'NORMAL' },
      { id: 'finish_doc', title: '문서 하나 끝내기', category: 'WORK', difficulty: 'HARD' },
      { id: 'find_material', title: '필요한 자료 찾아두기', category: 'WORK', difficulty: 'NORMAL' },
      { id: 'read_material', title: '읽어야 할 자료 하나 읽기', category: 'WORK', difficulty: 'NORMAL' },
      { id: 'review_notes', title: '배운 것 복습하기', category: 'WORK', difficulty: 'NORMAL' },
      { id: 'start_dread', title: '제일 미룬 일 시작하기', category: 'WORK', difficulty: 'HARD' },
    ],
  },
  {
    id: 'focus_mode',
    name: '집중 모드',
    icon: '🎯',
    description: '한 가지만 파고들 때.',
    bands: ['MORNING', 'DAY'],
    items: [
      { id: 'mute', title: '알림 잠시 끄기', category: 'WORK', difficulty: 'EASY' },
      { id: 'water_ready', title: '물 준비', category: 'LIFE', difficulty: 'EASY' },
      { id: 'open_needed', title: '필요한 파일만 열기', category: 'WORK', difficulty: 'EASY' },
      { id: 'deep_25', title: '25분 집중', category: 'WORK', difficulty: 'NORMAL' },
      { id: 'break_5', title: '5분 쉬기', category: 'MIND', difficulty: 'EASY' },
      { id: 'next_step', title: '다음 단계 하나 정하기', category: 'WORK', difficulty: 'EASY' },
      { id: 'no_phone_work', title: '일하는 동안 폰 다른 방에 두기', category: 'WORK', difficulty: 'NORMAL' },
      { id: 'deep_50', title: '50분 깊게 집중하기', category: 'WORK', difficulty: 'HARD' },
    ],
  },
  {
    id: 'after_work',
    name: '퇴근 후 리셋',
    icon: '🌆',
    description: '일을 몸에서 떼어내는 시간.',
    bands: ['EVENING'],
    items: [
      { id: 'change_clothes', title: '편한 옷 갈아입기', category: 'LIFE', difficulty: 'EASY' },
      { id: 'evening_water', title: '물 마시기', category: 'BODY', difficulty: 'EASY' },
      { id: 'bag_tidy', title: '가방·소지품 정리', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'light_eat', title: '간단히 먹기', category: 'BODY', difficulty: 'EASY' },
      { id: 'rest_after', title: '10분 쉬기', category: 'MIND', difficulty: 'NORMAL' },
      { id: 'evening_shower', title: '씻기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'close_work', title: '업무 화면 닫기', category: 'MIND', difficulty: 'EASY' },
      { id: 'day_review', title: '오늘 한 일 돌아보기', category: 'MIND', difficulty: 'NORMAL' },
    ],
  },
  {
    id: 'hobby',
    name: '취미 시간',
    icon: '🎨',
    description: '아무 쓸모 없어도 되는 시간.',
    items: [
      { id: 'pick_hobby', title: '오늘 하고 싶은 취미 선택', category: 'PLAY', difficulty: 'EASY' },
      { id: 'get_tools', title: '준비물 꺼내기', category: 'PLAY', difficulty: 'EASY' },
      { id: 'enjoy_20', title: '20분 즐기기', category: 'PLAY', difficulty: 'NORMAL' },
      { id: 'log_hobby', title: '오늘 한 것 기록', category: 'PLAY', difficulty: 'EASY' },
      { id: 'put_back', title: '사용한 것 정리', category: 'LIFE', difficulty: 'EASY' },
      { id: 'hobby_60', title: '취미에 한 시간 온전히 쓰기', category: 'PLAY', difficulty: 'HARD' },
    ],
  },
  {
    id: 'relationship',
    name: '관계 챙기기',
    icon: '💗',
    description: '미뤄둔 마음 한 줄.',
    items: [
      { id: 'say_hi', title: '생각나는 사람에게 안부', category: 'HEART', difficulty: 'EASY' },
      { id: 'reply_one', title: '밀린 답장 하나', category: 'HEART', difficulty: 'NORMAL' },
      { id: 'plan_together', title: '함께 하고 싶은 것 정하기', category: 'HEART', difficulty: 'NORMAL' },
      { id: 'say_thanks', title: '고마웠던 일 표현', category: 'HEART', difficulty: 'EASY' },
      { id: 'log_moment', title: '좋았던 순간 기록', category: 'HEART', difficulty: 'EASY' },
      { id: 'call_parents', title: '부모님께 안부 연락하기', category: 'HEART', difficulty: 'NORMAL' },
      { id: 'family_first', title: '가족에게 먼저 메시지 보내기', category: 'HEART', difficulty: 'NORMAL' },
      { id: 'call_long', title: '오래 연락 못 한 사람에게 연락하기', category: 'HEART', difficulty: 'HARD' },
    ],
  },
  {
    id: 'weekend_reset',
    name: '주말 생활정비',
    icon: '🧺',
    description: '다음 주를 위해 미리.',
    weekend: true,
    items: [
      { id: 'weekend_laundry', title: '빨래', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'weekend_bedding', title: '침구 정리', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'grocery_list', title: '장보기 목록', category: 'LIFE', difficulty: 'EASY' },
      { id: 'weekend_fridge', title: '냉장고 확인', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'weekend_trash', title: '쓰레기·재활용', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'light_clean', title: '가볍게 청소', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'next_week', title: '다음 주 필요한 것 확인', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'week_review', title: '한 주 돌아보기', category: 'MIND', difficulty: 'HARD' },
    ],
  },
  {
    id: 'money',
    name: '생활·행정 관리',
    icon: '💰',
    description: '귀찮아서 계속 뒤로 미뤄지는 것들.',
    items: [
      { id: 'today_spend', title: '오늘 지출 확인', category: 'LIFE', difficulty: 'EASY' },
      { id: 'upcoming_pay', title: '예정 결제 확인', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'buy_list', title: '필요한 구매 목록', category: 'LIFE', difficulty: 'EASY' },
      { id: 'delivery', title: '주문·배송 확인', category: 'LIFE', difficulty: 'EASY' },
      { id: 'week_budget', title: '이번 주 예산 확인', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'subscriptions', title: '구독 서비스 확인하고 정리', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'check_schedule', title: '일정 확인하고 정리하기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'renew', title: '갱신·연장할 것 확인하기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'receipts', title: '영수증·지출 정리하기', category: 'LIFE', difficulty: 'HARD' },
      { id: 'bank_task', title: '미뤄둔 은행 업무 처리', category: 'LIFE', difficulty: 'HARD' },
      { id: 'insurance', title: '보험·서류 확인하기', category: 'LIFE', difficulty: 'HARD' },
    ],
  },
  {
    id: 'digital',
    name: '디지털 정리',
    icon: '📱',
    description: '화면 안쪽도 집이다.',
    items: [
      { id: 'screenshots', title: '스크린샷 10장 삭제', category: 'LIFE', difficulty: 'EASY' },
      { id: 'downloads', title: '다운로드 폴더 확인', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'browser_tabs', title: '브라우저 탭 정리', category: 'WORK', difficulty: 'EASY' },
      { id: 'one_notification', title: '알림 하나 정리', category: 'LIFE', difficulty: 'EASY' },
      { id: 'file_home', title: '파일 하나 제자리', category: 'WORK', difficulty: 'EASY' },
      { id: 'backup', title: '중요 파일 백업 확인', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'unsubscribe', title: '안 보는 알림·구독 끄기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'photos_bulk', title: '사진 대량 정리하기', category: 'LIFE', difficulty: 'HARD' },
      { id: 'inbox_zero', title: '메일함 바닥까지 정리하기', category: 'WORK', difficulty: 'HARD' },
    ],
  },
  {
    id: 'low_energy',
    name: '아무것도 하기 싫은 날',
    icon: '🌱',
    description: '이 중에 하나만 해도 오늘은 성공.',
    items: [
      { id: 'low_water', title: '물 한 번 마시기', category: 'BODY', difficulty: 'EASY' },
      { id: 'low_teeth', title: '양치', category: 'LIFE', difficulty: 'EASY' },
      { id: 'low_eat', title: '먹을 것 조금 챙기기', category: 'BODY', difficulty: 'EASY' },
      { id: 'low_trash', title: '쓰레기 하나 버리기', category: 'LIFE', difficulty: 'EASY' },
      { id: 'low_one_item', title: '물건 하나만 제자리', category: 'LIFE', difficulty: 'EASY' },
      { id: 'low_stretch', title: '2분 몸 풀기', category: 'BODY', difficulty: 'EASY' },
      { id: 'low_one_done', title: '오늘 하나만 완료하기', category: 'MIND', difficulty: 'EASY' },
    ],
  },

  // ── 하고 싶은 것 ────────────────────────────────────────
  //
  // 위쪽 세트는 대부분 챙겨야 하는 것들이다. 그것만 있으면 목록이 전부 할 일이 되고,
  // "딱히 하고 싶은 것도 없어" 라는 말에 앱이 내밀 게 없다.
  {
    id: 'go_outside',
    name: '밖에 나가기',
    icon: '🚶',
    description: '멀리 안 가도 된다. 문밖까지만 가도 오늘은 나간 거다.',
    bands: ['MORNING', 'DAY', 'EVENING'],
    items: [
      { id: 'shoes_on', title: '신발 신고 문밖까지', category: 'BODY', difficulty: 'EASY' },
      { id: 'one_stop', title: '한 정거장 걸어보기', category: 'BODY', difficulty: 'NORMAL' },
      { id: 'new_way', title: '안 가본 길로 돌아오기', category: 'PLAY', difficulty: 'NORMAL' },
      { id: 'look_up', title: '하늘 한 번 보기', category: 'MIND', difficulty: 'EASY' },
      { id: 'buy_outside', title: '밖에서 뭐 하나 사 먹기', category: 'PLAY', difficulty: 'NORMAL' },
      { id: 'sit_bench', title: '벤치에 앉아 있다 오기', category: 'MIND', difficulty: 'NORMAL' },
      { id: 'walk_30', title: '30분 걷기', category: 'BODY', difficulty: 'HARD' },
    ],
  },
  {
    id: 'alone_fun',
    name: '혼자 노는 시간',
    icon: '🎧',
    description: '남는 시간에 하는 게 아니라, 이걸 하려고 시간을 비우는 것.',
    items: [
      { id: 'watch_one', title: '보고 싶었던 것 한 편', category: 'PLAY', difficulty: 'NORMAL' },
      { id: 'new_song', title: '안 듣던 노래 틀어보기', category: 'PLAY', difficulty: 'EASY' },
      { id: 'one_game', title: '게임 한 판', category: 'PLAY', difficulty: 'NORMAL' },
      { id: 'keep_reading', title: '읽다 만 것 이어 읽기', category: 'PLAY', difficulty: 'NORMAL' },
      { id: 'lie_around', title: '아무것도 안 하고 누워 있기', category: 'MIND', difficulty: 'EASY' },
      { id: 'hour_of_it', title: '좋아하는 걸로 한 시간', category: 'PLAY', difficulty: 'NORMAL' },
      { id: 'one_song_deep', title: '좋아하는 노래 한 곡 집중해서 듣기', category: 'PLAY', difficulty: 'EASY' },
      { id: 'finish_book', title: '읽던 책 끝까지 읽기', category: 'PLAY', difficulty: 'HARD' },
    ],
  },
  {
    id: 'make_something',
    name: '손으로 만들기',
    icon: '✂️',
    description: '잘 만들 필요는 없다. 만드는 동안이 목적이다.',
    items: [
      { id: 'decide_make', title: '뭘 만들지 정하기', category: 'PLAY', difficulty: 'EASY' },
      { id: 'lay_out', title: '재료 꺼내놓기', category: 'PLAY', difficulty: 'EASY' },
      { id: 'make_30', title: '30분 만들어보기', category: 'PLAY', difficulty: 'NORMAL' },
      { id: 'photo_it', title: '사진으로 남기기', category: 'PLAY', difficulty: 'EASY' },
      { id: 'three_lines', title: '오늘 있었던 일 세 줄', category: 'MIND', difficulty: 'EASY' },
      { id: 'leave_unfinished', title: '잘 안 된 것도 그냥 두기', category: 'MIND', difficulty: 'EASY' },
      { id: 'make_finish', title: '만들다 만 것 완성하기', category: 'PLAY', difficulty: 'HARD' },
    ],
  },
  {
    id: 'treat_myself',
    name: '나를 위한 작은 것',
    icon: '🍰',
    description: '큰 거 말고. 오늘 하루가 조금 나아지는 정도로.',
    items: [
      { id: 'buy_favorite', title: '좋아하는 거 하나 사 먹기', category: 'PLAY', difficulty: 'EASY' },
      { id: 'order_it', title: '미뤄둔 거 하나 시켜보기', category: 'PLAY', difficulty: 'EASY' },
      { id: 'change_light', title: '향이나 조명 바꿔보기', category: 'MIND', difficulty: 'EASY' },
      { id: 'long_shower', title: '오래 씻기', category: 'LIFE', difficulty: 'EASY' },
      { id: 'wear_good', title: '좋아하는 옷 입고 나가기', category: 'PLAY', difficulty: 'EASY' },
      { id: 'well_done', title: '나한테 잘했다고 하기', category: 'HEART', difficulty: 'EASY' },
      { id: 'photo_look_back', title: '최근 찍은 사진 하나 돌아보기', category: 'MIND', difficulty: 'EASY' },
    ],
  },
  {
    id: 'see_people',
    name: '사람 만나기',
    icon: '🫂',
    description: '연락은 먼저 하는 쪽이 손해가 아니다.',
    items: [
      { id: 'ask_meet', title: '만나자고 먼저 말 꺼내기', category: 'HEART', difficulty: 'NORMAL' },
      { id: 'set_date', title: '날짜 정하기', category: 'HEART', difficulty: 'NORMAL' },
      { id: 'leave_note', title: '안부 남기기', category: 'HEART', difficulty: 'EASY' },
      { id: 'send_photo', title: '같이 찍은 사진 보내주기', category: 'HEART', difficulty: 'EASY' },
      { id: 'thank_out_loud', title: '고맙다고 말하기', category: 'HEART', difficulty: 'NORMAL' },
      { id: 'think_of_someone', title: '오래 못 본 사람 떠올려보기', category: 'HEART', difficulty: 'EASY' },
      { id: 'meet_up', title: '약속 날짜까지 잡아버리기', category: 'HEART', difficulty: 'HARD' },
    ],
  },

  // ── 미뤄둔 것 ───────────────────────────────────────────
  //
  // 이 앱을 만든 이유가 여기 있다. 위의 세트들은 하루를 잘 굴리는 것이고,
  // 아래 세트들은 **몇 주째 그대로 있는 것**을 건드리는 자리다.
  {
    id: 'backlog',
    name: '밀린 일 처리',
    icon: '🗂️',
    description: '계속 미루고 있던 것들. 하나만 골라도 오늘은 충분하다.',
    items: [
      { id: 'reply_message', title: '미뤄둔 답장 하나 하기', category: 'HEART', difficulty: 'NORMAL' },
      { id: 'order_thing', title: '필요한 물건 주문하기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'one_small', title: '미뤄둔 작은 일 하나 끝내기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'pay_bill', title: '밀린 결제·납부 처리하기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'make_booking', title: '미뤄둔 예약하기', category: 'LIFE', difficulty: 'HARD' },
      { id: 'hospital', title: '병원·검진 예약하기', category: 'LIFE', difficulty: 'HARD' },
      { id: 'apply_form', title: '신청·접수 하나 처리하기', category: 'LIFE', difficulty: 'HARD' },
      { id: 'papers', title: '미뤄둔 서류 처리하기', category: 'LIFE', difficulty: 'HARD' },
      { id: 'important_mail', title: '중요한 메일 보내기', category: 'WORK', difficulty: 'HARD' },
      { id: 'hard_call', title: '해야 하는 전화 한 통 걸기', category: 'HEART', difficulty: 'HARD' },
    ],
  },
  {
    id: 'organize',
    name: '정리의 날',
    icon: '🗄️',
    description: '언젠가 해야지 하고 지나간 자리들.',
    items: [
      { id: 'drawer', title: '서랍 한 칸 정리', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'bag_all', title: '가방 전부 비우고 정리', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'fridge_shelf', title: '냉장고 한 칸 정리', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'desk_full', title: '책상 전부 정리하기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'throw_five', title: '안 쓰는 물건 다섯 개 버리기', category: 'LIFE', difficulty: 'NORMAL' },
      { id: 'files', title: '파일·폴더 정리하기', category: 'WORK', difficulty: 'NORMAL' },
      { id: 'closet_season', title: '옷장 한 번 갈아엎기', category: 'LIFE', difficulty: 'HARD' },
      { id: 'photos_sort', title: '사진 정리하기', category: 'LIFE', difficulty: 'HARD' },
      { id: 'old_food', title: '오래된 음식 확인하고 버리기', category: 'LIFE', difficulty: 'HARD' },
    ],
  },
  {
    id: 'finish_it',
    name: '끝까지 해보기',
    icon: '🎯',
    description: '제일 무거운 것 하나를 오늘 안에 끝내보는 순서.',
    items: [
      { id: 'pick_dread', title: '제일 미루고 있는 일 하나 고르기', category: 'MIND', difficulty: 'EASY' },
      { id: 'split_it', title: '그 일을 세 조각으로 쪼개기', category: 'WORK', difficulty: 'NORMAL' },
      { id: 'first_piece', title: '첫 조각 시작하기', category: 'WORK', difficulty: 'NORMAL' },
      { id: 'keep_going', title: '한 시간 붙어 있기', category: 'WORK', difficulty: 'HARD' },
      { id: 'finish_line', title: '끝까지 마무리하기', category: 'WORK', difficulty: 'HARD' },
      { id: 'send_it', title: '제출하거나 보내버리기', category: 'WORK', difficulty: 'HARD' },
      { id: 'tell_someone', title: '끝냈다고 누군가에게 말하기', category: 'HEART', difficulty: 'EASY' },
    ],
  },
  {
    id: 'good_for_me',
    name: '하면 좋은데 잘 안 하는 것',
    icon: '☀️',
    description: '안 해도 아무 일 없지만, 하고 나면 하루가 달라지는 것들.',
    items: [
      { id: 'gratitude_three', title: '감사한 일 3개 적기', category: 'MIND', difficulty: 'NORMAL' },
      { id: 'diary_short', title: '짧은 일기 쓰기', category: 'MIND', difficulty: 'NORMAL' },
      { id: 'meditate_10', title: '10분 명상하기', category: 'MIND', difficulty: 'NORMAL' },
      { id: 'did_well', title: '오늘 잘한 일 한 가지 적기', category: 'MIND', difficulty: 'EASY' },
      { id: 'one_sentence', title: '오늘 있었던 일 한 문장 남기기', category: 'MIND', difficulty: 'EASY' },
      { id: 'note_tomorrow', title: '내일의 나에게 한 문장 남기기', category: 'MIND', difficulty: 'EASY' },
      { id: 'nothing_10', title: '10분 아무것도 안 하고 있기', category: 'MIND', difficulty: 'NORMAL' },
      { id: 'week_good', title: '이번 주 좋았던 순간 하나 적기', category: 'MIND', difficulty: 'NORMAL' },
      { id: 'sunlight', title: '햇빛 15분 쬐기', category: 'BODY', difficulty: 'NORMAL' },
      { id: 'thank_someone', title: '고마웠던 사람에게 한마디 보내기', category: 'HEART', difficulty: 'NORMAL' },
      { id: 'call_family', title: '부모님께 안부 전화하기', category: 'HEART', difficulty: 'NORMAL' },
      { id: 'diary_long', title: '오늘 하루 길게 적어보기', category: 'MIND', difficulty: 'HARD' },
      { id: 'meditate_30', title: '30분 앉아 있어보기', category: 'MIND', difficulty: 'HARD' },
    ],
  },
]

/** preset id 는 팩 안에서만 고유해서, 전체에서는 팩 id 를 앞에 붙여 쓴다. */
export function presetKey(packId: string, presetId: string): string {
  return `${packId}:${presetId}`
}

export interface PresetEntry {
  pack: QuestPackDef
  preset: QuestPreset
  key: string
}

/** 모든 준비된 퀘스트를 한 줄로 편 목록 */
export const ALL_PRESETS: PresetEntry[] = QUEST_PACKS.flatMap((pack) =>
  pack.items.map((preset) => ({ pack, preset, key: presetKey(pack.id, preset.id) })),
)

export function findPack(id: string): QuestPackDef | null {
  return QUEST_PACKS.find((p) => p.id === id) ?? null
}

export function findPreset(key: string): PresetEntry | null {
  return ALL_PRESETS.find((e) => e.key === key) ?? null
}
