# backend/DL_API/tests/test_heatmap_client.py
import requests
from io import BytesIO
from PIL import Image, ImageDraw
import os

URL = "http://localhost:8001/heatmap/"

os.makedirs("tests_outputs", exist_ok=True)

def make_test_image(i):
    img = Image.new("RGB", (512, 512), (30 + i*60, 30, 30))
    draw = ImageDraw.Draw(img)
    draw.ellipse((120, 120, 392, 392), outline=(255,255,0), width=8)
    return img

def post_and_save(img, idx):
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    files = {"file": (f"test_{idx}.png", buf, "image/png")}
    r = requests.post(URL, files=files, timeout=120)
    if r.status_code == 200:
        out_path = f"tests_outputs/heatmap_{idx}.png"
        with open(out_path, "wb") as f:
            f.write(r.content)
        print(f"Saved {out_path}")
    else:
        print(f"Error {r.status_code}: {r.text}")

if __name__ == "__main__":
    for i in range(3):
        img = make_test_image(i)
        post_and_save(img, i)