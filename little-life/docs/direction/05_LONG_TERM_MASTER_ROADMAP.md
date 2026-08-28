# LITTLE LIFE — LONG-TERM MASTER ROADMAP

> 장기 확장 방향을 보존하기 위한 Master Roadmap. 실제 구현 완료 상태와 가까운 업데이트 순서는 `02_UPDATE_HISTORY_ROADMAP.md`를 우선한다. 이 문서의 기능을 한 번에 구현하지 않는다.

## 0. NORTH STAR

LITTLE LIFE는 현실의 작은 행동을 퀘스트·탐험·수집·성장으로 바꾸는 현대 생활 판타지 RPG다.

> 재미있는 세계가 궁금해서 현실에서 움직인다.  
> 현실에서 움직였기 때문에 세계가 조금 더 열린다.

생산성을 강요하는 앱이 아니라, 현실의 하루가 RPG 플레이 시간이 되게 한다.

## 1. THREE CORE LOOPS

### LIFE LOOP
현실 행동 → Quest 완료 → EXP / Coin / Drop → Character / Collection / Room / Adventure 성장

### LIVING WORLD LOOP
게임 접속 → 현재 현실시간의 도시 확인 → NPC / 가게 / 작은 사건 발견 → 현실로 돌아감 → 시간이 흐름 → 다시 접속 → 조금 달라진 도시 발견

### DISCOVERY LOOP
도시 → Old Quarry → Creature → Dungeon → 도시 외곽 → 숲 → 채집 → 호수 → 마법 → 새로운 지역 → 희귀한 존재 → 세계의 오래된 비밀

## 2. ABSOLUTE DESIGN RULES

- 한 번에 한 Update만 구현한다.
- 새 시스템 전에 기존 Quest / StoryChapter / Discovery / Collection / RNG / 날짜 / timeBand / adventureEnergy / Save 구조를 먼저 조사한다.
- 현실생활을 게임에 종속시키지 않는다.
- 운동 10회 → 특정 Romance 해금 같은 노골적 현실행동 Gate를 피한다.
- 하루 미접속, 놓친 시간대, 연속 출석 등에 벌칙을 주지 않는다.
- 중요한 Scene은 특정 시각을 놓쳤다고 소멸하지 않는다.
- 현실 행동은 Story의 입장권이 아니라, 이 세계와 함께 살아온 기록이다.

## 3. LIVING CITY PRINCIPLES

목표는 플레이어가 접속했을 때 “내가 없던 동안에도 이 사람들이 자기 삶을 살고 있었구나”라고 느끼게 하는 것.

핵심:

> 생활은 계속된다.  
> 중요한 이야기는 플레이어를 기다려준다.

가게마다 영업시간이 다르고, 가게가 닫히면 NPC는 사라지는 것이 아니라 퇴근한다. NPC는 WORK / HOME / FAVORITE / SOCIAL / NIGHT 같은 생활권을 가진다.

## 4. LIVING SCENE

절대 원칙:

> Routine은 반복된다.  
> Scene은 반복되지 않는다.  
> Scene이 지나가면 세계가 조금 변한다.

중요한 Story Scene은 1회성. 놓치면 다음 적절한 시간대에 다시 발생 가능. Scene 이후 Dialogue Pool, Routine, Relationship Discovery, Journal, Personal Story, 다음 Scene 가능성 등이 달라질 수 있다.

## 5. DIALOGUE

반복 생활 대사와 1회성 Story Scene을 분리한다. WORK / HOME / MORNING / NIGHT / RAIN / FRIEND / CLOSE_FRIEND / POST_STORY / CRUSH / DATING / DISTANT / EX 등 상황별 Pool을 사용한다. 최근 사용 대사는 일정 기간 제외해 반복감을 줄인다.

## 6. NPC DESIGN PHILOSOPHY

초기 핵심 주민 약 25명. 향후 지역마다 약 10명 규모 확장 가능.

모든 NPC가 거대한 비밀을 가질 필요는 없다. 평범한 사람, 부모, 학생, 오타쿠, 자발적 아웃사이더, 항상 웃는 사람, 툴툴거리는 사람, 운동에 미친 사람, 오래 산 사람, 마법사 등이 함께 살아야 한다.

