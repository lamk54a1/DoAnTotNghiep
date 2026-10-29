from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "images" / "logo-transparent.png"
OUTPUT = ROOT / "public" / "images" / "slna-ticketing-og.png"

WIDTH, HEIGHT = 1200, 630
NAVY = (0, 43, 110)
BLUE = (0, 65, 153)
YELLOW = (255, 204, 0)
WHITE = (255, 255, 255)


def font(name: str, size: int):
    candidates = [
        Path("C:/Windows/Fonts") / name,
        Path("C:/Windows/Fonts/arialbd.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


canvas = Image.new("RGB", (WIDTH, HEIGHT), NAVY)
pixels = canvas.load()
for y in range(HEIGHT):
    for x in range(WIDTH):
        mix = min(1, (x / WIDTH) * 0.7 + (1 - y / HEIGHT) * 0.25)
        pixels[x, y] = tuple(round(NAVY[i] * (1 - mix) + BLUE[i] * mix) for i in range(3))

draw = ImageDraw.Draw(canvas, "RGBA")
draw.ellipse((760, -360, 1390, 270), fill=(255, 204, 0, 22))
draw.ellipse((850, 355, 1270, 775), fill=(255, 255, 255, 13))
draw.polygon([(0, 515), (1200, 405), (1200, 630), (0, 630)], fill=(0, 27, 73, 125))
draw.rectangle((0, 608, WIDTH, HEIGHT), fill=YELLOW)

logo = Image.open(SOURCE).convert("RGBA")
alpha = logo.getchannel("A")
bbox = alpha.getbbox()
if bbox:
    logo = logo.crop(bbox)
logo.thumbnail((350, 430), Image.Resampling.LANCZOS)

shadow = Image.new("RGBA", (logo.width + 70, logo.height + 70), (0, 0, 0, 0))
shadow_alpha = Image.new("L", shadow.size, 0)
shadow_alpha.paste(155, (35, 35, 35 + logo.width, 35 + logo.height), logo.getchannel("A"))
shadow_alpha = shadow_alpha.filter(ImageFilter.GaussianBlur(18))
shadow.putalpha(shadow_alpha)
canvas.paste(shadow, (75, 82), shadow)
canvas.paste(logo, (110, 105), logo)

draw = ImageDraw.Draw(canvas)
title_font = font("arialbd.ttf", 62)
subtitle_font = font("arialbd.ttf", 35)
body_font = font("arial.ttf", 26)
tag_font = font("arialbd.ttf", 20)

draw.text((500, 116), "SLNA TICKETING", font=title_font, fill=WHITE)
draw.rounded_rectangle((500, 205, 815, 248), radius=21, fill=YELLOW)
draw.text((523, 215), "CỔNG VÉ TRỰC TUYẾN", font=tag_font, fill=NAVY)
draw.text((500, 282), "Đặt vé Sông Lam Nghệ An", font=subtitle_font, fill=WHITE)
draw.text((500, 337), "Chọn chỗ  •  Thanh toán VietQR  •  Nhận vé QR", font=body_font, fill=(218, 232, 250))
draw.text((500, 468), "veslnafc.xyz", font=subtitle_font, fill=YELLOW)
draw.text((500, 522), "Sân vận động Vinh", font=body_font, fill=WHITE)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUTPUT, format="PNG", optimize=True)
print(OUTPUT)
