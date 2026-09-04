"""imgcrop 동작 검증. 실행: python -m unittest discover -s tests"""

import shutil
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from imgcrop.cli import main as cli_main
from imgcrop.core import (
    Settings,
    collect_images,
    detect,
    load_rgba,
    output_name,
    parse_color,
    preset,
    process_file,
    render_element,
)
from imgcrop.labeling import label_components, label_separated
from imgcrop.layout import grid_cells, xy_cut
from imgcrop.masking import border_connected, build_mask, dilate, erode


def sheet_with_blocks(blocks, size=(400, 300), bg=(255, 255, 255), mode="RGB"):
    """(x0, y0, x1, y1, color) 목록으로 테스트용 시트를 만든다."""
    canvas = np.zeros((size[1], size[0], 4), dtype=np.uint8)
    canvas[:, :] = (*bg, 0 if mode == "RGBA" else 255)
    for x0, y0, x1, y1, color in blocks:
        canvas[y0:y1, x0:x1] = (*color, 255)
    return Image.fromarray(canvas, "RGBA").convert(mode)


class LabelingTests(unittest.TestCase):
    def test_separates_disjoint_blobs(self):
        mask = np.zeros((20, 20), bool)
        mask[2:6, 2:6] = True
        mask[12:18, 10:16] = True
        _, boxes = label_components(mask)
        self.assertEqual(len(boxes), 2)
        self.assertIn((2, 2, 6, 6, 16), boxes)

    def test_connectivity_setting(self):
        mask = np.zeros((6, 6), bool)
        mask[1, 1] = mask[2, 2] = True
        self.assertEqual(len(label_components(mask, 8)[1]), 1)
        self.assertEqual(len(label_components(mask, 4)[1]), 2)

    def test_separation_breaks_thin_bridge(self):
        mask = np.zeros((40, 60), bool)
        mask[5:35, 5:25] = True
        mask[5:35, 35:55] = True
        mask[19:21, 25:35] = True  # 두께 2px 다리
        self.assertEqual(len(label_separated(mask, 8, 0)[1]), 1)
        self.assertEqual(len(label_separated(mask, 8, 2)[1]), 2)


class MaskingTests(unittest.TestCase):
    def test_morphology_roundtrip(self):
        mask = np.zeros((11, 11), bool)
        mask[5, 5] = True
        self.assertEqual(dilate(mask, 1).sum(), 9)
        self.assertEqual(erode(dilate(mask, 1), 1).sum(), 1)

    def test_border_connected_keeps_only_outside(self):
        region = np.ones((10, 10), bool)
        region[3:7, 3:7] = False
        hole = np.zeros((10, 10), bool)
        hole[4:6, 4:6] = True
        combined = region | hole
        kept = border_connected(combined)
        self.assertTrue(kept[0, 0])
        self.assertFalse(kept[4, 4])  # 안쪽 구멍은 배경으로 치지 않는다

    def test_alpha_takes_priority(self):
        img = sheet_with_blocks([(10, 10, 40, 40, (200, 0, 0))], size=(60, 60), mode="RGBA")
        mask, info = build_mask(np.asarray(img))
        self.assertEqual(info["source"], "alpha")
        self.assertTrue(mask[20, 20])
        self.assertFalse(mask[2, 2])

    def test_clean_background_gets_low_tolerance(self):
        img = sheet_with_blocks([(10, 10, 90, 90, (240, 240, 240))], size=(200, 200))
        _, info = build_mask(np.asarray(img.convert("RGBA")))
        self.assertEqual(info["source"], "color")
        self.assertLessEqual(info["tolerance"], 40)


