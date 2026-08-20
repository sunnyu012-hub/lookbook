# Room Base

방의 배경은 **완성된 픽셀 일러스트 한 장**이다. 벽 · 바닥 · 창문 · 침대 · 옷걸이 · 책장 ·
거울 · 러그 · 책상 · 화분 · 액자 · 시계 처럼 자주 바뀌지 않는 것은 전부 이 그림 안에 들어 있다.
코드는 가구를 배치하지 않는다.

## 넣는 곳

```
public/assets/pixel/room/room-base-day.png       ← 지금 쓰는 것 (필수)
public/assets/pixel/room/room-base-morning.png   ← 나중에 (선택)
public/assets/pixel/room/room-base-evening.png
public/assets/pixel/room/room-base-night.png
```

파일을 넣고 저장하면 끝이다. 코드를 고칠 필요가 없다.
그림이 없으면 앱이 빈 방(벽 · 바닥 · 창문만)을 대신 그려서 무대만 세운다.

## 규격

| | |
|---|---|
| 비율 | **3 : 2** (예: 1536 × 1024) |
| 형식 | PNG |
| 스타일 | 픽셀 아트, 따뜻한 크림 톤 |
| 벽/바닥 경계 | 위에서 약 **58%** 지점 |

비율이 3:2 가 아니면 `src/lib/room/anchors.ts` 의 `ROOM_ASPECT` 와 `FLOOR_LINE`,
그리고 자리(anchor) 좌표를 함께 맞춰야 한다.

## 그림에 넣지 않는 것

이것들은 상태에 따라 바뀌기 때문에 따로 얹는다.

- 캐릭터
- 고양이
- 오늘 기록에 따라 나타나는 소품 (클라이밍 신발, 커피, 따뜻한 음료…)
- 효과 (zzz, 반짝임, 하트, 구름)

## 자리 맞추기

캐릭터와 고양이가 앉는 자리는 `src/lib/room/anchors.ts` 의 `ANCHORS` 한 곳에 모여 있다.
새 그림에서 침대나 책상 위치가 달라졌다면 그 표의 `x` / `y` 만 고치면 된다.
좌표는 방을 100 × 100 으로 본 비율이고, `y` 는 스프라이트가 놓이는 바닥선이다.