직업이 곧 캐릭터가 아니어야 한다.

## 7. NPC RELATIONSHIP WEB

NPC들은 플레이어를 만나기 전부터 서로 알고 지냈다.

관계 예:
- 친남매
- 소꿉친구
- 오래된 친구
- 소개팅 실패
- 전 직장 상사 / 부하
- 엄마 친구 아들
- 대학 수업에서 안면만 있는 사이
- 전 배우자
- 취미 동호회
- 온라인 게임 길드원
- 단골 / 가게 주인
- 이웃

관계 자체가 Discovery 콘텐츠다.

## 8. PERSONAL STORY

목표는 공략이 아니라 먼저 이 사람을 좋아하게 만드는 것.

Friendship을 통해 생활, 취향, 인간관계, 과거, 약점, 현재 고민, 숨겨진 모습을 발견한다. Personal Story 대부분은 Romance 없이도 볼 수 있어야 한다.

## 9. FRIENDSHIP / HISTORY / CHEMISTRY

기본 방향:
STRANGER → ACQUAINTANCE → FRIEND → CLOSE_FRIEND

장기 관계 원칙:

> History는 쌓이고, Chemistry는 움직인다.

History는 Personal Scene, 비밀, 갈등, 화해, 과거 연애처럼 영구적으로 남는 관계의 역사. Chemistry는 최근 교류, 설렘, 신뢰, 거리감 등 현재 온도.

## 10. ROMANCE

Romance는 충분한 Friendship과 Personal Story 이후 열리는 Endgame 성격의 콘텐츠다.

- 성별 제한 없음.
- 플레이어 Character Skin의 현재 외형과 무관.
- 주요 Romance 후보끼리는 기본적으로 서로 연애하지 않는다.
- Romance는 호감도 숫자 하나보다 Close Friendship + Personal Story + History + 현재 Chemistry + 특정 선택으로 자연스럽게 열린다.
- 후보 상태: CRUSH / DATING / DISTANT / EX.
- 하루 미접속, 며칠 대화 안 함으로 자동 감소/이별하지 않는다.
- 연애 중에도 다른 NPC와 Friendship / Personal Story 가능.
- 다른 Romantic Action은 질투나 갈등으로 이어질 수 있다.
- 헤어져도 History는 남고 EX → FRIEND / 재결합 가능.
- 결혼은 현재 구현 대상에서 제외하고 Long-Term Relationship Hook만 남긴다.

## 11. CURRENT CHARACTER STORY SEEDS

### 정시우
- 32, 타코야끼 트럭 사장.
- 전직 인디 록밴드 보컬. 밴드는 완전히 해체.
- 패션 관심 많고 빈티지숍 단골.
- 민지는 과거 밴드 팬이라 알아봤지만 모른 척함.
- 은채와 소꿉친구였으나 현재 소원함.
- 처음에는 “벽을 왜 돈 주고 타냐”고 하지만 이후 클라이밍에 깊게 빠져 오전 Routine이 달라짐.
- 썸이 깊어지면 플레이어에게 노래를 불러주는 1회성 Scene 후보.
- Story Core: 끝난 꿈도 실패한 삶은 아니다.

### 윤태오
- 34, 현재 러닝광.
- 과거에는 매우 마르고 운동을 안 하며 내향적.
- 좋아하던 여자친구와 헤어진 뒤 잊으려고 매일 달리기 시작.
- 이후 몸과 성격이 크게 변해 사교적이 됨.
- Friendship은 쉽지만 Romance에는 마음을 잘 열지 않음. 한번 열면 올인.
- Story Core: 사람과 가까워지는 건 쉬워졌지만 사랑은 아직 어렵다.

### 한도윤
- 30, 클라이밍에 매우 깊게 빠져 있음.
- 헬스 근육을 “패션근육”이라고 생각하며 태오와 운동관으로 자주 티격거림.
- 시우의 클라이밍 입문 계기.
- Story Core: 좋아하는 것에는 적당히가 없다.