class LayoutTests(unittest.TestCase):
    def test_grid_cells_cover_canvas(self):
        cells = grid_cells(100, 60, 2, 3)
        self.assertEqual(len(cells), 6)
        self.assertEqual(cells[0], (0, 0, 50, 20))
        self.assertEqual(cells[-1], (50, 40, 100, 60))

    def test_xy_cut_splits_touching_rows(self):
        mask = np.zeros((200, 100), bool)
        mask[10:90, 10:90] = True
        mask[110:190, 10:90] = True
        mask[88:112, 45:55] = True  # 두 칸이 좁게 이어져 있음
        cells = xy_cut(mask)
        self.assertGreaterEqual(len(cells), 2)


class DetectTests(unittest.TestCase):
    def setUp(self):
        self.blocks = [
            (20, 20, 80, 90, (200, 30, 30)),
            (150, 20, 210, 90, (30, 120, 200)),
            (20, 150, 80, 220, (40, 160, 60)),
        ]
        self.image = np.asarray(sheet_with_blocks(self.blocks).convert("RGBA"))

    def test_finds_every_block_with_exact_box(self):
        result = detect(self.image, Settings())
        self.assertEqual(len(result.elements), 3)
        self.assertEqual([e.box for e in result.elements],
                         [(20, 20, 80, 90), (150, 20, 210, 90), (20, 150, 80, 220)])

    def test_reading_order(self):
        result = detect(self.image, Settings())
        self.assertEqual([e.index for e in result.elements], [1, 2, 3])
        self.assertLess(result.elements[0].box[0], result.elements[1].box[0])
        self.assertGreater(result.elements[2].box[1], result.elements[1].box[1])

    def test_none_mode_returns_single_trim_box(self):
        result = detect(self.image, Settings(split_mode="none"))
        self.assertEqual(len(result.elements), 1)
        self.assertEqual(result.elements[0].box, (20, 20, 210, 220))

    def test_merge_gap_joins_neighbours(self):
        result = detect(self.image, Settings(merge_gap=200))
        self.assertEqual(len(result.elements), 1)

    def test_min_area_filters_specks(self):
        blocks = self.blocks + [(300, 250, 310, 260, (0, 0, 0))]  # 100px 짜리 티끌
        image = np.asarray(sheet_with_blocks(blocks).convert("RGBA"))
        self.assertEqual(len(detect(image, Settings(min_area_ratio=0.0)).elements), 4)
        self.assertEqual(len(detect(image, Settings(min_area_ratio=0.002)).elements), 3)

    def test_grid_mode_uses_requested_cells(self):
        blocks = [
            (20, 20, 80, 90, (200, 30, 30)),     # 왼쪽 위 칸
            (250, 20, 310, 90, (30, 120, 200)),  # 오른쪽 위 칸
            (20, 150, 80, 220, (40, 160, 60)),   # 왼쪽 아래 칸
        ]
        image = np.asarray(sheet_with_blocks(blocks).convert("RGBA"))
        result = detect(image, Settings(split_mode="grid", grid_cols=2, grid_rows=2))
        self.assertEqual(len(result.elements), 3)  # 비어 있는 오른쪽 아래 칸은 건너뛴다

    def test_grid_mode_groups_by_cell_not_by_shape(self):
        # 한 칸에 조각이 여럿 있어도 칸마다 하나로 묶인다
        blocks = [
            (20, 20, 60, 60, (200, 30, 30)),
            (100, 20, 140, 60, (200, 30, 30)),
            (250, 150, 310, 220, (30, 120, 200)),
        ]
        image = np.asarray(sheet_with_blocks(blocks).convert("RGBA"))
        result = detect(image, Settings(split_mode="grid", grid_cols=2, grid_rows=2))
        self.assertEqual(len(result.elements), 2)
        self.assertEqual(result.elements[0].box, (20, 20, 140, 60))

    def test_auto_refines_only_merged_blocks(self):
        # 나란한 칸 4개 중 아래 두 칸이 서로 맞닿아 하나로 이어진 상태
        blocks = [
            (20, 20, 90, 100, (200, 30, 30)),
            (150, 20, 220, 100, (30, 120, 200)),
            (20, 150, 90, 222, (40, 160, 60)),
            (45, 222, 65, 232, (40, 160, 60)),   # 잘록하게 이어진 부분
            (20, 232, 90, 300, (240, 180, 20)),
            (150, 150, 220, 230, (120, 60, 200)),
        ]
        image = np.asarray(sheet_with_blocks(blocks, size=(260, 320)).convert("RGBA"))
        merged = detect(image, Settings(split_mode="components"))
        refined = detect(image, Settings(split_mode="auto"))
        self.assertEqual(len(merged.elements), 4)
        self.assertEqual(len(refined.elements), 5)

    def test_empty_image_is_handled(self):
        blank = np.asarray(sheet_with_blocks([], size=(50, 50)).convert("RGBA"))
        self.assertEqual(len(detect(blank, Settings()).elements), 0)


