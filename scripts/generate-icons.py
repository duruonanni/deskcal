"""Generate DeskCal icons from a single SVG source (app-icon.svg).

The SVG matches the tray-friendly calendar glyph: blue body, gold today cell.
Outputs app-icon.png and all Tauri platform icons via `tauri icon`.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "src-tauri" / "icons"
SVG_PATH = ICONS / "app-icon.svg"
APP_PNG = ROOT / "app-icon.png"

# Kept in-script so the script can bootstrap app-icon.svg if missing.
APP_ICON_SVG = """\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="6" y="8" width="48" height="48" rx="6" fill="#1976D2"/>
  <rect x="6" y="8" width="48" height="15" rx="6" fill="#0D47A1"/>
  <rect x="6" y="18" width="48" height="5" fill="#0D47A1"/>
  <rect x="26" y="30" width="18" height="18" rx="4" fill="#FFB300"/>
  <circle cx="48" cy="15" r="4" fill="#FFB300"/>
</svg>
"""


def magick_bin() -> str | None:
    return shutil.which("magick")


def ensure_svg() -> Path:
    ICONS.mkdir(parents=True, exist_ok=True)
    if not SVG_PATH.exists():
        SVG_PATH.write_text(APP_ICON_SVG, encoding="utf-8")
    return SVG_PATH


def rasterize_svg(svg_path: Path, out_path: Path, size: int) -> None:
    magick = magick_bin()
    if magick is None:
        raise RuntimeError("ImageMagick `magick` not found; install it to rasterize SVG icons.")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            magick,
            "-background",
            "none",
            str(svg_path),
            "-resize",
            f"{size}x{size}",
            str(out_path),
        ],
        check=True,
    )


def sync_public_favicon(svg_path: Path) -> None:
    public = ROOT / "public"
    public.mkdir(parents=True, exist_ok=True)
    favicon_svg = public / "favicon.svg"
    shutil.copy2(svg_path, favicon_svg)
    rasterize_svg(svg_path, public / "favicon.png", 32)


def run_tauri_icon() -> None:
    cmd = f'npx tauri icon "{APP_PNG}" -o "{ICONS}"'
    result = subprocess.run(cmd, cwd=ROOT, shell=True)
    if result.returncode != 0:
        print("Warning: tauri icon exited non-zero (often Android file lock on Windows).")
        print("Windows icons (icon.ico / PNG sizes) may still have been updated.")


def main() -> None:
    svg = ensure_svg()
    rasterize_svg(svg, APP_PNG, 1024)
    rasterize_svg(svg, ICONS / "app-icon-1024.png", 1024)
    sync_public_favicon(svg)
    run_tauri_icon()
    print(f"Icon SSOT: {SVG_PATH.relative_to(ROOT)}")
    print(f"Rasterized: {APP_PNG.relative_to(ROOT)}")
    print(f"Favicon: public/favicon.svg + public/favicon.png")
    print(f"Platform bundle: src-tauri/icons/* (via tauri icon)")


if __name__ == "__main__":
    main()