### 박준
- 24, 편의점 오후 근무 / 휴학생.
- 현실에서는 낯가리고 흐트러진 모습.
- 게임에서는 서버 상위권 네임드, 온라인에서는 유명 일러스트레이터.
- 유나는 현실의 준은 비호감인데 게임 속 준을 동경.
- 선재는 준의 정체를 알고 있음.
- Story Core: 현실에서 보이는 모습과 온라인에서 빛나는 모습 사이.

### 신유나
- 36, 필라테스 강사.
- 현실에선 자기관리 철저, 집에서는 게임에 몰입.
- 게임 속 준을 동경하지만 현실 준은 별로라고 생각.
- 정체 공개가 주요 Story.
- Story Core: 잘하는 사람도 누군가를 동경한다.

### 류선재
- 33, 프리랜서 번역가 / 수집광.
- 준과 수집 동호회에서 만났고 게임도 함께 함.
- 유나와 같은 길드. 유나가 게임 속 준을 선망하는 사실을 알고 있음.
- 오래된 문자를 읽을 수 있다는 Hook.
- Story Core: 많은 걸 알고 있지만 굳이 판을 흔들지 않는다.

### 임소라
- 28, 심야영화관 직원.
- 카페인 중독. 스트레스가 높을수록 커피가 늘어나는 경향.
- 항상 웃고 갈등을 피함.
- 정원과 대학 룸메이트 출신 오랜 친구.
- Story Core: 괜찮다고 웃는다고 정말 괜찮은 것은 아니다.

### 유정원
- 34, 회사원 / 흡연자.
- 소라와 서로 상대의 중독이 더 나쁘다고 생각.
- 직접적이고 야무지지만 자신의 약한 감정은 말하기 어려움.
- Story Core: 할 말은 잘하지만 약한 이야기는 잘하지 못한다.

### 차세라 / 김재희
- 전 배우자.
- 배신보다 서로 다른 생활 방식 때문에 이혼.
- 현재도 서로를 잘 알고 인간적인 관계가 남아 있음.
- 세라: 자유롭게 산다는 것과 누구도 필요하지 않다는 것은 다르다.
- 재희: 평범한 하루를 사랑하는 사람.

### 이하린
- 25, 대학원생 / 순혈 마법사.
- 혈통 있는 마법사 집안, 마법사 사회의 규칙을 잘 앎.
- 이안을 원로로 인식.
- Story Core: 특별하게 태어난 사람에게 평범함은 오히려 낯설다.

### 강유현
- 29, 편의점 야간.
- Creature에 특화된 혼혈.
- 정규 마법사 사회에 잘 참여하지 않고 본인도 마법사 정체성이 강하지 않음.
- 정확한 혈통은 미확정.
- Story Core: 자기가 무엇인지 설명할 말부터 없는 사람.

### 서이안
- 빈티지숍 사장. 외견상 30대 초중반, 실제 나이 불명.
- 마법사 사회의 원로 중 한 명.
- 다른 사람의 비밀을 알더라도 함부로 말하지 않음.
- 하린에게는 원로, 유현에게는 “이안 씨”, 미래에게는 “이안아”.
- Story Core: 알아갈수록 처음 알고 있던 정보가 하나씩 틀려진다.

## 12. NATURE EXPANSION

Forest는 Farm과 역할을 분리한다.

Farm: 기른다 / 돌본다 / 수확한다.  
Forest: 발견한다 / 관찰한다 / 채집한다.

Forest에서는 식물, 버섯, 열매, 광물, Creature, 작은 물길, 계절 변화 등을 발견. 새 채집 전용 에너지, 랜덤 실패, 과도한 도구 내구도, 매일 해야 하는 구조는 피한다.

향후 Lake / Fishing은 반사신경 미니게임보다 기다림, 발견, 도감, 계절, Creature 중심.

## 13. HIDDEN MAGIC

판타지는 초반부터 세계 전체를 덮지 않는다. 먼저 플레이어가 도시와 사람들을 평범한 생활인으로 좋아하게 한 뒤 하린, 유현, 이안, Creature, Old Quarry, Forest를 통해 조금씩 드러난다.

