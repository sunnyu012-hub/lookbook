# LITTLE LIFE — STORY & RELATIONSHIP SYSTEM

> Personal Story, Friendship, Relationship Discovery, Romance, EX, History/Chemistry 장기 설계 문서. 실제 구현은 단계적으로 진행한다.

## 0. RELATIONSHIP NORTH STAR

> 먼저 사람을 좋아하게 만든다. 연애는 그다음이다.  
> History는 쌓이고, Chemistry는 움직인다.

NPC를 공략해서 획득하는 시스템이 아니라, 만나고 알아가고 어느 순간 정말 좋아하게 되는 과정을 만든다.

## 1. RELATIONSHIP EXPERIENCE

기본:
STRANGER → ACQUAINTANCE → FRIEND → CLOSE_FRIEND

일부 NPC에서 선택적으로:
CLOSE_FRIEND → CRUSH → DATING → DISTANT → EX

필요 시 EX → FRIEND 또는 EX → CRUSH 가능성.

## 2. FRIENDSHIP BEFORE ROMANCE

Friendship만으로 NPC의 대부분을 알아갈 수 있어야 한다. 직업 밖 생활, 취미, 가족, 친구, 과거, 실패, 약점, 버릇, 취향, 관계망, 일부 비밀, Personal Story 등이 포함된다.

Romance가 Personal Story 해금 열쇠가 되면 안 된다.

## 3. RELATIONSHIP DISCOVERY / INFORMATION ASYMMETRY

NPC끼리의 관계는 플레이하면서 발견. 모든 NPC가 모든 사실을 알지 않는다.

예: 시우의 과거를 민지/은채/이안은 알지만 지호/하루는 처음에 모를 수 있다.

## 4. HISTORY

History는 이미 일어난 것들의 기록:
- 첫 만남
- Personal Story
- Relationship Discovery
- Secret learned
- 특별한 순간
- 갈등/화해
- 고백/연애/이별/재결합

시간이 지나도 쉽게 사라지지 않는다. 이후 Dialogue / Scene Context가 된다.

## 5. CHEMISTRY

현재 관계의 온도. 최근 교류, 현재 친밀감, 설렘, Romance 행동, 신뢰, 갈등, 거리감 등에 따라 움직인다.

Friendship History는 단순 시간 경과로 감소하지 않는다.

## 6. PERSONAL STORY

목표는 문제 해결이 아니라 이 사람을 이해하게 되는 것.

대략 가능한 단계:
1. First Impression
2. Life Outside Work
3. Relationship Discovery
4. Past / Hidden Side
5. Personal Conflict
6. Change
7. Close Friendship

Story를 Checklist로 보여주지 않고 Journal에 자동 기록한다.

## 7. STORY SCENE / AFTERMATH

Personal Story는 여러 1회성 Living Scene으로 구성 가능. Story 이후 Routine이나 Dialogue가 실제로 변한다.

예:
- 시우 Climbing Story → Training Zone 출현 증가
- 준 정체 공개 → 유나의 준 관련 Dialogue 변경
- 소라가 플레이어에게 솔직하게 화냄 → Close Friendship Dialogue 변경

## 8. PLAYER CHOICE

짧은 선택은 플레이어 태도, Chemistry, Dialogue 차이에 영향을 줄 수 있다. 잘못된 선택 하나로 Story 영구 실패 금지.

## 9. CLOSE FRIENDSHIP

단순 호감도 숫자보다 Personal Story, 공유 History, 중요한 대화, 신뢰, 생활 조우를 기반으로 한다. Romance는 강제되지 않는다.

## 10. ROMANCE PHILOSOPHY

Romance는 Endgame에 가까운 장기 콘텐츠. 성별 제한 없음, 플레이어 Character Skin과 무관, 주요 Romance 후보끼리는 기본적으로 서로 연애하지 않음.

Romance Unlock은 Close Friendship + Personal Story + History + Chemistry + 특정 선택 등을 종합한다.

## 11. CRUSH

고백 완료가 아니라 분위기가 달라진 상태. 먼저 찾는 대사, 마감 후 같이 걷기, 개인적인 질문, 플레이어에게만 다른 말, 작은 질투 등이 가능.

## 12. DATING / NPC INDEPENDENCE

연애 후 Dialogue Pool, 일부 Routine, Home 근처 조우, 함께 이동하는 Scene, 다른 NPC의 반응 등이 바뀔 수 있다.

연인이 되어도 기존 직장, 친구, 취미, 가족, 개인 Routine은 유지한다. 연인은 플레이어의 부속물이 아니다.

## 13. ABSENCE / DISTANT

금지:
- 24시간 대화 없음 → Chemistry 감소
- 일주일 미접속 → 자동 Distance
- 한 달 미접속 → 자동 이별

긴 시간이 지나면 “오랜만” 대사 가능. 기존 갈등이 있고 장기간 교류가 없는 경우 DISTANT Story를 검토할 수 있으나 자동 이별은 하지 않는다.

