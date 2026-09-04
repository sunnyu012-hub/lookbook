# imgcrop

이미지 한 장을 넣으면 **요소별로 찾아 잘라내고, 여백을 없애고, 크기를 맞춰서** 개별 파일로 저장하는 PC용 프로그램입니다.

캐릭터 스티커 시트, 게임 에셋 시트, 아이콘 모음, 상품 사진 등 여러 요소가 한 장에 모여 있는 이미지를 한 번에 분리할 때 쓰려고 만들었습니다.

```
[시트 1장]  ->  요소 검출  ->  요소별 분리  ->  여백 제거  ->  크기 정렬  ->  [파일 N개]
```

GUI(창 프로그램)와 CLI(명령줄) 둘 다 들어 있고, 외부 의존성은 Pillow와 numpy뿐입니다.

---

## 설치

Python 3.9 이상이 필요합니다.

```bash
pip install -r requirements.txt
```

패키지로 설치하면 `imgcrop` 명령이 생깁니다.

```bash
pip install .
```

## 실행

**GUI** — 이미지를 넣고 버튼 하나 누르면 끝납니다.

```bash
python -m imgcrop
```

윈도우는 `run-gui.bat`, macOS/리눅스는 `run-gui.sh` 를 실행해도 됩니다.

쓰는 순서는 이렇습니다.

1. **파일 추가** 또는 **폴더 추가** 로 이미지를 넣습니다
2. 검출된 요소가 번호와 함께 미리보기에 바로 표시됩니다
3. **전부 자르기** 를 누릅니다

저장 위치를 따로 정하지 않으면 **원본 옆에 `<이름>_cut` 폴더**를 만들어 넣습니다.
`sheet.png` 를 자르면 `sheet_cut/sheet_01.png`, `sheet_02.png` … 로 저장됩니다.
다른 곳에 넣고 싶으면 **폴더 바꾸기**, 되돌리려면 **기본값** 을 누릅니다.
저장이 끝나면 **저장한 폴더 열기** 로 결과를 바로 확인할 수 있습니다.

미리보기는 요소마다 색이 다른 박스와 번호를 붙여 보여 주고, 투명한 곳은 바둑판으로 표시합니다.

GUI는 가장 자주 쓰는 형태 — **배경을 지운 투명 PNG, 잘린 크기 그대로** — 로 시작합니다.
크기를 고정하거나 배경을 남기고 싶으면 오른쪽 설정에서 바꾸면 되고,
바꾸는 즉시 미리보기에 반영됩니다.

**CLI**

```bash
# 요소별로 잘라 out 폴더에 저장
python -m imgcrop sheet.png -o out

# 이름표까지 전부 남기고 싶을 때
python -m imgcrop sheet.png -o out --min-relative-area 0

# 배경을 지우고 투명 PNG로
python -m imgcrop sheet.png -o out --preset cutout

# 에셋을 전부 512x512 캔버스 가운데에 맞춤
python -m imgcrop sheet.png -o out --preset cutout --size 512x512 --padding-ratio 0.04

# 4x3 격자로 배치된 시트를 격자대로 자름
python -m imgcrop sheet.png -o out --mode grid --grid 4x3

# 사진 한 장의 여백만 제거
python -m imgcrop photo.jpg -o out --preset trim

# 폴더 전체를 하위까지 훑어서 처리
python -m imgcrop assets/ -o out -r

# 저장하지 않고 몇 개가 검출되는지만 확인
python -m imgcrop sheet.png --dry-run
```

## 프리셋

| 프리셋 | 하는 일 |
|---|---|
| `split` | 요소별로 나눠 원본 크기 그대로 저장 (기본 동작) |
| `trim` | 나누지 않고 바깥 여백만 제거 |
| `cutout` | 배경을 지우고 요소만 남긴 투명 PNG |
| `sprite` | 누끼 + 정사각형 + 약간의 여백 (게임 에셋용) |
| `thumb` | 1000x1000 흰 배경 JPG (상품 썸네일용) |

## 동작 방식

배경을 어떻게 판정하느냐가 정확도의 전부라서, 세 단계를 겹쳐서 씁니다.

1. **알파 우선** — 투명 PNG면 알파 채널을 그대로 씁니다. 에셋 시트는 보통 여기서 끝납니다.
2. **배경색 거리** — 알파가 없으면 테두리 픽셀의 중앙값을 배경색으로 보고 색 거리를 잽니다.
   임계값은 배경 종류에 따라 다르게 정합니다. 스티커 시트처럼 배경이 깨끗하면 잡음 바로 위로 낮게,
   실사 사진처럼 텍스처가 있으면 Otsu로 두 무리를 가릅니다.
3. **경계 장벽 + 테두리 flood fill** — 테두리에서 시작해 배경을 채워 나가되, 피사체 윤곽(경계가 강한 곳)에서
   멈춥니다. 덕분에 크림색 배경 위의 흰 셔츠처럼 **배경과 색이 거의 같은 피사체도 통째로 살아남고**,
   피사체 안쪽의 밝은 부분이 배경으로 새지 않습니다. 장벽에 걸린 띠는 다시 배경으로 돌려주기 때문에
   크롭이 1픽셀 단위로 딱 맞습니다.

그렇게 만든 마스크를 연결 요소로 나눈 뒤, 분할 방식에 따라 묶습니다.

| 분할 방식 | 설명 |
|---|---|
| `auto` (기본) | 연결 요소로 나누되, 주변보다 유독 길쭉하게 큰 덩어리만 투영 분할로 다시 쪼갭니다. 맞닿아 하나로 붙은 칸을 구제하면서, 캐릭터 한 명을 목에서 자르는 오탐은 크기 비율 조건으로 막습니다. |
| `components` | 연결된 덩어리만 그대로 사용 |
| `xycut` | 행/열 투영의 골짜기를 따라 재귀적으로 나눔 (격자로 배치된 시트에 적합) |
| `grid` | 지정한 열 x 행으로 균등 분할한 뒤 칸마다 여백 제거 |
| `none` | 나누지 않고 전체 여백만 제거 |

