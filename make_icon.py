"""
Local Translator 앱 아이콘 생성기
디자인: 다크 그라디언트 배경 + A↔가 번역 심볼
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os

SIZE = 1024
RADIUS = 200  # 모서리 둥글기


def rounded_rect_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def make_gradient(size):
    """다크 네이비 → 딥 퍼플 방사형 그라디언트"""
    img = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(img)
    cx, cy = size // 2, size // 2
    c1 = (18, 18, 42)   # 딥 네이비
    c2 = (30, 22, 65)   # 딥 퍼플

    for y in range(size):
        for x in range(0, size, 1):
            dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (size * 0.72)
            t = min(dist, 1.0)
            r = int(c1[0] + (c2[0] - c1[0]) * t)
            g = int(c1[1] + (c2[1] - c1[1]) * t)
            b = int(c1[2] + (c2[2] - c1[2]) * t)
            draw.point((x, y), fill=(r, g, b))
    return img


def add_glow_circle(img, cx, cy, radius, color, alpha=60):
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    for i in range(4, 0, -1):
        r = radius + i * 18
        a = int(alpha * (5 - i) / 4)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, a))
    d.ellipse([cx - radius, cy - radius, cx + radius, cy + radius],
              fill=(*color, 120))
    img.alpha_composite(glow)


def make_icon():
    # 1. 배경 그라디언트
    bg = make_gradient(SIZE).convert("RGBA")

    # 2. 둥근 마스크 적용
    mask = rounded_rect_mask(SIZE, RADIUS)
    bg.putalpha(mask)

    # 3. 미묘한 내부 글로우 (테두리 효과)
    border = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    bd = ImageDraw.Draw(border)
    bd.rounded_rectangle([2, 2, SIZE - 3, SIZE - 3], radius=RADIUS,
                          outline=(80, 60, 160, 80), width=3)
    bg.alpha_composite(border)

    draw = ImageDraw.Draw(bg)
    cy = SIZE // 2  # 세로 중앙

    # 4. 왼쪽 글로우 원 (청록색)
    add_glow_circle(bg, 295, cy, 155, (0, 210, 200), alpha=45)
    # 5. 오른쪽 글로우 원 (보라색)
    add_glow_circle(bg, 730, cy, 155, (140, 80, 255), alpha=45)

    draw = ImageDraw.Draw(bg)

    # 6. 글자 렌더링 - 시스템 폰트 사용
    font_paths = [
        r"C:\Windows\Fonts\segoeuib.ttf",   # Segoe UI Bold
        r"C:\Windows\Fonts\arialbd.ttf",    # Arial Bold
        r"C:\Windows\Fonts\calibrib.ttf",   # Calibri Bold
    ]
    korean_paths = [
        r"C:\Windows\Fonts\malgunbd.ttf",   # 맑은 고딕 Bold
        r"C:\Windows\Fonts\gulim.ttc",
        r"C:\Windows\Fonts\batang.ttc",
    ]

    font_en = None
    for p in font_paths:
        if os.path.exists(p):
            try:
                font_en = ImageFont.truetype(p, 310)
                break
            except Exception:
                pass
    if not font_en:
        font_en = ImageFont.load_default()

    font_kr = None
    for p in korean_paths:
        if os.path.exists(p):
            try:
                font_kr = ImageFont.truetype(p, 290)
                break
            except Exception:
                pass
    if not font_kr:
        font_kr = font_en

    # "A" — 청록색
    a_color = (0, 230, 215)
    bbox = draw.textbbox((0, 0), "A", font=font_en)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((295 - tw // 2 - bbox[0], cy - th // 2 - bbox[1] - 10),
              "A", font=font_en, fill=a_color)

    # "가" — 보라색/라벤더
    k_color = (180, 130, 255)
    bbox = draw.textbbox((0, 0), "가", font=font_kr)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((730 - tw // 2 - bbox[0], cy - th // 2 - bbox[1] - 10),
              "가", font=font_kr, fill=k_color)

    # 7. 양방향 화살표 (중앙)
    arrow_y = cy + 20
    ax1, ax2 = 455, 572
    arr_color = (200, 200, 255)
    lw = 7

    # → 위 화살표
    draw.line([(ax1, arrow_y - 38), (ax2, arrow_y - 38)],
              fill=arr_color, width=lw)
    draw.polygon([(ax2, arrow_y - 38),
                  (ax2 - 32, arrow_y - 58),
                  (ax2 - 32, arrow_y - 18)],
                 fill=arr_color)

    # ← 아래 화살표
    draw.line([(ax1, arrow_y + 38), (ax2, arrow_y + 38)],
              fill=arr_color, width=lw)
    draw.polygon([(ax1, arrow_y + 38),
                  (ax1 + 32, arrow_y + 18),
                  (ax1 + 32, arrow_y + 58)],
                 fill=arr_color)

    # 8. 앱 이름 하단 (소형 텍스트)
    try:
        font_sm = ImageFont.truetype(font_paths[0], 52)
    except Exception:
        font_sm = ImageFont.load_default()

    label = "LOCAL TRANSLATOR"
    bbox = draw.textbbox((0, 0), label, font=font_sm)
    lw2 = bbox[2] - bbox[0]
    draw.text((SIZE // 2 - lw2 // 2, SIZE - 135),
              label, font=font_sm, fill=(160, 150, 200, 200))

    # 9. 저장
    out_path = r"C:\Projects\local-translator\app-icon-new.png"
    bg.save(out_path, "PNG")
    print(f"아이콘 생성 완료: {out_path}")
    print(f"크기: {bg.size}")


if __name__ == "__main__":
    make_icon()
