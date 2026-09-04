"""tkinter GUI - 설정을 바꾸면 검출 결과를 바로 미리 볼 수 있다."""

from __future__ import annotations

import queue
import threading
import traceback
from pathlib import Path

import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from PIL import Image, ImageTk

from .core import (
    SUPPORTED_INPUTS,
    Detection,
    Settings,
    collect_images,
    detect,
    load_rgba,
    output_name,
    padded_box,
    parse_color,
    render_element,
)

SPLIT_MODES = [
    ("자동 (권장)", "auto"),
    ("연결된 덩어리", "components"),
    ("투영 분할 (XY-cut)", "xycut"),
    ("격자 분할", "grid"),
    ("나누지 않고 여백만 제거", "none"),
]
OUTPUT_MODES = [("원본 크기 그대로", "tight"), ("정사각형", "square"), ("크기 고정", "fixed")]
BOX_COLORS = ("#ff3b30", "#007aff", "#34c759", "#ff9500", "#af52de", "#00c7be")


class App:
    def __init__(self, root: tk.Tk, initial: list[str] | None = None) -> None:
        self.root = root
        self.root.title("imgcrop - 이미지 요소 분리 도구")
        self.root.geometry("1240x820")
        self.root.minsize(1000, 660)

        self.paths: list[Path] = []
        self.detection: Detection | None = None
        self.preview_photo: ImageTk.PhotoImage | None = None
        self.job_id = 0
        self.results: queue.Queue = queue.Queue()
        self.pending_after: str | None = None
        self.active_settings = Settings()

        self._build_vars()
        self._build_layout()
        self.root.after(80, self._drain_results)

        if initial:
            self.add_paths(initial)

    # ------------------------------------------------------------------ 설정 값

    def _build_vars(self) -> None:
        d = Settings()
        self.v_split = tk.StringVar(value=d.split_mode)
        self.v_cols = tk.IntVar(value=d.grid_cols)
        self.v_rows = tk.IntVar(value=d.grid_rows)
        self.v_auto_tol = tk.BooleanVar(value=True)
        self.v_tol = tk.IntVar(value=32)
        self.v_edge = tk.DoubleVar(value=d.edge_barrier)
        self.v_min_area = tk.DoubleVar(value=d.min_area_ratio * 100.0)  # %
        self.v_min_rel = tk.DoubleVar(value=d.min_relative_area * 100.0)  # %
        self.v_separation = tk.IntVar(value=d.separation)
        self.v_merge = tk.IntVar(value=d.merge_gap)
        self.v_denoise = tk.IntVar(value=d.denoise)

        self.v_padding = tk.IntVar(value=d.padding)
        self.v_pad_ratio = tk.DoubleVar(value=d.padding_ratio * 100.0)  # %
        self.v_out_mode = tk.StringVar(value=d.output_mode)
        self.v_out_w = tk.IntVar(value=d.out_width)
        self.v_out_h = tk.IntVar(value=d.out_height)
        self.v_fit = tk.StringVar(value=d.fit)
        self.v_upscale = tk.BooleanVar(value=d.allow_upscale)
        self.v_cutout = tk.BooleanVar(value=d.cutout)
        self.v_bg = tk.StringVar(value=d.background)
        self.v_format = tk.StringVar(value=d.image_format)
        self.v_name = tk.StringVar(value=d.name_template)
        self.v_status = tk.StringVar(value="이미지를 추가하세요.")

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

    # -------------------------------------------------------------------- 화면

    def _build_layout(self) -> None:
        outer = ttk.Frame(self.root, padding=8)
        outer.pack(fill="both", expand=True)

        left = ttk.Frame(outer, width=230)
        left.pack(side="left", fill="y")
        left.pack_propagate(False)
        self._build_file_panel(left)

        right = ttk.Frame(outer, width=330)
        right.pack(side="right", fill="y", padx=(8, 0))
        right.pack_propagate(False)
        self._build_settings_panel(right)

        center = ttk.Frame(outer)
        center.pack(side="left", fill="both", expand=True, padx=8)
        self._build_preview(center)

        status = ttk.Frame(self.root, padding=(10, 4))
        status.pack(fill="x", side="bottom")
        ttk.Label(status, textvariable=self.v_status).pack(side="left")

    def _build_file_panel(self, parent: ttk.Frame) -> None:
        ttk.Label(parent, text="이미지 목록", font=("", 10, "bold")).pack(anchor="w")
        box = ttk.Frame(parent)
        box.pack(fill="both", expand=True, pady=4)
        scroll = ttk.Scrollbar(box, orient="vertical")
        self.listbox = tk.Listbox(box, exportselection=False, yscrollcommand=scroll.set,
                                  activestyle="none")
        scroll.config(command=self.listbox.yview)
        scroll.pack(side="right", fill="y")
        self.listbox.pack(side="left", fill="both", expand=True)
        self.listbox.bind("<<ListboxSelect>>", lambda _e: self.schedule_detect(0))

        buttons = ttk.Frame(parent)
        buttons.pack(fill="x")
        ttk.Button(buttons, text="파일 추가", command=self.pick_files).pack(fill="x", pady=1)
        ttk.Button(buttons, text="폴더 추가", command=self.pick_folder).pack(fill="x", pady=1)
        ttk.Button(buttons, text="선택 제거", command=self.remove_selected).pack(fill="x", pady=1)
        ttk.Button(buttons, text="모두 비우기", command=self.clear_files).pack(fill="x", pady=1)

        ttk.Separator(parent).pack(fill="x", pady=8)
        ttk.Button(parent, text="현재 이미지 저장", command=lambda: self.save(all_files=False)).pack(fill="x", pady=1)
        save_all = ttk.Button(parent, text="전체 저장", command=lambda: self.save(all_files=True))
        save_all.pack(fill="x", pady=1)
        save_all.configure(style="Accent.TButton")

    def _build_preview(self, parent: ttk.Frame) -> None:
        header = ttk.Frame(parent)
        header.pack(fill="x")
        ttk.Label(header, text="미리보기", font=("", 10, "bold")).pack(side="left")
        self.v_found = tk.StringVar(value="")
        ttk.Label(header, textvariable=self.v_found).pack(side="right")

        self.canvas = tk.Canvas(parent, bg="#f2f2f2", highlightthickness=1,
                                highlightbackground="#cccccc")
        self.canvas.pack(fill="both", expand=True, pady=4)
        self.canvas.bind("<Configure>", lambda _e: self.draw_preview())

    def _build_settings_panel(self, parent: ttk.Frame) -> None:
        canvas = tk.Canvas(parent, highlightthickness=0, width=310)
        scroll = ttk.Scrollbar(parent, orient="vertical", command=canvas.yview)
        body = ttk.Frame(canvas)
        body.bind("<Configure>", lambda _e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.create_window((0, 0), window=body, anchor="nw")
        canvas.configure(yscrollcommand=scroll.set)
        scroll.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)

        def on_wheel(event):
            step = -1 if getattr(event, "delta", 0) > 0 or event.num == 4 else 1
            canvas.yview_scroll(step, "units")

        for widget in (canvas, body):
            widget.bind("<MouseWheel>", on_wheel)
            widget.bind("<Button-4>", on_wheel)
            widget.bind("<Button-5>", on_wheel)

        detect_box = ttk.LabelFrame(body, text="요소 검출", padding=8)
        detect_box.pack(fill="x", pady=(0, 8))

        ttk.Label(detect_box, text="분할 방식").pack(anchor="w")
        self.split_combo = ttk.Combobox(detect_box, state="readonly", width=26,
                                        values=[label for label, _ in SPLIT_MODES])
        self.split_combo.current([v for _, v in SPLIT_MODES].index(self.v_split.get()))
        self.split_combo.pack(fill="x", pady=(0, 6))
        self.split_combo.bind("<<ComboboxSelected>>", self._on_split_changed)

        self.grid_frame = ttk.Frame(detect_box)
        ttk.Label(self.grid_frame, text="열").pack(side="left")
        ttk.Spinbox(self.grid_frame, from_=1, to=32, width=4, textvariable=self.v_cols,
                    command=lambda: self.schedule_detect()).pack(side="left", padx=(2, 8))
        ttk.Label(self.grid_frame, text="행").pack(side="left")
        ttk.Spinbox(self.grid_frame, from_=1, to=32, width=4, textvariable=self.v_rows,
                    command=lambda: self.schedule_detect()).pack(side="left", padx=2)

        ttk.Checkbutton(detect_box, text="배경 임계값 자동", variable=self.v_auto_tol,
                        command=self._on_auto_tolerance).pack(anchor="w", pady=(4, 0))
        self.tol_scale = self._scale(detect_box, "임계값 (클수록 배경으로 판정)", self.v_tol, 6, 140, 1)
        self._scale(detect_box, "경계 장벽 (배경과 색이 비슷할 때 ↑)", self.v_edge, 0, 2.0, 0.1)
        self._scale(detect_box, "최소 요소 크기 (%)", self.v_min_area, 0, 3.0, 0.01)
        self._scale(detect_box, "작은 조각 버리기 (중앙값 대비 %)", self.v_min_rel, 0, 60, 1)
        self._scale(detect_box, "붙은 요소 떼어내기 (px)", self.v_separation, 0, 20, 1)
        self._scale(detect_box, "가까운 요소 합치기 (px)", self.v_merge, 0, 120, 1)
        self._scale(detect_box, "잡티 제거 (px)", self.v_denoise, 0, 8, 1)

        out_box = ttk.LabelFrame(body, text="잘라내기 / 출력", padding=8)
        out_box.pack(fill="x")

        self._scale(out_box, "여백 (px)", self.v_padding, 0, 200, 1)
        self._scale(out_box, "여백 비율 (%)", self.v_pad_ratio, 0, 30, 0.5)

        ttk.Label(out_box, text="출력 크기").pack(anchor="w", pady=(6, 0))
        self.out_combo = ttk.Combobox(out_box, state="readonly", width=26,
                                      values=[label for label, _ in OUTPUT_MODES])
        self.out_combo.current([v for _, v in OUTPUT_MODES].index(self.v_out_mode.get()))
        self.out_combo.pack(fill="x")
        self.out_combo.bind("<<ComboboxSelected>>", self._on_output_changed)

        self.size_frame = ttk.Frame(out_box)
        ttk.Label(self.size_frame, text="가로").grid(row=0, column=0, sticky="w")
        ttk.Entry(self.size_frame, textvariable=self.v_out_w, width=7).grid(row=0, column=1, padx=(2, 8))
        ttk.Label(self.size_frame, text="세로").grid(row=0, column=2, sticky="w")
        ttk.Entry(self.size_frame, textvariable=self.v_out_h, width=7).grid(row=0, column=3, padx=2)
        fit_combo = ttk.Combobox(self.size_frame, state="readonly", width=24,
                                 values=["전체가 보이게 (contain)", "꽉 차게 잘라냄 (cover)"])
        fit_combo.current(0 if self.v_fit.get() == "contain" else 1)
        fit_combo.grid(row=1, column=0, columnspan=4, sticky="ew", pady=4)
        fit_combo.bind("<<ComboboxSelected>>",
                       lambda e: self.v_fit.set("contain" if fit_combo.current() == 0 else "cover"))
        ttk.Checkbutton(self.size_frame, text="원본보다 크게 늘리기 허용",
                        variable=self.v_upscale).grid(row=2, column=0, columnspan=4, sticky="w")

        ttk.Checkbutton(out_box, text="배경 지우기 (누끼)", variable=self.v_cutout).pack(anchor="w", pady=(6, 0))

        ttk.Label(out_box, text="배경색").pack(anchor="w", pady=(6, 0))
        bg_combo = ttk.Combobox(out_box, width=26, textvariable=self.v_bg,
                                values=["transparent", "white", "black", "#f5f0e8"])
        bg_combo.pack(fill="x")

        ttk.Label(out_box, text="저장 형식").pack(anchor="w", pady=(6, 0))
        ttk.Combobox(out_box, state="readonly", width=26, textvariable=self.v_format,
                     values=["png", "jpg", "webp"]).pack(fill="x")

        ttk.Label(out_box, text="파일명 서식").pack(anchor="w", pady=(6, 0))
        ttk.Entry(out_box, textvariable=self.v_name).pack(fill="x")
        ttk.Label(out_box, text="{stem}=원본이름, {index}=번호, {total}=총개수",
                  foreground="#777777").pack(anchor="w")

        self._on_split_changed()
        self._on_output_changed()
        self._on_auto_tolerance()

    def _scale(self, parent, text, variable, low, high, step):
        frame = ttk.Frame(parent)
        frame.pack(fill="x", pady=(4, 0))
        ttk.Label(frame, text=text).pack(anchor="w")
        scale = tk.Scale(frame, from_=low, to=high, resolution=step, orient="horizontal",
                         variable=variable, showvalue=True,
                         command=lambda _v: self.schedule_detect())
        scale.pack(fill="x")
        return scale

    # -------------------------------------------------------------- 상태 변화

    def _on_split_changed(self, _event=None) -> None:
        self.v_split.set(SPLIT_MODES[self.split_combo.current()][1])
        if self.v_split.get() == "grid":
            self.grid_frame.pack(fill="x", pady=(0, 4))
        else:
            self.grid_frame.pack_forget()
        self.schedule_detect()

    def _on_output_changed(self, _event=None) -> None:
        self.v_out_mode.set(OUTPUT_MODES[self.out_combo.current()][1])
        if self.v_out_mode.get() == "fixed":
            self.size_frame.pack(fill="x", pady=4)
        else:
            self.size_frame.pack_forget()

    def _on_auto_tolerance(self) -> None:
        self.tol_scale.configure(state="disabled" if self.v_auto_tol.get() else "normal")
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
                self.listbox.insert("end", path.name)
                added += 1
        if added and self.listbox.curselection() == ():
            self.listbox.selection_set(0)
        self.v_status.set(f"{added}장 추가 (전체 {len(self.paths)}장)" if added else "새로 추가된 이미지가 없습니다.")
        self.schedule_detect(0)

    def remove_selected(self) -> None:
        for i in reversed(self.listbox.curselection()):
            self.listbox.delete(i)
            del self.paths[i]
        if self.paths:
            self.listbox.selection_set(0)
        else:
            self.detection = None
        self.schedule_detect(0)

    def clear_files(self) -> None:
        self.paths.clear()
        self.listbox.delete(0, "end")
        self.detection = None
        self.canvas.delete("all")
        self.v_found.set("")
        self.v_status.set("이미지를 추가하세요.")

    def current_path(self) -> Path | None:
        selection = self.listbox.curselection()
        if not selection or not self.paths:
            return self.paths[0] if self.paths else None
        return self.paths[selection[0]]

    # ------------------------------------------------------------------ 검출

    def schedule_detect(self, delay: int = 220) -> None:
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
        self.v_status.set(f"분석 중… ({path.name})")

        def work() -> None:
            try:
                result = detect(load_rgba(path), settings, path=path)
                self.results.put((job, path, settings, result, None))
            except Exception:
                self.results.put((job, path, settings, None, traceback.format_exc()))

        threading.Thread(target=work, daemon=True).start()

    def _drain_results(self) -> None:
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
                    self.v_found.set(f"요소 {len(result.elements)}개")
                    self.v_status.set(
                        f"{path.name} · {result.size[0]}x{result.size[1]} · "
                        f"배경={info.get('source')} · 임계값={info.get('tolerance')}"
                    )
                    self.draw_preview()
        self.root.after(80, self._drain_results)

    # ---------------------------------------------------------------- 미리보기

    def draw_preview(self) -> None:
        self.canvas.delete("all")
        detection = self.detection
        if detection is None or detection.rgba is None:
            return

        cw = max(self.canvas.winfo_width(), 1)
        ch = max(self.canvas.winfo_height(), 1)
        if cw < 20 or ch < 20:
            return

        image = Image.fromarray(detection.rgba)
        board = Image.new("RGB", image.size, (255, 255, 255))
        board.paste(image, mask=image.split()[3])

        scale = min(cw / board.width, ch / board.height, 1.0)
        view = board.resize(
            (max(1, int(board.width * scale)), max(1, int(board.height * scale))),
            Image.LANCZOS,
        )
        self.preview_photo = ImageTk.PhotoImage(view)
        ox, oy = (cw - view.width) // 2, (ch - view.height) // 2
        self.canvas.create_image(ox, oy, anchor="nw", image=self.preview_photo)

        settings = getattr(self, "active_settings", self.settings())
        for element in detection.elements:
            x0, y0, x1, y1 = padded_box(element, settings)
            color = BOX_COLORS[(element.index - 1) % len(BOX_COLORS)]
            self.canvas.create_rectangle(
                ox + x0 * scale, oy + y0 * scale, ox + x1 * scale, oy + y1 * scale,
                outline=color, width=2,
            )
            self.canvas.create_text(
                ox + x0 * scale + 3, oy + y0 * scale + 3,
                text=str(element.index), anchor="nw", fill=color,
                font=("", 9, "bold"),
            )

    # ------------------------------------------------------------------- 저장

    def save(self, all_files: bool) -> None:
        targets = self.paths if all_files else ([self.current_path()] if self.current_path() else [])
        if not targets:
            messagebox.showinfo("저장", "먼저 이미지를 추가하세요.")
            return

        settings = self.settings()
        try:
            parse_color(settings.background)
        except ValueError as exc:
            messagebox.showerror("배경색 오류", str(exc))
            return

        out_dir = filedialog.askdirectory(
            title="저장할 폴더 선택", initialdir=str(targets[0].parent)
        )
        if not out_dir:
            return

        self.v_status.set("저장 중…")
        self.root.update_idletasks()

        saved, failed = 0, []
        for path in targets:
            try:
                rgba = load_rgba(path)
                result = detect(rgba, settings, path=path)
                folder = Path(out_dir)
                folder.mkdir(parents=True, exist_ok=True)
                for element in result.elements:
                    image = render_element(result, element, settings)
                    name = output_name(path.stem, element.index, len(result.elements), settings)
                    params = {}
                    if settings.image_format.lower() in ("jpg", "jpeg", "webp"):
                        params["quality"] = settings.jpeg_quality
                    image.save(folder / name, **params)
                    saved += 1
            except Exception as exc:
                failed.append(f"{path.name}: {exc}")

        self.v_status.set(f"{saved}개 저장 완료 -> {out_dir}")
        if failed:
            messagebox.showwarning("일부 실패", "\n".join(failed[:10]))
        else:
            messagebox.showinfo("저장 완료", f"요소 {saved}개를 저장했습니다.\n{out_dir}")


def main(argv: list[str] | None = None) -> int:
    import sys

    root = tk.Tk()
    try:
        root.call("source", "sun-valley.tcl")  # 있으면 쓰고 없으면 기본 테마
    except tk.TclError:
        pass
    App(root, initial=(argv if argv is not None else sys.argv[1:]))
    root.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