향후 질문:
- 마법사는 왜 숨어 사는가
- 순혈 / 혼혈이란 무엇인가
- 원로는 무엇인가
- 이안은 얼마나 오래 살았는가
- 유현은 왜 모임에 나오지 않는가
- Creature와 마법사는 어떤 관계인가

미확정 설정은 억지로 확정하지 않는다.

## 14. RARE FANTASY CREATURES

유니콘과 드래곤은 일반 몬스터가 아니다.

유니콘: 발자국, 식물 변화, Creature 반응, 오래된 그림, NPC 기억으로 장기간 암시 후 발견. 포획/전투/소유 대상 아님.

드래곤: Creature 이동 변화, 숲의 이상, 식물 변화, 마력 흐름, 오래된 이야기, 큰 그림자로 장기간 암시. Boss나 가챠 대상이 아니라 세계에 원래 살아 있던 희귀한 존재.

## 15. REGIONAL EXPANSION

새 지역마다 약 10명 규모 신규 NPC를 단계적으로 추가 가능. 한 번에 10명을 투하하지 않고 3+3+4 정도로 나눔. 기존 주민과 친구, 친척, 전 직장, 온라인, 마법사 집안 등으로 연결될 수 있다.

## 16. LONG-TERM UPDATE ROADMAP

### ERA 1 — 도시 밖에 뭔가 있다
- F Creature Collection + Dungeon Boss
- G Companion Expedition
- H Additional Dungeons
- I Character / Trophy Rewards
- J Beyond the City Map

### ERA 2 — 이 도시에 사람들이 산다
- K Living City 1 — Real Time & Business Hours
- L Living City 2 — NPC Routine
- M Living City 3 — Living Dialogue
- N Living City 4 — One-time Living Scene

### ERA 3 — 이 사람들은 나를 만나기 전부터 알고 지냈다
- O NPC Relationship Web
- P Personal Stories 1
- Q Personal Stories 2
- R Personal Stories 3

### ERA 4 — 아주 가까운 사람
- S Close Friendship
- T Romance 1 — Crush & Dating
- U Romance 2 — Dynamic Relationship
- V Romance 3 — Jealousy / Choice / EX

### ERA 5 — 숲 너머
- W The Forest
- X Forest Gathering
- Y Lake / Fishing

### ERA 6 — 사실 이 도시는 조금 이상했다
- Z Hidden Magic
- AA Magic Circle / Society
- AB Creature Lineage

### ERA 7 — 아주 드문 것들
- AC Signs of the Unicorn
- AD The Unicorn

### ERA 8 — 더 넓은 세계
- AE~AG Regional Expansion

### ERA 9 — 큰 그림자
- AH Something in the Forest
- AI Old Stories
- AJ The Dragon

## 17. FORESHADOWING RULE

장기 Story는 몇 Update 전에 작은 흔적을 남길 수 있지만 Hook은 구현이 아니다.

좋은 Hook: 유현에게 Creature가 덜 경계함 / 이안이 오래된 물건을 알아봄 / 우식이 예전에 비슷한 것을 봤다고 말함 / 숲에서 설명되지 않는 흔적.

나쁜 Hook: 아직 필요 없는 Magic 데이터 구조, Romance 상태 머신, Forest 시스템을 미리 구현.

## 18. FINAL PRODUCT VISION

플레이어가 접속했을 때 카페 주인은 일하고 있고, 친구는 공원에서 달리고 있고, 누군가는 퇴근했고, 누군가는 이제 출근했고, 타코야끼 트럭에는 단골이 와 있고, 오래 알고 지낸 두 사람이 이상한 대화를 하고 있고, 숲에서는 작은 Creature가 움직이고 있고, 플레이어가 아직 모르는 오래된 이야기가 도시 어딘가에 남아 있는 세계.

플레이어는 그 세계를 더 보고 싶어서 현실로 돌아간다.

> 현실에서 살아가는 시간이 게임을 하지 못한 시간이 아니라 LITTLE LIFE 세계와 함께 흘러간 시간이 되게 한다.
