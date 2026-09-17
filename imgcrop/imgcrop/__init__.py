"""imgcrop - 이미지에서 요소를 찾아 잘라내고 여백을 없애는 도구."""

from .core import Detection, Element, Settings, detect, load_rgba, preset, process_file

__version__ = "1.0.0"
__all__ = [
    "Settings",
    "Element",
    "Detection",
    "detect",
    "load_rgba",
    "process_file",
    "preset",
    "__version__",
]
