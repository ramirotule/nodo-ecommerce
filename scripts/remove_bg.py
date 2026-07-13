"""
Bulk background removal for product images stored in Supabase.

Requirements:
    pip install rembg[cpu] pillow supabase requests python-dotenv

Usage:
    python scripts/remove_bg.py
"""

import os
import sys
import io
import requests
from pathlib import Path
from PIL import Image
from rembg import remove, new_session
from supabase import create_client, Client
from dotenv import load_dotenv

# Load from .env.local in the project root
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path)

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
BUCKET = "productos"

# Set to a list of product IDs to process only those, or leave empty for ALL
ONLY_IDS: list[str] = []

# Model options (better to worse for product photos):
#   "birefnet-general"   → best for products, preserves light-colored objects
#   "isnet-general-use"  → good alternative
#   "u2net"              → default, faster but more aggressive
MODEL = "birefnet-general"

# Alpha matting: helps recover edges lost by the model.
# Set to True if the model cuts too much into the product.
ALPHA_MATTING = False
ALPHA_MATTING_FG_THRESHOLD = 240   # 0-255, higher = keeps more foreground
ALPHA_MATTING_BG_THRESHOLD = 10    # 0-255, lower = removes less background
ALPHA_MATTING_ERODE_SIZE   = 10
# ─────────────────────────────────────────────────────────────────────────────

if not SUPABASE_URL or not SUPABASE_KEY:
    print(f"ERROR: No se encontraron las variables en {env_path}")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
session = new_session(MODEL)


def fetch_products() -> list[dict]:
    query = supabase.table("productos").select("id, nombre, imagen_url")
    if ONLY_IDS:
        query = query.in_("id", ONLY_IDS)
    res = query.execute()
    return [p for p in res.data if p.get("imagen_url")]


def download_image(url: str) -> bytes:
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.content


def remove_background(image_bytes: bytes) -> bytes:
    output = remove(
        image_bytes,
        session=session,
        alpha_matting=ALPHA_MATTING,
        alpha_matting_foreground_threshold=ALPHA_MATTING_FG_THRESHOLD,
        alpha_matting_background_threshold=ALPHA_MATTING_BG_THRESHOLD,
        alpha_matting_erode_size=ALPHA_MATTING_ERODE_SIZE,
    )
    img = Image.open(io.BytesIO(output)).convert("RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def upload_to_supabase(product_id: str, png_bytes: bytes) -> str:
    path = f"productos/{product_id}-nobg.png"
    supabase.storage.from_(BUCKET).upload(
        path,
        png_bytes,
        {"content-type": "image/png", "upsert": "true"},
    )
    res = supabase.storage.from_(BUCKET).get_public_url(path)
    return res


def update_product_image(product_id: str, new_url: str):
    supabase.table("productos").update({"imagen_url": new_url}).eq("id", product_id).execute()


def main():
    products = fetch_products()
    total = len(products)
    print(f"Found {total} products with images. Using model: {MODEL}\n")

    ok = 0
    errors = 0

    for i, p in enumerate(products, 1):
        name = p["nombre"]
        pid = p["id"]
        url = p["imagen_url"]
        prefix = f"[{i}/{total}]"

        try:
            print(f"{prefix} Downloading: {name}...", end=" ", flush=True)
            original = download_image(url)

            print("Removing background...", end=" ", flush=True)
            png = remove_background(original)

            print("Uploading...", end=" ", flush=True)
            new_url = upload_to_supabase(pid, png)

            update_product_image(pid, new_url)
            print(f"Done ✓")
            ok += 1

        except Exception as e:
            print(f"ERROR: {e}")
            errors += 1

    print(f"\n{'─'*40}")
    print(f"Completed: {ok} ok, {errors} errors out of {total} products.")


if __name__ == "__main__":
    main()
