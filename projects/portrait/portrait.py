import os, random, time
from PIL import Image, ImageOps, ImageEnhance

W, H = 72, 46
RAMP = "    11774235690888"

def find():
    desk = os.path.join(os.path.expanduser("~"), "Desktop")
    for ext in ("jpg", "jpeg", "png", "webp"):
        p = os.path.join(desk, "photo." + ext)
        if os.path.exists(p):
            return p
    from tkinter import Tk, filedialog
    root = Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    p = filedialog.askopenfilename(title="Photo")
    root.destroy()
    return p

path = find()
if not path:
    raise SystemExit("no photo")

im = ImageOps.exif_transpose(Image.open(path)).convert("L")
im = ImageOps.fit(im, (600, 800), centering=(0.5, 0.4))
im = ImageOps.autocontrast(im, cutoff=2)
im = ImageEnhance.Sharpness(im).enhance(2.5).resize((W, H))

art = []
for y in range(H):
    row = ""
    for x in range(W):
        dark = 255 - im.getpixel((x, y))
        row += RAMP[dark * (len(RAMP) - 1) // 255]
    art.append(row)

order = [[random.random() * 0.5 + y / H * 0.5 for x in range(W)]
         for y in range(H)]

for k in range(41):
    rows = []
    for y in range(H):
        row = ""
        for x in range(W):
            if order[y][x] <= k / 40:
                row += art[y][x]
            else:
                row += random.choice("017      ")
        rows.append(row)
    print("\033[H\033[2J" + "\n".join(rows), flush=True)
    time.sleep(0.15)
