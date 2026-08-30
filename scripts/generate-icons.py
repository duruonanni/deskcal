"""Generate DeskCal icons from a single SVG source (app-icon.svg).

The SVG matches the tray-friendly calendar glyph: blue body, gold today cell.
Outputs app-icon.png, tray-icon.png, and all Tauri platform icons via `tauri icon`.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "src-tauri" / "icons"
SVG_PATH = ICONS / "app-icon.svg"
TRAY_SVG_PATH = ICONS / "app-icon-tray.svg"
APP_PNG = ROOT / "app-icon.png"
MANIFEST_PATH = ROOT / "icon-manifest.json"

# iOS app icons must be opaque — Apple composites transparent pixels onto this color.
IOS_BG_COLOR = "#fff"
# Android adaptive-icon layer behind the foreground glyph.
ANDROID_BG_COLOR = "#1976D2"

# Kept in-script so the script can bootstrap app-icon.svg if missing.
APP_ICON_SVG = """\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="8" y="8" width="48" height="48" rx="6" fill="#1976D2"/>
  <rect x="8" y="8" width="48" height="15" rx="6" fill="#0D47A1"/>
  <rect x="8" y="18" width="48" height="5" fill="#0D47A1"/>
  <rect x="28" y="30" width="18" height="18" rx="4" fill="#FFB300"/>
  <circle cx="50" cy="15" r="4" fill="#FFB300"/>
</svg>
"""

TRAY_ICON_SVG = """\
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <g transform="translate(32 32) scale(1.18) translate(-32 -32)">
    <rect x="8" y="8" width="48" height="48" rx="6" fill="#1976D2"/>
    <rect x="8" y="8" width="48" height="15" rx="6" fill="#0D47A1"/>
    <rect x="8" y="18" width="48" height="5" fill="#0D47A1"/>
    <rect x="28" y="30" width="18" height="18" rx="4" fill="#FFB300"/>
    <circle cx="50" cy="15" r="4" fill="#FFB300"/>
  </g>
</svg>
"""


def magick_bin() -> str | None:
    return shutil.which("magick")


def ensure_svgs() -> tuple[Path, Path]:
    ICONS.mkdir(parents=True, exist_ok=True)
    if not SVG_PATH.exists():
        SVG_PATH.write_text(APP_ICON_SVG, encoding="utf-8")
    if not TRAY_SVG_PATH.exists():
        TRAY_SVG_PATH.write_text(TRAY_ICON_SVG, encoding="utf-8")
    return SVG_PATH, TRAY_SVG_PATH


def rasterize_svg(svg_path: Path, out_path: Path, size: int) -> None:
    magick = magick_bin()
    if magick is None:
        raise RuntimeError("ImageMagick `magick` not found; install it to rasterize SVG icons.")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    # High density before downscale keeps edges crisp for all target sizes.
    subprocess.run(
        [
            magick,
            "-background",
            "none",
            "-density",
            "384",
            str(svg_path),
            "-resize",
            f"{size}x{size}",
            str(out_path),
        ],
        check=True,
    )


def write_icon_manifest() -> Path:
    manifest = {
        "default": "app-icon.png",
        "bg_color": IOS_BG_COLOR,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return MANIFEST_PATH


def sync_public_favicon(svg_path: Path) -> None:
    public = ROOT / "public"
    public.mkdir(parents=True, exist_ok=True)
    favicon_svg = public / "favicon.svg"
    shutil.copy2(svg_path, favicon_svg)
    rasterize_svg(svg_path, public / "favicon.png", 32)


def sync_android_background_color() -> None:
    values_dir = ICONS / "android" / "values"
    values_dir.mkdir(parents=True, exist_ok=True)
    bg_xml = values_dir / "ic_launcher_background.xml"
    # Strip leading # and prefix with ff for Android ARGB.
    argb = f"#ff{ANDROID_BG_COLOR.lstrip('#').lower()}"
    bg_xml.write_text(
        f"""<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="ic_launcher_background">{argb}</color>
</resources>
""",
        encoding="utf-8",
    )


def run_tauri_icon(manifest_path: Path) -> None:
    cmd = (
        f'npx tauri icon "{manifest_path}" -o "{ICONS}" --ios-color "{IOS_BG_COLOR}"'
    )
    result = subprocess.run(cmd, cwd=ROOT, shell=True)
    if result.returncode != 0:
        print("Warning: tauri icon exited non-zero (often Android file lock on Windows).")
        print("Windows icons (icon.ico / PNG sizes) may still have been updated.")
    sync_android_background_color()


def main() -> None:
    svg, tray_svg = ensure_svgs()
    rasterize_svg(svg, APP_PNG, 1024)
    rasterize_svg(svg, ICONS / "app-icon-1024.png", 1024)
    rasterize_svg(tray_svg, ICONS / "tray-icon.png", 32)
    sync_public_favicon(svg)
    manifest = write_icon_manifest()
    run_tauri_icon(manifest)
    print(f"Icon SSOT: {SVG_PATH.relative_to(ROOT)}")
    print(f"Tray SSOT: {TRAY_SVG_PATH.relative_to(ROOT)}")
    print(f"Rasterized: {APP_PNG.relative_to(ROOT)}")
    print(f"Tray icon: {ICONS.relative_to(ROOT)}/tray-icon.png")
    print(f"Favicon: public/favicon.svg + public/favicon.png")
    print(f"Platform bundle: src-tauri/icons/* (via tauri icon, ios_bg={IOS_BG_COLOR})")


if __name__ == "__main__":
    main()
