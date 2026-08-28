# 방향 문서

이 폴더는 **받은 그대로** 둔다. 구현하면서 바뀐 사실을 여기 덮어쓰지 않는다 —
이건 "지금 코드가 이렇다" 가 아니라 "우리가 어디로 가기로 했다" 를 적은 곳이다.

받은 판: **0108 DIETED** (2026-08-28 방향 재정리).

## 여덟 장

| | 무엇 |
| --- | --- |
| `01_MASTER_CONTEXT` | 한 줄 설명 · 기본 루프 · 이미 있는 시스템 · 에너지/발견/저장 철학 |
| `02_UPDATE_HISTORY_ROADMAP` | A~E 완료 기록 · F 명세 · **F 이후 다이어트 로드맵 (G~K)** · Expansion/Dream Pool |
| `03_ASSET_STYLE_GUIDE` | 그림체 · 공통 규칙 · 시트별 목록 |
| `04_CLAUDE_CODE_UPDATE_TEMPLATE` | 업데이트 명세를 쓸 때 쓰는 틀과 검토 체크리스트 |
| `05_LONG_TERM_MASTER_ROADMAP` | ERA 1~9 장기 방향 |
| `06_NPC_CHARACTER_BIBLE` | 주민 스물다섯과 관계망 |
| `07_LIVING_CITY_SYSTEM` | 현실시간 도시 설계 |
| `08_STORY_AND_RELATIONSHIP_SYSTEM` | Personal Story · Friendship · Romance |

## 어느 것이 이기는가

문서끼리 어긋나면 이 순서다 (문서들이 스스로 그렇게 적어뒀다):

```
02 업데이트 순서  >  05 장기 방향
02 업데이트 순서  >  06 NPC · 07 도시 · 08 관계
```

그리고 **코드가 문서를 이긴다.** 문서에 적힌 것이 이미 구현돼 있고 다르게
자리 잡았으면, 코드가 지금이고 문서는 그때의 뜻이다.

## 다이어트 로드맵 — 02 가 방향을 한 번 틀었다

`02` 의 "F 이후" 가 통째로 다시 쓰였다. 이 폴더에서 **가장 최근에 정해진 것**이고,
`05` · `08` 에 적힌 큰 계획 대부분을 Core 에서 내려놓는다.

본체는 거대한 RPG 가 아니라 **현실 행동을 조금 더 재미있게 만드는 TODO RPG** 라고
다시 못 박고, 세 축(TODO · LIVING CITY · DISCOVERY & COLLECTION)만 Core 로 남긴다.

G~J 가 통째로 바뀌었다:

| | 예전 02 | 지금 02 |
| --- | --- | --- |
| G | Companion Expedition | Living City 1 — 현실시간 + NPC Routine |
| H | 추가 Dungeon 2종 | Living City 2 — Context Dialogue |
| I | Character / Trophy Rewards | Gift & Preference (선물 = 취향 발견) |
| J | Beyond the City Map | Living Scene |
| K | — | Personal Story Pilot (시우 · 소라 · 준 셋만) |

K 다음은 다음 업데이트가 아니라 **CORE 1.0 CHECKPOINT** — 실제로 플레이해보고,
재미가 확인된 축만 넓힌다.

내려간 것들은 지워지지 않고 두 칸에 보관된다.

- **EXPANSION POOL** — Companion Expedition, 추가 Dungeon, Trophy Rewards,
  도시 밖 지역, 숲, 호수·낚시, 관계망 확장, Close Friendship, Romance 1
- **DREAM POOL** — Chemistry 고도화, DISTANT/EX/재결합/질투, Gossip,
  Magic Society, Creature Lineage, 유니콘·드래곤, 동거·결혼

`05` 의 ERA 표와 `08` 의 Romance 단계표는 **그대로 두되, Core 일정이 아니다.**
02 가 이긴다.

## 지금과 다른 곳

문서를 받은 시점 이후에 진행된 것들. 문서는 안 고치고 여기에만 적어둔다.

- `01` 이 말하는 저장 판올림 **v16 → 지금 v17** (UPDATE F 의 `creatureLog`)
- `02` 는 아직 "UPDATE F 가 현재 다음 구현" 이라고 적고 있지만 **F 는 완료** (PR #27).
  돌콩이·이끼몽·반딧돌·돌잠이, 포획도 전투도 없이 발견 → 관찰 → 이해 → 도움 → 친해짐.
  문서가 적어둔 방향 그대로다
- **F.5 (의상실 + 옷 120벌) 는 문서에 없다** (PR #28). 다이어트 로드맵에도 안 들어왔다.
  즉 문서 기준으로 다음 Core 는 **G — Living City 1** 이다
- **F.6 (작은 옷장 · 가챠) 도 문서에 없다.** 오히려 `02` 의 F 절은 "이번에 만들지 않을 것"
  에 가챠를 적어뒀다. 코드에는 GACHA 48벌 · pool 넷 · 650 코인 자리가 이미 있으니
  F.6 을 할지 G 로 갈지는 **사용자가 정한다.** 임의로 이어붙이지 않는다
- `03` 의 Missing Asset 목록 중 **캐릭터 스킨은 다 채워졌다** (120/120).
  광물 11 · 채석장 장소 · `w_quarry_lantern` · 던전 구역 5 · 발견물 6 은 아직 이모지다