class RenderTests(unittest.TestCase):
    def setUp(self):
        self.image = np.asarray(
            sheet_with_blocks([(20, 20, 80, 90, (200, 30, 30))]).convert("RGBA")
        )

    def test_tight_crop_matches_element_size(self):
        result = detect(self.image, Settings())
        out = render_element(result, result.elements[0], Settings())
        self.assertEqual(out.size, (60, 70))

    def test_padding_expands_evenly(self):
        settings = Settings(padding=10)
        result = detect(self.image, settings)
        self.assertEqual(render_element(result, result.elements[0], settings).size, (80, 90))

    def test_fixed_contain_keeps_whole_element(self):
        settings = Settings(output_mode="fixed", out_width=200, out_height=200, fit="contain")
        result = detect(self.image, settings)
        out = render_element(result, result.elements[0], settings)
        self.assertEqual(out.size, (200, 200))
        # 60x70을 contain하면 세로가 꽉 차고 가로에 여백이 생긴다
        self.assertEqual(np.asarray(out)[100, 0][3], 0)

    def test_fixed_cover_fills_canvas(self):
        settings = Settings(output_mode="fixed", out_width=200, out_height=200,
                            fit="cover", background="white")
        result = detect(self.image, settings)
        out = render_element(result, result.elements[0], settings)
        self.assertEqual(out.size, (200, 200))
        self.assertTrue((np.asarray(out)[:, :, 3] == 255).all())

    def test_square_pads_to_longest_side(self):
        settings = Settings(output_mode="square")
        result = detect(self.image, settings)
        self.assertEqual(render_element(result, result.elements[0], settings).size, (70, 70))

    def test_cutout_makes_background_transparent(self):
        settings = Settings(cutout=True, padding=6, background="transparent")
        result = detect(self.image, settings)
        out = np.asarray(render_element(result, result.elements[0], settings))
        self.assertEqual(out[0, 0][3], 0)          # 모서리는 투명
        self.assertEqual(out[35, 30][3], 255)      # 요소 내부는 불투명

    def test_refined_elements_each_keep_their_pixels(self):
        """맞닿아 있다가 나뉜 요소들은 원본 라벨을 공유한다.

        예전에는 라벨 -> 요소 매핑이 덮어써져서 뒤쪽 요소의 누끼가 통째로
        비어 버렸다. 각 요소가 자기 픽셀을 갖고 있는지 확인한다.
        """
        blocks = [
            (20, 20, 90, 100, (200, 30, 30)),
            (150, 20, 220, 100, (30, 120, 200)),
            (20, 150, 90, 222, (40, 160, 60)),
            (45, 222, 65, 232, (40, 160, 60)),
            (20, 232, 90, 300, (240, 180, 20)),
            (150, 150, 220, 230, (120, 60, 200)),
        ]
        image = np.asarray(sheet_with_blocks(blocks, size=(260, 320)).convert("RGBA"))
        settings = Settings(split_mode="auto", cutout=True, background="transparent")
        result = detect(image, settings)
        self.assertEqual(len(result.elements), 5)
        for element in result.elements:
            out = np.asarray(render_element(result, element, settings))
            self.assertGreater((out[:, :, 3] > 0).mean(), 0.3,
                               f"{element.index}번 요소가 비어 있습니다")

    def test_cutout_does_not_bleed_neighbours(self):
        settings = Settings(cutout=True, padding=40, background="transparent")
        blocks = [(20, 20, 80, 90, (200, 30, 30)), (90, 20, 150, 90, (30, 120, 200))]
        image = np.asarray(sheet_with_blocks(blocks).convert("RGBA"))
        result = detect(image, settings)
        self.assertEqual(len(result.elements), 2)
        out = np.asarray(render_element(result, result.elements[0], settings))
        opaque = out[:, :, 3] > 0
        # 여백까지 포함해 140x150인데 남은 픽셀은 첫 요소(60x70)뿐이어야 한다
        self.assertEqual(opaque.sum(), 60 * 70)

    def test_jpeg_output_is_flattened(self):
        settings = Settings(image_format="jpg")
        result = detect(self.image, settings)
        self.assertEqual(render_element(result, result.elements[0], settings).mode, "RGB")

    def test_parse_color(self):
        self.assertEqual(parse_color("transparent"), (0, 0, 0, 0))
        self.assertEqual(parse_color("#ff8800"), (255, 136, 0, 255))
        self.assertEqual(parse_color("white"), (255, 255, 255, 255))
        with self.assertRaises(ValueError):
            parse_color("연두색")

    def test_output_name_template(self):
        self.assertEqual(output_name("sheet", 3, 9, Settings()), "sheet_03.png")
        self.assertEqual(
            output_name("sheet", 3, 9, Settings(image_format="jpg", name_template="{stem}-{index}of{total}")),
            "sheet-3of9.jpg",
        )


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.src = self.tmp / "sheet.png"
        sheet_with_blocks([
            (20, 20, 80, 90, (200, 30, 30)),
            (150, 20, 210, 90, (30, 120, 200)),
        ]).save(self.src)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_process_file_writes_every_element(self):
        out = self.tmp / "out"
        result, written = process_file(self.src, out, Settings())
        self.assertEqual(len(result.elements), 2)
        self.assertEqual([p.name for p, _ in written], ["sheet_01.png", "sheet_02.png"])
        self.assertTrue(all(p.exists() for p, _ in written))
        with Image.open(written[0][0]) as saved:
            self.assertEqual(saved.size, (60, 70))

    def test_collect_images_skips_unsupported(self):
        (self.tmp / "note.txt").write_text("무시")
        found = collect_images([self.tmp])
        self.assertEqual([p.name for p in found], ["sheet.png"])

    def test_presets_are_valid(self):
        for name in ("trim", "split", "cutout", "sprite", "thumb"):
            self.assertIsInstance(preset(name), Settings)
        with self.assertRaises(ValueError):
            preset("없는프리셋")

    def test_cli_end_to_end(self):
        out = self.tmp / "cli_out"
        code = cli_main([str(self.src), "-o", str(out), "--size", "128x128", "--cutout", "-q"])
        self.assertEqual(code, 0)
        files = sorted(out.glob("*.png"))
        self.assertEqual(len(files), 2)
        with Image.open(files[0]) as saved:
            self.assertEqual(saved.size, (128, 128))

    def test_cli_reports_missing_input(self):
        import contextlib, io

        with contextlib.redirect_stderr(io.StringIO()):
            code = cli_main([str(self.tmp / "없음.png"), "-o", str(self.tmp), "-q"])
        self.assertEqual(code, 1)

    def test_load_rgba_handles_modes(self):
        gray = self.tmp / "gray.png"
        Image.new("L", (30, 30), 128).save(gray)
        self.assertEqual(load_rgba(gray).shape, (30, 30, 4))


if __name__ == "__main__":
    unittest.main(verbosity=2)
