# LITTLE LIFE — LIVING CITY SYSTEM

> 현실시간 기반 Living City 시스템 설계 기준. NPC 개별 설정은 `06_NPC_CHARACTER_BIBLE.md`, 실제 구현 순서는 `02_UPDATE_HISTORY_ROADMAP.md`를 우선한다.

## 0. SYSTEM NORTH STAR

> 생활은 계속된다. 중요한 이야기는 플레이어를 기다려준다.  
> Routine은 반복된다. Scene은 반복되지 않는다. Scene 이후 세계가 조금 변한다.

목표는 플레이어가 “내가 없던 동안에도 사람들이 자기 하루를 살고 있었구나”라고 느끼게 하는 것.

## 1. LIVING WORLD LOOP

게임 접속 → 현재 현실시간 확인 → 열린 가게 / NPC 현재 위치 → 생활 대화 / 우연한 조우 → 필요하면 1회성 Living Scene → 현실로 돌아감 → 시간이 흐름 → 다시 접속 → 도시가 조금 달라짐.

## 2. REAL TIME

분 단위 NPC 스케줄보다 기존 `timeBand` 우선. 예: DAWN / MORNING / AFTERNOON / EVENING / NIGHT / LATE_NIGHT.

정확한 시각은 영업시간에 제한적으로 사용. 특정 시간을 놓쳤다고 중요한 Scene이 소멸하면 안 된다.

## 3. BUSINESS HOURS

예시:
- Cafe 07:30–20:00
- Bakery 이른 아침~오후
- Flower Shop 오전~저녁
- Independent Bookstore 늦은 오전~저녁
- Vintage Shop 12:00–22:00
- Record Shop 점심~저녁
- Takoyaki Truck 15:30–23:00
- BAR 18:00–02:00
- Late-night Restaurant 저녁~새벽
- Cinema 오후/저녁~심야
- Convenience Store 24시간 / 3교대

CLOSED = NPC OFF가 아니라 NPC가 자기 생활로 돌아감.

## 4. NPC ROUTINE MODEL

NPC마다 전체 시간표를 수작업하지 않고 다음 카테고리 중심으로 설계:
WORK / HOME / FAVORITE / SOCIAL / HOBBY / NIGHT / SPECIAL.

예: 정시우
- WORK: Takoyaki Truck
- HOME: Haesol Officetel
- FAVORITE: Haru Cafe / Vintage Shop
- HOBBY: Climbing Gym
- SOCIAL: Flower Shop / Record Shop
- NIGHT: Convenience Store / BAR / Home

Story 이전엔 Climbing 낮은 비중, Story 이후 높은 비중.

## 5. ROUTINE RESOLUTION

위치는 랜덤처럼 보이되 일관적이어야 한다. 가능하면 `date + timeBand + npcId + optional story state` 기반 seeded RNG 재사용. 같은 Time Band에서 화면 재진입으로 NPC가 순간이동하지 않는다.

## 6. DAY TYPE

모든 요일을 개별 시간표로 만들기보다 WORKDAY / SATURDAY / SUNDAY / PERSONAL_DAY_OFF / SPECIAL_EVENT_DAY 같은 Day Type 검토. 직업에 따라 주말이 휴일이 아닐 수 있다.

## 7. RESIDENCE

생활권 후보:
- 늘봄아파트
- 해솔 오피스텔
- 달맞이 언덕
- 은하 레지던스
- 한빛대학교 기숙사

늦은 밤에는 집 내부보다 집 앞, 로비, 골목, 편의점 가는 길, 벤치 등에서 조우. NPC별 심야 대사 차등.

## 8. WEATHER MODIFIER

날씨는 Routine을 완전히 갈아엎지 않고 작은 변화만 준다. 예: 비 오는 날 태오는 공원 출현이 줄고 Cafe / Training Zone / Home 증가. 야외 장사는 비 때문에 삭제하지 않고 위치/대사 정도만 변주.

## 9. SOCIAL PULL

NPC는 다른 NPC 때문에 움직일 수 있다. 초기에는 복잡한 AI가 아니라 명시적 Modifier로 시작.

예:
- 소라 스트레스 높음 → 정원이 영화관 주변에 나타날 가능성 증가
- 시우 Climbing Story → 도윤과 같은 장소 출현 증가
- 민지/지호 음악 Story → Record Shop 동시 출현 증가

## 10. LIVING DIALOGUE

두 종류:
- Reusable Life Dialogue
- One-time Living Scene

대사 Pool 예: WORK / HOME / MORNING / EVENING / NIGHT / RAIN / FAVORITE_LOCATION / WITH_SPECIFIC_NPC / FRIEND / CLOSE_FRIEND / POST_STORY / CRUSH / DATING / DISTANT / EX.

최근 대사 반복 방지 필요.

## 11. LIVING SCENE

새 시스템을 바로 만들기 전에 기존 `StoryChapter` 조사.

