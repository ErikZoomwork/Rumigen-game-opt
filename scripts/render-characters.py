"""
Render character SVG layers to 1920x1080 JPG images.
Uses default/neutral expression layers: Shirt, Hoofd, Ogen-Normaal, Mond-Neutraal
"""

import io
from PIL import Image
from svglib.svglib import svg2rlg
from reportlab.graphics import renderPM

CHARACTERS = ["Ahmed", "Clara", "Emma", "Luca", "Sofia"]

# Layers to use (in order, bottom to top), using neutral/default expression
DEFAULT_LAYERS = [
    "layer1-{name}-Shirt.svg",
    "layer10-{name}-Hoofd.svg",
    "layer9-{name}-Ogen-Normaal.svg",
    "layer3-{name}-Mond-Neutraal.svg",
]

CANVAS_W, CANVAS_H = 1920, 1080
SVG_RENDER_SIZE = 1024  # SVGs have 1024x1024 viewBox

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHAR_DIR = os.path.join(BASE_DIR, "SVG", "characters")
OUT_DIR = os.path.join(BASE_DIR, "assets", "images")

def svg_to_pil(svg_path, size):
    """Render an SVG file to a PIL Image at the given square size."""
    drawing = svg2rlg(svg_path)
    if drawing is None:
        raise ValueError(f"Could not load SVG: {svg_path}")
    # Scale drawing to target size
    sx = size / drawing.width
    sy = size / drawing.height
    drawing.width = size
    drawing.height = size
    drawing.transform = (sx, 0, 0, sy, 0, 0)
    png_data = renderPM.drawToString(drawing, fmt="PNG")
    return Image.open(io.BytesIO(png_data)).convert("RGBA")

def render_character(name):
    print(f"Rendering {name}...")

    # Scale character to fill canvas height, center horizontally
    char_size = CANVAS_H  # 1080 px — scale SVG to full height
    x_offset = (CANVAS_W - char_size) // 2  # center on 1920 wide canvas
    y_offset = 0

    # Light gray/warm background
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (240, 237, 230, 255))

    for layer_template in DEFAULT_LAYERS:
        layer_file = layer_template.format(name=name)
        layer_path = os.path.join(CHAR_DIR, name, layer_file)

        if not os.path.exists(layer_path):
            print(f"  WARNING: missing {layer_file}")
            continue

        layer_img = svg_to_pil(layer_path, char_size)
        canvas.paste(layer_img, (x_offset, y_offset), layer_img)
        print(f"  + {layer_file}")

    # Convert to RGB and save as JPG
    rgb = Image.new("RGB", (CANVAS_W, CANVAS_H), (240, 237, 230))
    rgb.paste(canvas, mask=canvas.split()[3])

    out_path = os.path.join(OUT_DIR, f"Character - {name}.jpg")
    rgb.save(out_path, "JPEG", quality=90)
    print(f"  Saved: {out_path}\n")

if __name__ == "__main__":
    for char in CHARACTERS:
        render_character(char)
    print("Done!")
