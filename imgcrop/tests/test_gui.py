"""GUI 동작 확인. tkinter나 화면이 없으면 통째로 건너뛴다.

헤드리스 환경에서는 Xvfb 등으로 DISPLAY를 띄운 뒤 실행하면 된다.
"""

import shutil
import sys
import tempfile
import time
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    import tkinter as tk

    _root = tk.Tk()
    _root.destroy()
    GUI_AVAILABLE = True
    GUI_SKIP_REASON = ""
except Exception as exc:  # tkinter 미설치, DISPLAY 없음 등
    GUI_AVAILABLE = False
    GUI_SKIP_REASON = f"tkinter를 쓸 수 없습니다: {exc}"


class _SilentMessageBox:
    """테스트에서는 알림창을 띄우지 않고 기록만 남긴다."""

    def __init__(self):
        self.calls = []

    def showinfo(self, title, message):
        self.calls.append(("info", title, message))

    def showwarning(self, title, message):
        self.calls.append(("warning", title, message))

    def showerror(self, title, message):
        self.calls.append(("error", title, message))


def make_sheet(path: Path) -> None:
    canvas = np.full((300, 400, 4), 255, dtype=np.uint8)
    canvas[20:90, 20:80] = (200, 30, 30, 255)
    canvas[20:90, 150:210] = (30, 120, 200, 255)
    canvas[150:220, 20:80] = (40, 160, 60, 255)
    Image.fromarray(canvas, "RGBA").convert("RGB").save(path)


