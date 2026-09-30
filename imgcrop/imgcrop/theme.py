"""GUI 색/글꼴/위젯 스타일. tkinter 기본 모양 대신 한 벌의 톤을 입힌다."""

from __future__ import annotations

import tkinter as tk
from tkinter import font as tkfont
from tkinter import ttk

# 밝은 회색 바탕에 흰 카드, 남색 강조 한 가지만 쓴다.
PALETTE = {
    "bg": "#f4f5f7",          # 창 바탕
    "surface": "#ffffff",     # 카드
    "surface_alt": "#fafbfc",  # 살짝 눌린 영역
    "border": "#e2e4e9",
    "border_strong": "#cdd0d8",
    "text": "#1b1d22",
    "text_soft": "#5b6070",
    "text_faint": "#8b909e",
    "accent": "#4c6ef5",
    "accent_dark": "#3b5bdb",
    "accent_soft": "#eef1ff",
    "on_accent": "#ffffff",
    "danger": "#e03131",
    "canvas": "#e6e8ee",   # 미리보기 바탕. 흰 이미지가 떠 보이도록 조금 진하게
}

# 검출된 요소 박스에 돌려쓰는 색
BOX_COLORS = (
    "#e8590c", "#1c7ed6", "#2f9e44", "#ae3ec9",
    "#0ca678", "#f08c00", "#4263eb", "#c2255c",
)

KOREAN_FONTS = (
    "Pretendard", "Malgun Gothic", "맑은 고딕", "Apple SD Gothic Neo",
    "Noto Sans KR", "NanumGothic", "Segoe UI", "Helvetica Neue", "DejaVu Sans",
)


def pick_family(root: tk.Misc) -> str:
    """설치된 글꼴 중 한글이 깨지지 않는 것을 고른다."""
    available = {name.lower() for name in tkfont.families(root)}
    for name in KOREAN_FONTS:
        if name.lower() in available:
            return name
    return tkfont.nametofont("TkDefaultFont").actual("family")


class Fonts:
    def __init__(self, root: tk.Misc) -> None:
        family = pick_family(root)
        self.family = family
        self.title = tkfont.Font(root=root, family=family, size=14, weight="bold")
        self.heading = tkfont.Font(root=root, family=family, size=10, weight="bold")
        self.body = tkfont.Font(root=root, family=family, size=10)
        self.small = tkfont.Font(root=root, family=family, size=9)
        self.tiny = tkfont.Font(root=root, family=family, size=8)
        self.button = tkfont.Font(root=root, family=family, size=10)
        self.button_strong = tkfont.Font(root=root, family=family, size=11, weight="bold")
        self.value = tkfont.Font(root=root, family=family, size=9, weight="bold")