조건 후보:
- id
- participants
- location
- requiredTimeBand
- allowedDays
- requiredStory
- requiredRelationship
- requiredSceneIds
- blockedSceneIds
- once
- onComplete

중요한 Scene은 1회성이고 시간 때문에 영구 소멸하지 않는다.

## 12. SCENE AFTERMATH

Scene 이후 Dialogue Pool, Routine Modifier, Location preference, Relationship Discovery, Journal entry, Personal Story progress, next Scene eligibility 등이 달라질 수 있다.

예: 시우 첫 Climbing Scene → 이후 MORNING에 Climbing Gym 출현 증가.

## 13. JOURNAL / CHARACTER NOTES

Story를 공략 체크리스트처럼 보여주지 않는다.

금지: `시우의 비밀 4/8`, `다음 목표: 토요일 밤 민지에게 말 걸기`.

대신 자동 기록:
> 시우는 요즘 오전에 클라이밍짐에서 자주 보인다.  
> 은채와 아주 오래전부터 아는 사이였다.  
> 민지는 시우를 예전부터 알고 있었던 것 같다.

## 14. RELATIONSHIP DISCOVERY

NPC 관계도 Living Scene을 통해 조금씩 발견한다. 처음부터 전체 관계도 공개 금지.

## 15. HISTORY / CHEMISTRY SUPPORT

History는 이미 함께 겪은 영구적 관계의 역사. Chemistry는 현재 관계 온도. 긴 미접속으로 Friendship History가 사라지지 않는다.

## 16. ABSENCE RULE

금지:
- 하루 접속 안 함 → Friendship 감소
- 매일 말 안 걸면 관계 감소
- 며칠 접속 안 함 → 연인 자동 이별

긴 시간 후 “오랜만” Context Dialogue는 가능. 중요한 관계 변화는 반드시 Scene으로.

## 17. NPC × NPC SCENE

플레이어는 NPC를 항상 1:1로 만날 필요가 없다.

예:
- 시우 + 은채
- 지호 + 민지
- 소라 + 정원
- 태오 + 도윤
- 준 + 유나 + 선재
- 하린 + 유현 + 이안

## 18. INFORMATION ASYMMETRY

NPC마다 알고 있는 정보가 다르다. 모든 NPC가 모든 관계/비밀을 공유하지 않는다.

## 19. GOSSIP — FUTURE HOOK

장기적으로 정보가 NPC 관계망을 따라 이동할 수 있지만 초기 Living City에서는 구현하지 않는다.

## 20. REAL-LIFE QUEST CONNECTION

좋은 연결: 최근 운동 Quest가 많아 태오가 “요즘 자주 움직이네요.”라고 알아봄.

나쁜 연결: 운동 10회 완료 → 태오 Romance 해금.

핵심은 현실에서 설거지/빨래/운동/공부/일을 하고 돌아오는 동안 시간이 흘러 가게가 열리고 NPC가 이동하고 새로운 Scene 조건이 자연스럽게 맞는 것.

## 21. FOMO PREVENTION

항상 점검:
- 중요한 Scene이 영구적으로 놓칠 수 있는가?
- 특정 현실시간 접속을 강요하는가?
- 특정 요일을 못 맞추면 손해인가?
- 장기 미접속을 벌주는가?
- 플레이어 부재 중 NPC가 중요한 관계 결정을 끝내버리는가?

하나라도 YES면 수정 우선.

## 22. SAVE PRINCIPLES

저장 후보:
- seenSceneIds
- explicit Story progress
- 관계 History
- 최근 Dialogue 최소 정보
- Romance 상태

가능하면 저장하지 않는 것:
- 현재 NPC 위치
- 가게 Open 상태
- timeBand
- derive 가능한 unlock boolean

## 23. TIMEZONE / DATE SAFETY

검증:
- timezone
- midnight boundary
- 23:59 → 00:00
- 18:00–02:00 같은 overnight business
- date change
- reload
- device time 변경

## 24. PHASED IMPLEMENTATION

1. REAL TIME & BUSINESS HOURS
2. NPC ROUTINE
3. LIVING DIALOGUE
4. ONE-TIME LIVING SCENE
5. RELATIONSHIP DISCOVERY
6. PERSONAL STORY
7. CLOSE FRIENDSHIP
8. ROMANCE

한 번에 구현하지 않는다.

## 25. FINAL VISION

플레이어가 아침에 게임을 켠다. 카페가 열려 있고 태오는 공원에서 달리고 유현은 야간근무를 마치려 한다. 플레이어는 현실로 돌아가 설거지와 빨래를 한다. 다시 들어오면 시우는 클라이밍짐에서 트럭으로 이동했고 민지는 일을 마치고 빈티지숍에 있고 꽃집은 곧 닫힌다. 밤이 되면 BAR에 불이 켜지고 소라는 출근하고 준은 게임에 접속한다.

> Living City는 플레이어를 게임에 오래 붙잡아두는 시스템이 아니라, 현실을 살아도 그 시간이 세계와 연결되어 있다고 느끼게 만드는 시스템이다.
