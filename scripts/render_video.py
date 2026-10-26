"""Render 1280x720 cards for the Qloo demo video from the recorded run."""
from __future__ import annotations
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
BG = (10, 7, 16)
PANEL = (21, 14, 31)
LINE = (43, 31, 60)
INK = (240, 234, 247)
MUTED = (162, 145, 184)
Q = (192, 132, 252)
OK = (52, 211, 153)
WARN = (251, 191, 36)
F = Path("C:/Windows/Fonts")

def f(n, s): return ImageFont.truetype(str(F / n), s)

def base_img():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    for y in range(0, H, 4):
        v = 10 + int(10 * (1 - y / H))
        d.line([(0, y), (W, y)], fill=(v, v - 2, v + 4))
    return img

def title_card(path):
    img = base_img(); d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 8, H], fill=Q)
    d.text((72, 92), "QLOO AGENTIC HACKATHON  /  INSIGHTS API", font=f("consola.ttf", 15), fill=MUTED)
    d.text((72, 146), "Cultural Taste", font=f("consola.ttf", 54), fill=INK)
    d.text((72, 212), "Agent", font=f("consola.ttf", 54), fill=Q)
    d.line([(72, 300), (640, 300)], fill=LINE, width=2)
    d.text((72, 324), "Seeds from /search. Affinity from /v2/insights. Nothing scored locally.", font=f("consola.ttf", 17), fill=INK)
    d.text((72, 356), "Every call traced: status, duration, entity count.", font=f("consola.ttf", 17), fill=MUTED)
    d.text((72, 440), "4 HTTP requests   8 recommendations   3 domains", font=f("consola.ttf", 18), fill=Q)
    d.text((72, 474), "p50 57 ms with a 35 ms injected server delay", font=f("consola.ttf", 15), fill=MUTED)
    d.text((72, 620), "Tingqiu Liu  @liutingqiu", font=f("consola.ttf", 15), fill=MUTED)
    img.save(path)

def terminal_card(path, metrics):
    img = base_img(); d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 46], fill=(24, 16, 36))
    d.text((24, 14), "python -m qloo.client  |  real HTTP round trips", font=f("consola.ttf", 14), fill=MUTED)
    lat = metrics.get("latencyMs", {})
    lines = [
        ("$ QLOO_API_KEY=... QLOO_BASE_URL=http://127.0.0.1:8787 npm run cli -- \\", MUTED),
        ("    --description \"shoegaze and slow cinema\" --seed artist", MUTED),
        ("", MUTED),
        ("  GET /search?query=shoegaze&types=urn:entity:artist   200", INK),
        ("  GET /v2/insights?filter.type=urn:entity:movie&...    200", INK),
        ("  GET /v2/insights?filter.type=urn:entity:place&...    200", INK),
        ("  GET /v2/insights?filter.type=urn:entity:artist&...   200", INK),
        ("", MUTED),
        ("seeds 1   recommendations 8   domains 3", OK),
        ("latency p50 " + str(lat.get("p50")) + " ms   p95 " + str(lat.get("p95")) + " ms   retries " + str(metrics.get("retries")), OK),
    ]
    y = 84
    for text, colour in lines:
        d.text((48, y), text, font=f("consola.ttf", 16), fill=colour)
        y += 40
    d.text((48, 604), "Auth: X-Api-Key and Bearer. 429/5xx retried with Retry-After and jitter. 401 never retried.", font=f("consola.ttf", 14), fill=MUTED)
    img.save(path)

def results_card(path, result):
    img = base_img(); d = ImageDraw.Draw(img)
    d.text((48, 48), "RANKED BY THE AFFINITY THE API RETURNED", font=f("consola.ttf", 15), fill=MUTED)
    recs = (result.get("recommendations") or [])[:6]
    y = 92
    for rec in recs:
        d.rectangle([48, y, 1232, y + 74], outline=LINE, width=1, fill=PANEL)
        d.text((70, y + 14), str(rec.get("domain", "")).upper(), font=f("consola.ttf", 13), fill=Q)
        d.text((70, y + 36), str(rec.get("name", ""))[:46], font=f("consola.ttf", 18), fill=INK)
        d.text((700, y + 36), str(rec.get("id", ""))[:34], font=f("consola.ttf", 13), fill=MUTED)
        d.text((1100, y + 24), str(rec.get("affinity")), font=f("consola.ttf", 18), fill=OK)
        y += 84
    d.text((48, 640), "Each row can be re-queried: the id is the Qloo entity id, the score is the API's.", font=f("consola.ttf", 14), fill=MUTED)
    img.save(path)

def honesty_card(path, metrics):
    img = base_img(); d = ImageDraw.Draw(img)
    d.text((48, 60), "WHAT IS AND IS NOT LIVE", font=f("consola.ttf", 15), fill=MUTED)
    rows = [
        ("transport, auth, retry, parsing", "real", OK),
        ("endpoint in this recording", str(metrics.get("endpoint", "-")), WARN),
        ("hackathon key", "requested, issued over a few business days", WARN),
        ("local fallback data", "none: the client throws without a key", OK),
    ]
    y = 120
    for label, value, colour in rows:
        d.rectangle([48, y, 1232, y + 84], outline=LINE, width=1, fill=PANEL)
        d.text((70, y + 18), label, font=f("consola.ttf", 16), fill=MUTED)
        d.text((70, y + 46), value, font=f("consola.ttf", 18), fill=colour)
        y += 96
    d.text((48, 540), "Pointing QLOO_BASE_URL at hackathon.api.qloo.com and setting QLOO_API_KEY", font=f("consola.ttf", 15), fill=INK)
    d.text((48, 566), "switches this to live data with no code change.", font=f("consola.ttf", 15), fill=INK)
    d.text((48, 630), "github.com/liutingqiu/qloo-cultural-taste-agent", font=f("consola.ttf", 15), fill=Q)
    img.save(path)

out = Path(sys.argv[1] if len(sys.argv) > 1 else "runs/video")
out.mkdir(parents=True, exist_ok=True)
metrics = json.loads(Path("runs/demo/metrics.json").read_text())
result = json.loads(Path("runs/demo/result.json").read_text())
title_card(out / "q1.png")
terminal_card(out / "q2.png", metrics)
results_card(out / "q3.png", result)
honesty_card(out / "q4.png", metrics)
print("cards:", [p.name for p in sorted(out.glob("q*.png"))])