def apply(root: tk.Misc) -> Fonts:
    """ttk 위젯 전반에 팔레트를 적용하고 글꼴 묶음을 돌려준다."""
    c = PALETTE
    fonts = Fonts(root)
    style = ttk.Style(root)
    # clam 은 색을 가장 많이 열어 주는 기본 테마다
    if "clam" in style.theme_names():
        style.theme_use("clam")

    root.configure(background=c["bg"])
    style.configure(".", background=c["bg"], foreground=c["text"],
                    font=fonts.body, borderwidth=0, focuscolor=c["accent_soft"])

    style.configure("TFrame", background=c["bg"])
    # 카드 테두리는 바깥 껍데기에만 준다. 안쪽 묶음 프레임까지 테두리가 생기면
    # 글자를 가로지르는 선처럼 보인다.
    style.configure("CardShell.TFrame", background=c["surface"], relief="solid",
                    borderwidth=1, bordercolor=c["border"])
    style.configure("Card.TFrame", background=c["surface"], borderwidth=0)
    style.configure("Header.TFrame", background=c["surface"])
    style.configure("Status.TFrame", background=c["surface"])

    style.configure("TLabel", background=c["bg"], foreground=c["text"])
    style.configure("Card.TLabel", background=c["surface"], foreground=c["text"])
    style.configure("Title.TLabel", background=c["surface"], foreground=c["text"],
                    font=fonts.title)
    style.configure("Subtitle.TLabel", background=c["surface"], foreground=c["text_faint"],
                    font=fonts.small)
    style.configure("Heading.TLabel", background=c["surface"], foreground=c["text"],
                    font=fonts.heading)
    style.configure("Field.TLabel", background=c["surface"], foreground=c["text_soft"],
                    font=fonts.small)
    style.configure("Value.TLabel", background=c["surface"], foreground=c["accent"],
                    font=fonts.value)
    style.configure("Muted.TLabel", background=c["surface"], foreground=c["text_faint"],
                    font=fonts.small)
    style.configure("Status.TLabel", background=c["surface"], foreground=c["text_soft"],
                    font=fonts.small)
    style.configure("Count.TLabel", background=c["surface"], foreground=c["accent"],
                    font=fonts.heading)

    style.configure("TButton", font=fonts.button, padding=(10, 7),
                    background=c["surface"], foreground=c["text"],
                    bordercolor=c["border_strong"], relief="solid", borderwidth=1,
                    lightcolor=c["surface"], darkcolor=c["surface"])
    style.map("TButton",
              background=[("pressed", c["border"]), ("active", c["surface_alt"]),
                          ("disabled", c["surface_alt"])],
              foreground=[("disabled", c["text_faint"])],
              bordercolor=[("active", c["border_strong"])])

    style.configure("Accent.TButton", font=fonts.button_strong, padding=(10, 10),
                    background=c["accent"], foreground=c["on_accent"],
                    bordercolor=c["accent"], lightcolor=c["accent"], darkcolor=c["accent"])
    style.map("Accent.TButton",
              background=[("pressed", c["accent_dark"]), ("active", c["accent_dark"]),
                          ("disabled", c["border"])],
              bordercolor=[("disabled", c["border"])],
              foreground=[("disabled", c["text_faint"])])

    style.configure("Quiet.TButton", font=fonts.small, padding=(8, 5),
                    background=c["surface"], foreground=c["text_soft"])

    style.configure("TCheckbutton", background=c["surface"], foreground=c["text"],
                    font=fonts.small, focuscolor=c["surface"],
                    indicatorcolor=c["surface"], indicatorbackground=c["surface"],
                    bordercolor=c["border_strong"], indicatormargin=(0, 0, 8, 0),
                    padding=(0, 3))
    style.map("TCheckbutton",
              background=[("active", c["surface"])],
              indicatorcolor=[("selected", c["accent"]), ("!selected", c["surface"])],
              bordercolor=[("selected", c["accent"]), ("active", c["border_strong"])])

    style.configure("TCombobox", font=fonts.body, padding=(8, 6),
                    fieldbackground=c["surface"], background=c["surface"],
                    bordercolor=c["border_strong"], arrowcolor=c["text_soft"],
                    lightcolor=c["border_strong"], darkcolor=c["border_strong"],
                    selectbackground=c["accent_soft"], selectforeground=c["text"])
    style.map("TCombobox",
              fieldbackground=[("readonly", c["surface"])],
              bordercolor=[("focus", c["accent"]), ("active", c["border_strong"])])

    style.configure("TEntry", padding=(8, 6), fieldbackground=c["surface"],
                    bordercolor=c["border_strong"], lightcolor=c["border_strong"],
                    darkcolor=c["border_strong"], insertcolor=c["text"])
    style.map("TEntry", bordercolor=[("focus", c["accent"])])

    style.configure("TSpinbox", padding=(6, 5), fieldbackground=c["surface"],
                    bordercolor=c["border_strong"], arrowcolor=c["text_soft"],
                    lightcolor=c["border_strong"], darkcolor=c["border_strong"])

    style.configure("TSeparator", background=c["border"])
    style.configure("Vertical.TScrollbar", background=c["border"],
                    troughcolor=c["surface"], bordercolor=c["surface"],
                    arrowcolor=c["text_faint"], lightcolor=c["border"],
                    darkcolor=c["border"], width=10)
    style.map("Vertical.TScrollbar", background=[("active", c["border_strong"])])

    return fonts


def style_listbox(widget: tk.Listbox, fonts: Fonts) -> None:
    c = PALETTE
    widget.configure(
        background=c["surface"], foreground=c["text"],
        selectbackground=c["accent_soft"], selectforeground=c["accent_dark"],
        font=fonts.body, borderwidth=0, highlightthickness=0,
        activestyle="none", relief="flat", selectborderwidth=0,
    )