DISTANT는 끝난 상태가 아니라 관계가 어색하거나 멀어진 상태.

## 14. JEALOUSY

연애 중에도 다른 NPC와 Friendship / Personal Story / Close Friendship 가능. 질투는 명백한 Romantic Action에 반응.

NPC별 반응은 성격에 따라 다르게:
- 태오: 태연하려다 거리둘 수 있음
- 시우: 공개적으로 싸우기보다 나중에 이야기
- 정원: 직접적으로 질문
- 소라: 괜찮다고 웃으며 숨길 가능성
- 세라: 관계 합의를 먼저 확인

## 15. DISCOVERY OF OTHER ROMANCE

초기: 직접 목격 / 플레이어 직접 고백.
향후: 신뢰하는 NPC에게 들음 / Gossip Network.

복잡한 Gossip Simulation은 초기 시스템에 넣지 않는다.

## 16. BREAKUP / EX

이별은 실패 화면이 아니다. 플레이어 선택, NPC 선택, 신뢰 문제, 반복 갈등, 다른 Romance, 자연스러운 거리감 등 다양한 이유 가능.

이별은 Character Scene으로 보여준다. 자동 시스템 메시지로 처리하지 않는다.

EX는 초기화가 아니라 History가 남은 정상 관계 상태. 시간이 지나 FRIEND가 되거나 재결합 가능.

## 17. SERIAL ROMANCE / NO RESET

한 Save에서 여러 NPC와 연애 가능. 시우와 연애→이별→태오→정원 등 모든 관계가 History에 남는다. 플레이어의 연애사가 도시의 역사 일부가 된다.

Romance 콘텐츠를 다시 보기 위해 Save 리셋을 요구하지 않는다.

## 18. PERSONAL STORY CORES

- 시우: 과거와 현재를 알아가는 관계
- 태오: Friendship은 쉽지만 사랑은 두려움
- 도윤: 좋아하는 것에 지나치게 몰입
- 하루: 돌보는 사람이 자기 필요를 말하게 됨
- 은채: 오래된 관계와 현재의 신뢰
- 준: 현실과 온라인의 차이
- 유나: 완벽주의와 동경
- 선재: 기억과 수집
- 소라: 솔직한 감정 표현
- 정원: 약한 이야기를 말하는 법
- 세라: 자유와 Intimacy
- 재희: 평범한 일상 안으로 들어가는 관계
- 라온: 즉흥성과 미래
- 해인: 독립성과 함께 있음
- 하린: 혈통과 평범한 관계
- 유현: 정체성을 같이 발견
- 지호: 취향을 교환하는 관계

## 19. NPC × NPC STORY / PLAYER IS NOT THE CENTER

Personal Story는 항상 1:1일 필요가 없다. 플레이어는 때때로 해결사가 아니라 목격자여야 한다.

예: 시우와 은채가 멀어진 관계는 둘이 해결. 플레이어는 상황을 발견하고 작은 계기가 될 수는 있지만 모든 문제를 대신 해결하지 않는다.

## 20. CONFLICT DESIGN

모든 Story에 큰 트라우마가 필요하지 않는다. 성격 차이, 생활 방식, 취미, 자존심, 작은 서운함, 미래 방향, 가족, 직장, 표현 방식, 가치관 등 다양한 갈등을 사용.

## 21. STORY / ROMANCE TONE

과한 드라마/미연시 문체를 피하고 짧고 생활적인 말로 감정을 보여준다.

예:
> “그 뒤로는 그냥… 좀 귀찮아졌어요.”  
> “뭐가요?”  
> “누굴 좋아하는 게.”

## 22. MARRIAGE

현재 구현 범위 밖. LONG_TERM_RELATIONSHIP Hook 정도만 남기고 결혼/동거/가족은 별도 대형 Expansion으로 취급.

## 23. SAVE PRINCIPLES

저장 후보:
- seen Scene IDs
- Persistent Story Progress
- Relationship History
- current Relationship State
- Chemistry에 필요한 최소 Persistent 값
- EX History

derive 가능한 Story unlock, 현재 시간 대사 상태, NPC 위치 등은 저장하지 않는 방향 우선.

## 24. PHASED IMPLEMENTATION

1. Relationship Discovery
2. Personal Story
3. Close Friendship
4. Romance Candidate Foundation
5. Crush & Dating
6. Dynamic Relationship
7. Jealousy / EX
8. Reconnection

## 25. FINAL VISION

처음엔 시우를 “타코야끼 파는 사람”으로 안다. 이후 오전에도 만나는 사람, 클라이밍에 빠진 사람, 은채와 오래된 사이, 옛날에 밴드에서 노래했던 사람, 힘든 일이 생기면 아무 말 안 하는 사람으로 알아간다. 그리고 어느 날 그냥 좋아하는 사람이 된다.

> 관계는 리셋되는 콘텐츠가 아니라 플레이어가 이 도시에서 살아온 기록이다.