묶은 뒤에는 **다른 요소들보다 유독 작은 조각을 버립니다.** 기준을 절대 크기가 아니라 다른 요소들의
중앙값에 두기 때문에, 캐릭터 시트의 이름 텍스트나 반짝임 표시 같은 것이 해상도와 무관하게 자동으로
빠집니다. 작은 요소까지 전부 남기려면 `--min-relative-area 0` 을 씁니다.

결과는 위에서 아래, 왼쪽에서 오른쪽 순(읽는 순서)으로 번호가 붙습니다.

## 주요 옵션

**검출**

| 옵션 | 설명 |
|---|---|
| `--mode` | 분할 방식 (`auto`/`components`/`xycut`/`grid`/`none`) |
| `--grid CxR` | 격자 크기, 예: `4x3` |
| `--tolerance N\|auto` | 배경 판정 임계값. 클수록 더 많이 배경으로 봅니다 |
| `--edge-barrier F` | 경계 장벽 강도. 배경과 피사체 색이 비슷할 때 올립니다 (0이면 끔) |
| `--min-area R` | 전체 면적 대비 최소 요소 크기. 티끌을 걸러냅니다 |
| `--min-relative-area R` | 다른 요소들의 중앙값 대비 이 비율보다 작은 조각을 버립니다 (기본 0.08). 이름표, 반짝임 표시, 떨어져 나온 장식 조각이 여기서 걸러집니다. `0` 이면 끕니다 |
| `--merge-gap PX` | 이 간격 이내의 조각을 하나로 합칩니다 (이름표를 캐릭터에 붙일 때) |
| `--separation PX` | 가늘게 붙은 요소를 떼어냅니다 |

**출력**

| 옵션 | 설명 |
|---|---|
| `--padding PX` / `--padding-ratio R` | 크롭 주변 여백 (고정 픽셀 / 요소 크기 대비 비율) |
| `--size WxH` | 출력 크기 고정 |
| `--square` | 정사각형으로 맞춤 |
| `--fit contain\|cover` | 크기 고정 시 전체를 보이게 할지, 꽉 채우고 잘라낼지 |
| `--cutout` | 배경을 지우고 요소만 남김 |
| `--bg COLOR` | 배경 (`transparent` / `white` / `#rrggbb`) |
| `--format png\|jpg\|webp` | 저장 형식 |
| `--name TPL` | 파일명 서식. `{stem}` `{index}` `{total}` 사용 가능 |

전체 목록은 `python -m imgcrop --help` 로 볼 수 있습니다.

## 라이브러리로 쓰기

```python
from imgcrop import Settings, detect, load_rgba, process_file

settings = Settings(split_mode="auto", cutout=True, output_mode="fixed",
                    out_width=512, out_height=512)

detection, written = process_file("sheet.png", "out", settings)
print(len(detection.elements), "개 저장")

# 저장하지 않고 박스만 얻기
result = detect(load_rgba("sheet.png"), settings)
for element in result.elements:
    print(element.index, element.box, element.width, element.height)
```

## 잘 되는 경우와 손이 가는 경우

잘 됩니다.

- 투명 배경 PNG (에셋 시트, 스프라이트 시트) — 거의 손댈 게 없습니다
- 흰색/단색 배경에 요소가 떨어져 있는 스티커 시트, 아이콘 모음
- 격자로 배치된 시트 — 요소끼리 맞닿아 있어도 `auto` 또는 `grid` 로 처리됩니다

설정을 만져야 합니다.

- **피사체와 배경 색이 거의 같은 사진** (크림색 린넨 위의 흰 셔츠 등). 경계 장벽으로 상당 부분 잡히지만,
  임계값을 직접 조절해야 할 때가 있습니다. GUI에서 슬라이더를 움직이며 맞추는 것이 가장 빠릅니다.
- **그림자가 짙은 사진**. 그림자가 요소에 붙어 함께 잘릴 수 있습니다.
- **요소가 심하게 겹친 시트**. 겹친 부분은 어느 쪽 것인지 알 방법이 없으므로 `grid` 로 칸을 직접 지정하세요.

## 테스트

```bash
python -m unittest discover -s tests
```

GUI 테스트는 tkinter나 화면이 없으면 알아서 건너뜁니다. 헤드리스 환경에서 함께 돌리려면
가상 디스플레이를 띄운 뒤 실행하세요.

```bash
Xvfb :99 -screen 0 1400x900x24 &
DISPLAY=:99 python -m unittest discover -s tests
```

## 구조

```
imgcrop/
├── imgcrop/
│   ├── masking.py    배경 추정, 경계 장벽, flood fill, 형태학 연산
│   ├── labeling.py   연결 요소 라벨링(run-length + union-find), 맞닿은 요소 분리
│   ├── layout.py     격자 분할, 투영 기반 XY-cut
│   ├── core.py       검출 -> 그룹핑 -> 크롭 -> 리사이즈 파이프라인
│   ├── cli.py        명령줄 인터페이스
│   ├── theme.py      GUI 색/글꼴/직접 그린 슬라이더·체크박스
│   └── gui.py        tkinter GUI
└── tests/
    ├── test_imgcrop.py  검출/크롭/저장 파이프라인
    └── test_gui.py      GUI (화면이 없으면 건너뜀)
```

라벨링은 numpy만으로 구현되어 있어 OpenCV나 scipy가 필요 없습니다. 6MP 이미지 기준 0.2초 정도입니다.