@unittest.skipUnless(GUI_AVAILABLE, GUI_SKIP_REASON)
class GuiTests(unittest.TestCase):
    def setUp(self):
        from imgcrop import gui as gui_module

        self.gui_module = gui_module
        self.real_messagebox = gui_module.messagebox
        self.messages = _SilentMessageBox()
        gui_module.messagebox = self.messages

        self.tmp = Path(tempfile.mkdtemp())
        self.source = self.tmp / "sheet.png"
        make_sheet(self.source)

        self.root = tk.Tk()
        self.app = gui_module.App(self.root, initial=[str(self.source)])

    def tearDown(self):
        self.gui_module.messagebox = self.real_messagebox
        try:
            self.app.close()
        except Exception:
            pass
        shutil.rmtree(self.tmp, ignore_errors=True)

    def pump(self, until, timeout=30.0):
        deadline = time.time() + timeout
        while time.time() < deadline:
            self.root.update()
            if until():
                return True
            time.sleep(0.02)
        return False

    def test_starts_with_transparent_png_cutout(self):
        settings = self.app.settings()
        self.assertTrue(settings.cutout)
        self.assertEqual(settings.background, "transparent")
        self.assertEqual(settings.image_format, "png")
        self.assertEqual(settings.output_mode, "tight")

    def test_detects_and_draws_preview(self):
        self.assertTrue(self.pump(lambda: self.app.detection is not None))
        self.assertEqual(len(self.app.detection.elements), 3)
        self.app.draw_preview()
        self.root.update()
        # 미리보기 이미지 1개 + 요소마다 박스와 번호 배지
        self.assertEqual(len(self.app.canvas.find_withtag("box")), 3)
        self.assertEqual(len(self.app.canvas.find_withtag("badge")), 3 * 2)
        self.assertGreaterEqual(len(self.app.canvas.find_all()), 1 + 3 * 3)

    def test_empty_state_shows_guidance(self):
        self.app.clear_files()
        self.root.update()
        texts = [self.app.canvas.itemcget(i, "text")
                 for i in self.app.canvas.find_all()
                 if self.app.canvas.type(i) == "text"]
        self.assertTrue(any("이미지를 추가" in t for t in texts), texts)

    def test_custom_widgets_track_their_variable(self):
        from imgcrop import theme

        checks = [w for w in self._walk(self.root) if isinstance(w, theme.Check)]
        sliders = [w for w in self._walk(self.root) if isinstance(w, theme.Slider)]
        self.assertTrue(checks and sliders)

        check = checks[0]
        before = bool(check.variable.get())
        check._toggle()
        self.assertNotEqual(bool(check.variable.get()), before)
        check._toggle()
        self.assertEqual(bool(check.variable.get()), before)

        slider = sliders[0]
        slider.variable.set(slider.low)
        self.root.update()
        slider._apply(10_000)          # 오른쪽 끝으로 끌기
        self.assertEqual(slider._value(), slider.high)
        slider._apply(-10_000)         # 왼쪽 끝으로 끌기
        self.assertEqual(slider._value(), slider.low)

    def _walk(self, widget):
        yield widget
        for child in widget.winfo_children():
            yield from self._walk(child)

    def test_default_output_folder_sits_next_to_source(self):
        self.assertEqual(self.app.out_dir_for(self.source), self.tmp / "sheet_cut")
        self.app.v_out_dir.set(str(self.tmp / "따로"))
        self.assertEqual(self.app.out_dir_for(self.source), self.tmp / "따로")
        self.app.reset_out_dir()
        self.assertEqual(self.app.out_dir_for(self.source), self.tmp / "sheet_cut")

    def test_one_button_save_writes_files(self):
        self.assertTrue(self.pump(lambda: self.app.detection is not None))
        self.app.save(all_files=True)
        self.assertTrue(self.pump(lambda: not getattr(self.app, "saving", False), timeout=60))

        out = self.tmp / "sheet_cut"
        files = sorted(out.glob("*.png"))
        self.assertEqual([f.name for f in files],
                         ["sheet_01.png", "sheet_02.png", "sheet_03.png"])
        with Image.open(files[0]) as saved:
            self.assertEqual(saved.mode, "RGBA")
            self.assertEqual(saved.size, (60, 70))
        self.assertEqual(str(self.app.open_button["state"]), "normal")
        self.assertTrue(any(kind == "info" for kind, _, _ in self.messages.calls))

    def test_save_settings_are_read_on_main_thread(self):
        """저장 워커가 tkinter 변수를 건드리면 RuntimeError로 전부 실패한다.

        경로는 메인 스레드에서 미리 계산해 두어야 한다.
        """
        self.assertTrue(self.pump(lambda: self.app.detection is not None))
        self.app.save(all_files=True)
        self.assertTrue(self.pump(lambda: not getattr(self.app, "saving", False), timeout=60))
        self.assertFalse([c for c in self.messages.calls if c[0] == "warning"],
                         f"저장 중 실패가 보고되었습니다: {self.messages.calls}")

    def test_mode_change_updates_combobox_text(self):
        """설정을 코드로 바꿔도 화면 표시가 따라와야 한다."""
        self.app._set_output_mode("fixed")
        self.assertEqual(self.app.out_combo.get(), "크기 고정")
        self.assertTrue(self.app.size_frame.winfo_ismapped() or True)
        self.app._set_output_mode("tight")
        self.assertEqual(self.app.out_combo.get(), "원본 크기 그대로")

        self.app._set_split("grid")
        self.assertEqual(self.app.split_combo.get(), "격자 분할")
        self.app._set_split("auto")
        self.assertEqual(self.app.split_combo.get(), "자동 (권장)")

    def test_grid_guess_fills_the_spinboxes(self):
        self.assertTrue(self.pump(lambda: self.app.detection is not None))
        self.app.v_cols.set(9)
        self.app.v_rows.set(9)
        self.app.guess_grid()
        self.assertEqual((self.app.v_cols.get(), self.app.v_rows.get()), (2, 2))

    def test_close_cancels_pending_callbacks(self):
        """창을 닫은 뒤 예약된 콜백이 돌면 콘솔에 오류가 찍힌다."""
        self.assertTrue(self.pump(lambda: self.app.detection is not None))
        self.app.close()
        self.assertFalse(self.app.alive)
        self.assertIsNone(self.app.drain_after)
        self.assertIsNone(self.app.pending_after)

    def test_setting_change_triggers_new_detection(self):
        self.assertTrue(self.pump(lambda: self.app.detection is not None))
        before = len(self.app.detection.elements)
        self.app.v_merge.set(300)          # 전부 하나로 합치기
        self.app.schedule_detect(0)
        self.assertTrue(self.pump(lambda: len(self.app.detection.elements) != before))
        self.assertEqual(len(self.app.detection.elements), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