class Slider(tk.Canvas):
    """직접 그린 가로 슬라이더.

    ttk.Scale 은 플랫폼마다 모양이 제각각이고 clam 테마에서는 손잡이에
    줄무늬가 생겨서, 트랙과 손잡이를 캔버스에 직접 그린다.
    """

    TRACK_HEIGHT = 4
    HANDLE_RADIUS = 7
    HEIGHT = 22

    def __init__(self, parent, variable, low, high, step=1.0, on_change=None):
        super().__init__(parent, height=self.HEIGHT, highlightthickness=0,
                         borderwidth=0, background=PALETTE["surface"])
        self.variable = variable
        self.low = float(low)
        self.high = float(high)
        self.step = float(step) if step else 1.0
        self.on_change = on_change
        self.enabled = True
        self._dragging = False

        self.bind("<Configure>", lambda _e: self.redraw())
        self.bind("<Button-1>", self._press)
        self.bind("<B1-Motion>", self._drag)
        self.bind("<ButtonRelease-1>", self._release)
        variable.trace_add("write", lambda *_: self.redraw())

    # -- 값 <-> 좌표

    def _span(self) -> tuple[float, float]:
        r = self.HANDLE_RADIUS + 1
        return r, max(r + 1.0, self.winfo_width() - r)

    def _value(self) -> float:
        try:
            return min(max(float(self.variable.get()), self.low), self.high)
        except Exception:
            return self.low

    def _value_to_x(self, value: float) -> float:
        left, right = self._span()
        ratio = (value - self.low) / (self.high - self.low or 1.0)
        return left + ratio * (right - left)

    def _x_to_value(self, x: float) -> float:
        left, right = self._span()
        ratio = min(max((x - left) / (right - left or 1.0), 0.0), 1.0)
        raw = self.low + ratio * (self.high - self.low)
        snapped = round(raw / self.step) * self.step
        return min(max(round(snapped, 6), self.low), self.high)

    # -- 상호작용

    def set_enabled(self, enabled: bool) -> None:
        self.enabled = enabled
        self.redraw()

    def _press(self, event) -> None:
        if not self.enabled:
            return
        self._dragging = True
        self._apply(event.x)

    def _drag(self, event) -> None:
        if self._dragging:
            self._apply(event.x)

    def _release(self, _event) -> None:
        self._dragging = False

    def _apply(self, x: float) -> None:
        value = self._x_to_value(x)
        if value != self._value():
            self.variable.set(value)
        if self.on_change:
            self.on_change(value)

    # -- 그리기

    def redraw(self) -> None:
        self.delete("all")
        width = self.winfo_width()
        if width <= 1:
            return
        left, right = self._span()
        y = self.HEIGHT // 2
        x = self._value_to_x(self._value())

        track = PALETTE["border"]
        fill = PALETTE["accent"] if self.enabled else PALETTE["border_strong"]
        edge = fill
        knob = PALETTE["surface"] if self.enabled else PALETTE["surface_alt"]

        self.create_line(left, y, right, y, fill=track,
                         width=self.TRACK_HEIGHT, capstyle="round")
        if x > left + 0.5:
            self.create_line(left, y, x, y, fill=fill,
                             width=self.TRACK_HEIGHT, capstyle="round")
        r = self.HANDLE_RADIUS
        self.create_oval(x - r, y - r, x + r, y + r, fill=knob, outline=edge, width=2)


class Check(tk.Frame):
    """직접 그린 체크박스.

    clam 기본 체크 표시는 검은 상자에 X 처럼 보여서, 네모와 체크를
    캔버스에 그린다. 글자를 눌러도 토글된다.
    """

    BOX = 16

    def __init__(self, parent, text, variable, command=None, font=None):
        super().__init__(parent, background=PALETTE["surface"])
        self.variable = variable
        self.command = command

        self.box = tk.Canvas(self, width=self.BOX, height=self.BOX,
                             highlightthickness=0, borderwidth=0,
                             background=PALETTE["surface"])
        self.box.pack(side="left")
        self.label = tk.Label(self, text=text, background=PALETTE["surface"],
                              foreground=PALETTE["text"], font=font, anchor="w")
        self.label.pack(side="left", padx=(8, 0))

        for widget in (self, self.box, self.label):
            widget.bind("<Button-1>", self._toggle)
        variable.trace_add("write", lambda *_: self.redraw())
        self.redraw()

    def _toggle(self, _event=None):
        self.variable.set(not bool(self.variable.get()))
        if self.command:
            self.command()

    def redraw(self) -> None:
        self.box.delete("all")
        on = bool(self.variable.get())
        size = self.BOX
        fill = PALETTE["accent"] if on else PALETTE["surface"]
        edge = PALETTE["accent"] if on else PALETTE["border_strong"]
        self.box.create_rectangle(1, 1, size - 1, size - 1, fill=fill, outline=edge, width=1.6)
        if on:
            self.box.create_line(4, 8, 7, 11, 12, 5, fill="#ffffff", width=2,
                                 capstyle="round", joinstyle="round")
