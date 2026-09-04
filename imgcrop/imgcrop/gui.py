"""tkinter GUI - 설정을 바꾸면 검출 결과를 바로 미리 볼 수 있다."""

from __future__ import annotations

import os
import queue
import subprocess
import sys
import threading
import traceback
from pathlib import Path

import tkinter as tk
from tkinter import filedialog, messagebox, ttk

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageTk

from . import theme
from .core import (
    SUPPORTED_INPUTS,
    Detection,
    Settings,
    collect_images,
    detect,
    load_rgba,
    padded_box,
    parse_color,
    preset,
    process_file,
)

SPLIT_MODES = [
    ("자동 (권장)", "auto"),
    ("연결된 덩어리", "components"),
    ("투영 분할 (XY-cut)", "xycut"),
    ("격자 분할", "grid"),
    ("나누지 않고 여백만 제거", "none"),
]
OUTPUT_MODES = [("원본 크기 그대로", "tight"), ("정사각형", "square"), ("크기 고정", "fixed")]
FIT_MODES = [("전체가 보이게", "contain"), ("꽉 차게 잘라냄", "cover")]
DEFAULT_OUT_LABEL = "원본 옆 <이름>_cut 폴더"
SHADOW_PAD = 16


def checkerboard(width: int, height: int, cell: int = 13) -> Image.Image:
    """투명 영역이 드러나 보이도록 깔아 두는 바둑판."""
    ys, xs = np.mgrid[0:height, 0:width]
    even = ((xs // cell + ys // cell) % 2) == 0
    light = np.array([255, 255, 255], dtype=np.uint8)
    dark = np.array([244, 245, 249], dtype=np.uint8)
    return Image.fromarray(np.where(even[:, :, None], light, dark))


class App:
    def __init__(self, root: tk.Tk, initial: list[str] | None = None) -> None:
        self.root = root
        self.root.title("imgcrop - 이미지 요소 분리")
        self.root.geometry("1280x840")
        self.root.minsize(1060, 700)

        self.fonts = theme.apply(root)
        self.colors = theme.PALETTE

        self.paths: list[Path] = []
        self.detection: Detection | None = None
        self.preview_photo: ImageTk.PhotoImage | None = None
        self.active_settings = Settings()
        self.job_id = 0
        self.results: queue.Queue = queue.Queue()
        self.pending_after: str | None = None
        self.drain_after: str | None = None
        self.saving = False
        self.alive = True

        self._build_vars()
        self._build_layout()
        self.root.bind("<Destroy>", self._on_destroy)
        self.root.protocol("WM_DELETE_WINDOW", self.close)
        self.drain_after = self.root.after(80, self._drain_results)

        if initial:
            self.add_paths(initial)

    # ------------------------------------------------------------------ 설정 값

    def _build_vars(self) -> None:
        # GUI는 가장 자주 쓰는 형태(배경 지운 투명 PNG, 원본 크기)로 시작한다
        d = preset("cutout")
        self.v_split = tk.StringVar(value=d.split_mode)
        self.v_cols = tk.IntVar(value=d.grid_cols)
        self.v_rows = tk.IntVar(value=d.grid_rows)
        self.v_auto_tol = tk.BooleanVar(value=True)
        self.v_tol = tk.DoubleVar(value=32)
        self.v_edge = tk.DoubleVar(value=d.edge_barrier)
        self.v_min_area = tk.DoubleVar(value=d.min_area_ratio * 100.0)
        self.v_min_rel = tk.DoubleVar(value=d.min_relative_area * 100.0)
        self.v_separation = tk.DoubleVar(value=d.separation)
        self.v_merge = tk.DoubleVar(value=d.merge_gap)
        self.v_denoise = tk.DoubleVar(value=d.denoise)

        self.v_padding = tk.DoubleVar(value=d.padding)
        self.v_pad_ratio = tk.DoubleVar(value=d.padding_ratio * 100.0)
        self.v_out_mode = tk.StringVar(value=d.output_mode)
        self.v_out_w = tk.IntVar(value=d.out_width)
        self.v_out_h = tk.IntVar(value=d.out_height)
        self.v_fit = tk.StringVar(value=d.fit)
        self.v_upscale = tk.BooleanVar(value=d.allow_upscale)
        self.v_cutout = tk.BooleanVar(value=d.cutout)
        self.v_bg = tk.StringVar(value=d.background)
        self.v_format = tk.StringVar(value=d.image_format)
        self.v_name = tk.StringVar(value=d.name_template)

        self.v_status = tk.StringVar(value="이미지를 추가하면 시작합니다.")
        self.v_found = tk.StringVar(value="")
        self.v_source = tk.StringVar(value="미리보기")
        self.v_out_dir = tk.StringVar(value="")
        self.v_out_label = tk.StringVar(value=DEFAULT_OUT_LABEL)

    @staticmethod
    def _number(var, fallback, cast=int):
        """입력칸에 이상한 값이 들어와도 미리보기가 멈추지 않게 한다."""
        try:
            return cast(var.get())
        except Exception:
            return fallback

    def settings(self) -> Settings:
        return Settings(
            tolerance="auto" if self.v_auto_tol.get() else self._number(self.v_tol, 32),
            denoise=self._number(self.v_denoise, 1),
            edge_barrier=self._number(self.v_edge, 1.0, float),
            min_area_ratio=max(0.0, self._number(self.v_min_area, 0.05, float) / 100.0),
            min_relative_area=max(0.0, self._number(self.v_min_rel, 8.0, float) / 100.0),
            merge_gap=self._number(self.v_merge, 0),
            separation=self._number(self.v_separation, 0),
            split_mode=self.v_split.get(),
            grid_cols=max(1, self._number(self.v_cols, 3)),
            grid_rows=max(1, self._number(self.v_rows, 3)),
            padding=self._number(self.v_padding, 0),
            padding_ratio=max(0.0, self._number(self.v_pad_ratio, 0.0, float) / 100.0),
            output_mode=self.v_out_mode.get(),
            out_width=max(1, self._number(self.v_out_w, 1000)),
            out_height=max(1, self._number(self.v_out_h, 1000)),
            fit=self.v_fit.get(),
            allow_upscale=self.v_upscale.get(),
            cutout=self.v_cutout.get(),
            background=self.v_bg.get(),
            image_format=self.v_format.get(),
            name_template=self.v_name.get() or "{stem}_{index:02d}",
        )

    # ------------------------------------------------------------- 공통 위젯

    def _card(self, parent, title: str | None = None, **pack):
        """흰 배경에 얇은 테두리를 두른 묶음."""
        shell = ttk.Frame(parent, style="CardShell.TFrame")
        shell.pack(**pack)
        inner = ttk.Frame(shell, style="Card.TFrame", padding=(14, 12))
        inner.pack(fill="both", expand=True)
        if title:
            ttk.Label(inner, text=title, style="Heading.TLabel").pack(anchor="w", pady=(0, 8))
        return inner

    def _slider(self, parent, text, variable, low, high, step, fmt="{:.0f}"):
        """설명 + 현재값 + 막대를 한 줄로 묶은 조절기."""
        row = ttk.Frame(parent, style="Card.TFrame")
        row.pack(fill="x", pady=(0, 12))

        head = ttk.Frame(row, style="Card.TFrame")
        head.pack(fill="x")
        ttk.Label(head, text=text, style="Field.TLabel").pack(side="left")
        shown = tk.StringVar(value=fmt.format(self._number(variable, low, float)))
        ttk.Label(head, textvariable=shown, style="Value.TLabel").pack(side="right")

        slider = theme.Slider(row, variable, low, high, step,
                              on_change=lambda _v: self.schedule_detect())
        slider.pack(fill="x", pady=(4, 0))
        variable.trace_add("write", lambda *_: shown.set(
            fmt.format(self._number(variable, low, float))))
        slider.row = row
        return slider

    def _combo(self, parent, labels, initial_value, on_change):
        combo = ttk.Combobox(parent, state="readonly", values=[label for label, _ in labels])
        combo.current([v for _, v in labels].index(initial_value))
        combo.bind("<<ComboboxSelected>>",
                   lambda _e: on_change(labels[combo.current()][1]))
        return combo

    @staticmethod
    def _sync_combo(combo, labels, value) -> None:
        """값을 코드로 바꿨을 때도 콤보박스 표시가 따라오게 한다."""
        keys = [v for _, v in labels]
        if value in keys and combo.current() != keys.index(value):
            combo.current(keys.index(value))

    # -------------------------------------------------------------------- 화면

    def _build_layout(self) -> None:
        self._build_header()

        body = ttk.Frame(self.root, padding=(14, 12))
        body.pack(fill="both", expand=True)

        left = ttk.Frame(body, width=246)
        left.pack(side="left", fill="y")
        left.pack_propagate(False)
        self._build_sidebar(left)

        right = ttk.Frame(body, width=322)
        right.pack(side="right", fill="y", padx=(12, 0))
        right.pack_propagate(False)
        self._build_settings(right)

        center = ttk.Frame(body)
        center.pack(side="left", fill="both", expand=True, padx=(12, 0))
        self._build_preview(center)

        self._build_status()

    def _build_header(self) -> None:
        header = ttk.Frame(self.root, style="Header.TFrame", padding=(18, 12))
        header.pack(fill="x")
        text = ttk.Frame(header, style="Header.TFrame")
        text.pack(side="left")
        ttk.Label(text, text="imgcrop", style="Title.TLabel").pack(anchor="w")
        ttk.Label(text, text="이미지에서 요소를 찾아 잘라내고 여백을 없앱니다",
                  style="Subtitle.TLabel").pack(anchor="w")
        tk.Frame(self.root, background=self.colors["border"], height=1).pack(fill="x")

    def _build_sidebar(self, parent: ttk.Frame) -> None:
        card = self._card(parent, "이미지", fill="both", expand=True)

        holder = ttk.Frame(card, style="Card.TFrame")
        holder.pack(fill="both", expand=True, pady=(0, 10))
        scroll = ttk.Scrollbar(holder, orient="vertical")
        self.listbox = tk.Listbox(holder, exportselection=False, yscrollcommand=scroll.set)
        theme.style_listbox(self.listbox, self.fonts)
        scroll.config(command=self.listbox.yview)
        scroll.pack(side="right", fill="y")
        self.listbox.pack(side="left", fill="both", expand=True)
        self.listbox.bind("<<ListboxSelect>>", lambda _e: self.schedule_detect(0))

        add_row = ttk.Frame(card, style="Card.TFrame")
        add_row.pack(fill="x")
        ttk.Button(add_row, text="파일 추가", command=self.pick_files).pack(
            side="left", expand=True, fill="x", padx=(0, 3))
        ttk.Button(add_row, text="폴더 추가", command=self.pick_folder).pack(
            side="left", expand=True, fill="x")

        trim_row = ttk.Frame(card, style="Card.TFrame")
        trim_row.pack(fill="x", pady=(4, 0))
        ttk.Button(trim_row, text="선택 제거", style="Quiet.TButton",
                   command=self.remove_selected).pack(side="left", expand=True, fill="x", padx=(0, 3))
        ttk.Button(trim_row, text="모두 비우기", style="Quiet.TButton",
                   command=self.clear_files).pack(side="left", expand=True, fill="x")

        out_card = self._card(parent, "저장 위치", fill="x", pady=(10, 0))
        ttk.Label(out_card, textvariable=self.v_out_label, style="Muted.TLabel",
                  wraplength=196, justify="left").pack(anchor="w", pady=(0, 8))
        folder_row = ttk.Frame(out_card, style="Card.TFrame")
        folder_row.pack(fill="x")
        ttk.Button(folder_row, text="폴더 바꾸기", style="Quiet.TButton",
                   command=self.pick_out_dir).pack(side="left", expand=True, fill="x", padx=(0, 3))
        ttk.Button(folder_row, text="기본값", style="Quiet.TButton",
                   command=self.reset_out_dir).pack(side="left")

        actions = ttk.Frame(parent)
        actions.pack(fill="x", pady=(10, 0))
        self.save_all_button = ttk.Button(actions, text="전부 자르기", style="Accent.TButton",
                                          command=lambda: self.save(all_files=True))
        self.save_all_button.pack(fill="x")
        self.save_one_button = ttk.Button(actions, text="이 이미지만 자르기",
                                          command=lambda: self.save(all_files=False))
        self.save_one_button.pack(fill="x", pady=(5, 0))
        self.open_button = ttk.Button(actions, text="저장한 폴더 열기", style="Quiet.TButton",
                                      command=self.open_last_folder, state="disabled")
        self.open_button.pack(fill="x", pady=(5, 0))

    def _build_preview(self, parent: ttk.Frame) -> None:
        card = self._card(parent, None, fill="both", expand=True)

        head = ttk.Frame(card, style="Card.TFrame")
        head.pack(fill="x", pady=(0, 10))
        ttk.Label(head, textvariable=self.v_source, style="Heading.TLabel").pack(side="left")
        ttk.Label(head, textvariable=self.v_found, style="Count.TLabel").pack(side="right")

        self.canvas = tk.Canvas(card, background=self.colors["canvas"],
                                highlightthickness=0, borderwidth=0)
        self.canvas.pack(fill="both", expand=True)
        self.canvas.bind("<Configure>", lambda _e: self.draw_preview())

    def _build_settings(self, parent: ttk.Frame) -> None:
        shell = ttk.Frame(parent, style="CardShell.TFrame")
        shell.pack(fill="both", expand=True)

        canvas = tk.Canvas(shell, highlightthickness=0, borderwidth=0,
                           background=self.colors["surface"], width=300)
        scroll = ttk.Scrollbar(shell, orient="vertical", command=canvas.yview)
        body = ttk.Frame(canvas, style="Card.TFrame", padding=(14, 12))
        window = canvas.create_window((0, 0), window=body, anchor="nw")

        def resize(_event=None):
            canvas.configure(scrollregion=canvas.bbox("all"))
            canvas.itemconfigure(window, width=canvas.winfo_width())

        body.bind("<Configure>", resize)
        canvas.bind("<Configure>", resize)
        canvas.configure(yscrollcommand=scroll.set)
        scroll.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        def on_wheel(event):
            step = -1 if getattr(event, "delta", 0) > 0 or getattr(event, "num", 0) == 4 else 1
            canvas.yview_scroll(step, "units")

        for widget in (canvas, body):
            widget.bind("<MouseWheel>", on_wheel)
            widget.bind("<Button-4>", on_wheel)
            widget.bind("<Button-5>", on_wheel)

        self._build_detect_section(body)
        ttk.Separator(body).pack(fill="x", pady=14)
        self._build_output_section(body)

    def _build_detect_section(self, body: ttk.Frame) -> None:
        ttk.Label(body, text="요소 검출", style="Heading.TLabel").pack(anchor="w", pady=(0, 10))

        ttk.Label(body, text="분할 방식", style="Field.TLabel").pack(anchor="w")
        self.split_combo = self._combo(body, SPLIT_MODES, self.v_split.get(), self._set_split)
        self.split_combo.pack(fill="x", pady=(3, 10))

        self.grid_frame = ttk.Frame(body, style="Card.TFrame")
        ttk.Label(self.grid_frame, text="열", style="Field.TLabel").pack(side="left")
        ttk.Spinbox(self.grid_frame, from_=1, to=32, width=4, textvariable=self.v_cols,
                    command=self.schedule_detect).pack(side="left", padx=(6, 14))
        ttk.Label(self.grid_frame, text="행", style="Field.TLabel").pack(side="left")
        ttk.Spinbox(self.grid_frame, from_=1, to=32, width=4, textvariable=self.v_rows,
                    command=self.schedule_detect).pack(side="left", padx=6)

        theme.Check(body, "배경 임계값 자동", self.v_auto_tol,
                    command=self._on_auto_tolerance, font=self.fonts.small).pack(
            anchor="w", pady=(0, 10))
        self.tol_scale = self._slider(body, "임계값 (클수록 배경으로 판정)", self.v_tol, 6, 140, 1)
        self._slider(body, "경계 장벽", self.v_edge, 0, 2.0, 0.1, "{:.1f}")
        self._slider(body, "작은 조각 버리기", self.v_min_rel, 0, 60, 1, "{:.0f}%")
        self._slider(body, "최소 요소 크기", self.v_min_area, 0, 3.0, 0.01, "{:.2f}%")
        self._slider(body, "붙은 요소 떼어내기", self.v_separation, 0, 20, 1, "{:.0f}px")
        self._slider(body, "가까운 요소 합치기", self.v_merge, 0, 120, 1, "{:.0f}px")
        self._slider(body, "잡티 제거", self.v_denoise, 0, 8, 1, "{:.0f}px")

    def _build_output_section(self, body: ttk.Frame) -> None:
        ttk.Label(body, text="잘라내기 / 출력", style="Heading.TLabel").pack(anchor="w", pady=(0, 10))

        self._slider(body, "여백", self.v_padding, 0, 200, 1, "{:.0f}px")
        self._slider(body, "여백 비율", self.v_pad_ratio, 0, 30, 0.5, "{:.1f}%")

        ttk.Label(body, text="출력 크기", style="Field.TLabel").pack(anchor="w")
        self.out_combo = self._combo(body, OUTPUT_MODES, self.v_out_mode.get(), self._set_output_mode)
        self.out_combo.pack(fill="x", pady=(3, 8))

        self.size_frame = ttk.Frame(body, style="Card.TFrame")
        size_row = ttk.Frame(self.size_frame, style="Card.TFrame")
        size_row.pack(fill="x")
        ttk.Label(size_row, text="가로", style="Field.TLabel").pack(side="left")
        ttk.Entry(size_row, textvariable=self.v_out_w, width=6).pack(side="left", padx=(6, 12))
        ttk.Label(size_row, text="세로", style="Field.TLabel").pack(side="left")
        ttk.Entry(size_row, textvariable=self.v_out_h, width=6).pack(side="left", padx=6)
        self.fit_combo = self._combo(self.size_frame, FIT_MODES, self.v_fit.get(), self.v_fit.set)
        self.fit_combo.pack(fill="x", pady=(8, 0))
        theme.Check(self.size_frame, "원본보다 크게 늘리기 허용", self.v_upscale,
                    font=self.fonts.small).pack(anchor="w", pady=(8, 0))

        theme.Check(body, "배경 지우기 (누끼)", self.v_cutout,
                    font=self.fonts.small).pack(anchor="w", pady=(4, 12))

        ttk.Label(body, text="배경색", style="Field.TLabel").pack(anchor="w")
        ttk.Combobox(body, textvariable=self.v_bg,
                     values=["transparent", "white", "black", "#f5f0e8"]).pack(fill="x", pady=(3, 10))

        ttk.Label(body, text="저장 형식", style="Field.TLabel").pack(anchor="w")
        ttk.Combobox(body, state="readonly", textvariable=self.v_format,
                     values=["png", "jpg", "webp"]).pack(fill="x", pady=(3, 10))

        ttk.Label(body, text="파일명 서식", style="Field.TLabel").pack(anchor="w")
        ttk.Entry(body, textvariable=self.v_name).pack(fill="x", pady=(3, 3))
        ttk.Label(body, text="{stem} 원본이름 · {index} 번호 · {total} 총개수",
                  style="Muted.TLabel").pack(anchor="w")

        self._set_split(self.v_split.get())
        self._set_output_mode(self.v_out_mode.get())
        self._on_auto_tolerance()

    def _build_status(self) -> None:
        tk.Frame(self.root, background=self.colors["border"], height=1).pack(
            fill="x", side="bottom")
        bar = ttk.Frame(self.root, style="Status.TFrame", padding=(18, 8))
        bar.pack(fill="x", side="bottom")
        ttk.Label(bar, textvariable=self.v_status, style="Status.TLabel").pack(side="left")

    # -------------------------------------------------------------- 상태 변화

    def _set_split(self, value: str) -> None:
        self.v_split.set(value)
        self._sync_combo(self.split_combo, SPLIT_MODES, value)
        if value == "grid":
            self.grid_frame.pack(fill="x", pady=(0, 12), before=self.tol_scale.row)
        else:
            self.grid_frame.pack_forget()
        self.schedule_detect()

    def _set_output_mode(self, value: str) -> None:
        self.v_out_mode.set(value)
        self._sync_combo(self.out_combo, OUTPUT_MODES, value)
        if value == "fixed":
            self.size_frame.pack(fill="x", pady=(0, 10))
        else:
            self.size_frame.pack_forget()

    def _on_auto_tolerance(self) -> None:
        self.tol_scale.set_enabled(not self.v_auto_tol.get())
        self.schedule_detect()

    # ------------------------------------------------------------ 파일 다루기

    def pick_files(self) -> None:
        patterns = " ".join(f"*{e}" for e in sorted(SUPPORTED_INPUTS))
        chosen = filedialog.askopenfilenames(
            title="이미지 선택", filetypes=[("이미지", patterns), ("모든 파일", "*.*")]
        )
        self.add_paths(chosen)

    def pick_folder(self) -> None:
        folder = filedialog.askdirectory(title="폴더 선택")
        if folder:
            self.add_paths([folder])

    def add_paths(self, raw) -> None:
        if not raw:
            return
        found = collect_images(list(raw) if not isinstance(raw, (str, Path)) else raw)
        added = 0
        for path in found:
            if path not in self.paths:
                self.paths.append(path)
                self.listbox.insert("end", f"  {path.name}")
                added += 1
        if added and self.listbox.curselection() == ():
            self.listbox.selection_set(0)
        self.v_status.set(
            f"{added}장 추가 · 전체 {len(self.paths)}장" if added else "새로 추가된 이미지가 없습니다."
        )
        self.schedule_detect(0)

    def remove_selected(self) -> None:
        for i in reversed(self.listbox.curselection()):
            self.listbox.delete(i)
            del self.paths[i]
        if self.paths:
            self.listbox.selection_set(0)
        else:
            self.detection = None
            self.v_found.set("")
            self.v_source.set("미리보기")
        self.schedule_detect(0)

    def clear_files(self) -> None:
        self.paths.clear()
        self.listbox.delete(0, "end")
        self.detection = None
        self.v_found.set("")
        self.v_source.set("미리보기")
        self.v_status.set("이미지를 추가하면 시작합니다.")
        self.draw_preview()

    def current_path(self) -> Path | None:
        selection = self.listbox.curselection()
        if not selection or not self.paths:
            return self.paths[0] if self.paths else None
        return self.paths[selection[0]]

    # ------------------------------------------------------------------ 검출

    def schedule_detect(self, delay: int = 200) -> None:
        if self.pending_after is not None:
            self.root.after_cancel(self.pending_after)
        self.pending_after = self.root.after(delay, self.run_detect)

    def run_detect(self) -> None:
        self.pending_after = None
        path = self.current_path()
        if path is None:
            return
        self.job_id += 1
        job = self.job_id
        settings = self.settings()
        self.v_status.set(f"분석 중… {path.name}")

        def work() -> None:
            try:
                self.results.put((job, path, settings, detect(load_rgba(path), settings, path=path), None))
            except Exception:
                self.results.put((job, path, settings, None, traceback.format_exc()))

        threading.Thread(target=work, daemon=True).start()

    def _on_destroy(self, event) -> None:
        # 창이 사라진 뒤 예약된 콜백이 돌면 "invalid command name" 오류가 난다
        if event.widget is self.root:
            self.alive = False

    def close(self) -> None:
        self.alive = False
        for job in (self.pending_after, self.drain_after):
            if job is not None:
                try:
                    self.root.after_cancel(job)
                except Exception:
                    pass
        self.pending_after = self.drain_after = None
        self.root.destroy()

    def _drain_results(self) -> None:
        self.drain_after = None
        if not self.alive:
            return
        latest = None
        try:
            while True:
                latest = self.results.get_nowait()
        except queue.Empty:
            pass

        if latest is not None:
            job, path, settings, result, error = latest
            if job == self.job_id:
                if error:
                    self.v_status.set(f"실패: {path.name}")
                    messagebox.showerror("검출 실패", error)
                else:
                    self.detection = result
                    self.active_settings = settings
                    info = result.info
                    self.v_source.set(path.name)
                    self.v_found.set(f"요소 {len(result.elements)}개")
                    self.v_status.set(
                        f"{result.size[0]}×{result.size[1]} · 배경 {info.get('source')} "
                        f"· 임계값 {info.get('tolerance')}"
                    )
                    self.draw_preview()
        if self.alive:
            self.drain_after = self.root.after(80, self._drain_results)

    # ---------------------------------------------------------------- 미리보기

    def draw_preview(self) -> None:
        self.canvas.delete("all")
        cw = max(self.canvas.winfo_width(), 1)
        ch = max(self.canvas.winfo_height(), 1)
        if cw < 40 or ch < 40:
            return

        detection = self.detection
        if detection is None or detection.rgba is None:
            self.canvas.create_text(
                cw // 2, ch // 2, text="이미지를 추가하면 여기에 미리보기가 나옵니다",
                fill=self.colors["text_faint"], font=self.fonts.body,
            )
            return

        image = Image.fromarray(detection.rgba)
        margin = 24
        scale = min((cw - margin * 2) / image.width, (ch - margin * 2) / image.height, 1.0)
        view_w = max(1, int(image.width * scale))
        view_h = max(1, int(image.height * scale))
        view = image.resize((view_w, view_h), Image.LANCZOS)

        board = checkerboard(view_w, view_h).convert("RGBA")
        board.alpha_composite(view)
        ImageDraw.Draw(board).rectangle([0, 0, view_w - 1, view_h - 1],
                                        outline=(205, 208, 216, 255))

        # 카드처럼 보이도록 부드러운 그림자를 깐다
        pad = SHADOW_PAD
        stage = Image.new("RGBA", (view_w + pad * 2, view_h + pad * 2), (0, 0, 0, 0))
        ImageDraw.Draw(stage).rectangle(
            [pad + 2, pad + 5, pad + view_w - 2, pad + view_h + 5], fill=(24, 28, 45, 105)
        )
        stage = stage.filter(ImageFilter.GaussianBlur(6))
        stage.alpha_composite(board, (pad, pad))

        backdrop = Image.new("RGB", stage.size, self.colors["canvas"])
        backdrop.paste(stage, (0, 0), stage)
        self.preview_photo = ImageTk.PhotoImage(backdrop)

        ox = (cw - view_w) // 2
        oy = (ch - view_h) // 2
        self.canvas.create_image(ox - pad, oy - pad, anchor="nw", image=self.preview_photo)

        for element in detection.elements:
            x0, y0, x1, y1 = padded_box(element, self.active_settings)
            color = theme.BOX_COLORS[(element.index - 1) % len(theme.BOX_COLORS)]
            left, top = ox + x0 * scale, oy + y0 * scale
            right, bottom = ox + x1 * scale, oy + y1 * scale
            self.canvas.create_rectangle(left, top, right, bottom,
                                         outline=color, width=2, tags="box")
            label = str(element.index)
            width = 17 + 6 * (len(label) - 1)
            self.canvas.create_rectangle(left, top, left + width, top + 16,
                                         fill=color, outline=color, tags="badge")
            self.canvas.create_text(left + width / 2, top + 8, text=label,
                                    fill="#ffffff", font=self.fonts.tiny, tags="badge")

    # ------------------------------------------------------------- 저장 위치

    def default_out_dir(self, source: Path) -> Path:
        """따로 정하지 않았으면 원본 옆에 <이름>_cut 폴더를 만든다."""
        return source.parent / f"{source.stem}_cut"

    def out_dir_for(self, source: Path) -> Path:
        chosen = self.v_out_dir.get().strip()
        return Path(chosen) if chosen else self.default_out_dir(source)

    def pick_out_dir(self) -> None:
        start = self.paths[0].parent if self.paths else None
        folder = filedialog.askdirectory(title="저장할 폴더 선택",
                                         initialdir=str(start) if start else None)
        if folder:
            self.v_out_dir.set(folder)
            self.v_out_label.set(folder)

    def reset_out_dir(self) -> None:
        self.v_out_dir.set("")
        self.v_out_label.set(DEFAULT_OUT_LABEL)

    def open_last_folder(self) -> None:
        folder = getattr(self, "last_saved_dir", None)
        if not folder or not Path(folder).exists():
            return
        try:
            if sys.platform.startswith("win"):
                os.startfile(folder)  # noqa: S606 - 사용자가 방금 저장한 폴더
            elif sys.platform == "darwin":
                subprocess.Popen(["open", str(folder)])
            else:
                subprocess.Popen(["xdg-open", str(folder)])
        except Exception as exc:
            messagebox.showinfo("폴더 열기", f"폴더를 열지 못했습니다.\n{folder}\n\n{exc}")

    # ------------------------------------------------------------------- 저장

    def save(self, all_files: bool) -> None:
        if self.saving:
            return
        targets = self.paths if all_files else ([self.current_path()] if self.current_path() else [])
        targets = [t for t in targets if t]
        if not targets:
            messagebox.showinfo("자르기", "먼저 이미지를 추가하세요.")
            return

        settings = self.settings()
        try:
            parse_color(settings.background)
        except ValueError as exc:
            messagebox.showerror("배경색 오류", str(exc))
            return

        self.saving = True
        for button in (self.save_one_button, self.save_all_button):
            button.configure(state="disabled")
        self.v_status.set(f"자르는 중… 0/{len(targets)}")

        # tkinter 변수는 메인 스레드에서만 읽어야 한다.
        # 워커 안에서 out_dir_for()를 부르면 RuntimeError 로 전부 실패한다.
        jobs = [(path, self.out_dir_for(path)) for path in targets]
        self.save_progress: queue.Queue = queue.Queue()
        self.save_done: queue.Queue = queue.Queue()

        def work() -> None:
            saved, failed, folders = 0, [], []
            for i, (path, folder) in enumerate(jobs, start=1):
                try:
                    _, written = process_file(path, folder, settings)
                    saved += len(written)
                    if folder not in folders:
                        folders.append(folder)
                except Exception as exc:
                    failed.append(f"{path.name}: {exc}")
                self.save_progress.put((i, len(jobs)))
            self.save_done.put((saved, failed, folders))

        threading.Thread(target=work, daemon=True).start()
        self.root.after(80, self._poll_save)

    def _poll_save(self) -> None:
        if not self.alive:
            return
        try:
            while True:
                done, total = self.save_progress.get_nowait()
                self.v_status.set(f"자르는 중… {done}/{total}")
        except queue.Empty:
            pass

        try:
            saved, failed, folders = self.save_done.get_nowait()
        except queue.Empty:
            self.root.after(80, self._poll_save)
            return

        self.saving = False
        for button in (self.save_one_button, self.save_all_button):
            button.configure(state="normal")

        if folders:
            self.last_saved_dir = folders[0]
            self.open_button.configure(state="normal")

        where = str(folders[0]) if len(folders) == 1 else f"{len(folders)}개 폴더"
        self.v_status.set(f"{saved}개 저장 완료 · {where}")
        if failed:
            messagebox.showwarning("일부 실패", "\n".join(failed[:10]))
        elif saved:
            messagebox.showinfo("완료", f"요소 {saved}개를 저장했습니다.\n\n{where}")
        else:
            messagebox.showinfo("완료", "잘라낼 요소를 찾지 못했습니다.\n"
                                        "오른쪽 설정에서 임계값이나 최소 크기를 조절해 보세요.")


def main(argv: list[str] | None = None) -> int:
    root = tk.Tk()
    App(root, initial=(argv if argv is not None else sys.argv[1:]))
    root.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
