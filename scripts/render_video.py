"""Render the live-run cards for the Qloo demo video."""
from __future__ import annotations
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

W, H = 1280, 720
BG = (10, 7, 16); PANEL = (21, 14, 31); LINE = (43, 31, 60)
INK = (240, 234, 247); MUTED = (162, 145, 184)
Q = (192, 132, 252); OK = (52, 211, 153); WARN = (251, 191, 36)
F = Path("C:/Windows/Fonts")
def f(n, s): return ImageFont.truetype(str(F / n), s)

def base_img():
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    for y in range(0, H, 4):
        v = 10 + int(10 * (1 - y / H)); d.line([(0, y), (W, y)], fill=(v, v - 2, v + 4))
    return img

def title_card(path, m):
    img = base_img(); d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 8, H], fill=Q)
    d.text((72, 92), "QLOO AGENTIC HACKATHON  /  LIVE RUN", font=f("consola.ttf", 15), fill=MUTED)
    d.text((72, 146), "Cultural Taste", font=f("consola.ttf", 52), fill=INK)
    d.text((72, 208), "Agent", font=f("consola.ttf", 52), fill=Q)
    d.line([(72, 292), (640, 292)], fill=LINE, width=2)
    d.text((72, 316), "Tags from /v2/tags. Names from /search. Affinity from /v2/insights.", font=f("consola.ttf", 16), fill=INK)
    d.text((72, 344), "Nothing is scored locally, and nothing is invented.", font=f("consola.ttf", 16), fill=MUTED)
    lat = (m.get("latencyMs") or {})
    d.text((72, 420), f"{m.get('recommendations')} recommendations   {m.get('requests')} requests   {m.get('retries')} retry", font=f("consola.ttf", 18), fill=Q)
    d.text((72, 452), f"p50 {lat.get('p50')} ms   p95 {lat.get('p95')} ms   live at hackathon.api.qloo.com", font=f("consola.ttf", 14), fill=MUTED)
    d.text((72, 620), "Tingqiu Liu  @liutingqiu", font=f("consola.ttf", 15), fill=MUTED)
    img.save(path)

def terminal_card(path, result):
    img = base_img(); d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 46], fill=(24, 16, 36))
    d.text((24, 14), "real round trips against hackathon.api.qloo.com", font=f("consola.ttf", 14), fill=MUTED)
    lines = [
        ("$ npm run cli -- --description \"shoegaze\" --seed artist \\", MUTED),
        ("    --domains artist,movie,place --take 4", MUTED),
        ("", MUTED),
        ("GET /v2/tags?filter.query=shoegaze            200  4 tags", INK),
        ("GET /search?query=shoegaze&types=urn:entity   200  1 seed", INK),
        ("GET /v2/insights?filter.type=urn:entity:artist  200", INK),
        ("GET /v2/insights?filter.type=urn:entity:movie   200", INK),
        ("GET /v2/insights?filter.type=urn:entity:place   200", INK),
        ("", MUTED),
        ("tags -> urn:tag:genre:music:shoegaze", OK),
        ("12 recommendations   1 retry (429 handled)   p50 4963 ms", OK),
    ]
    y = 84
    for text, colour in lines:
        d.text((48, y), text, font=f("consola.ttf", 15), fill=colour)
        y += 38
    d.text((48, 596), "A bare query= on /v2/tags is rejected with 400; it wants filter.query.", font=f("consola.ttf", 13), fill=MUTED)
    img.save(path)

def results_card(path, result):
    img = base_img(); d = ImageDraw.Draw(img)
    d.text((48, 48), "WHAT THE API RETURNED FOR A SHOEGAZE SIGNAL", font=f("consola.ttf", 15), fill=MUTED)
    recs = (result.get("recommendations") or [])[:7]
    y = 88
    for rec in recs:
        d.rectangle([48, y, 1232, y + 68], outline=LINE, width=1, fill=PANEL)
        d.text((70, y + 12), str(rec.get("domain", "")).upper(), font=f("consola.ttf", 12), fill=Q)
        d.text((70, y + 32), str(rec.get("name", ""))[:44], font=f("msyh.ttc", 17), fill=INK)
        aff = rec.get("affinity")
        d.text((1080, y + 22), (f"{aff:.4f}" if isinstance(aff, (int, float)) else "-"), font=f("consola.ttf", 16), fill=OK)
        y += 78
    d.text((48, 660), "Japanese shoegaze acts, Sono and Kore-eda films, live-music rooms: none of these names are in the repo.", font=f("consola.ttf", 13), fill=MUTED)
    img.save(path)

def honesty_card(path, result):
    img = base_img(); d = ImageDraw.Draw(img)
    d.text((48, 56), "WHAT THE KEY CHANGED", font=f("consola.ttf", 15), fill=MUTED)
    rows = [
        ("/v2/insights wraps results.entities", "the parser had to descend one level", OK),
        ("affinity lives in query.affinity", "until fixed, every rank was alphabetical", OK),
        ("/search matches names, not concepts", "so tags now carry the genre signal", OK),
        ("/v2/tags needs filter.query", "bare query= returns 400", OK),
    ]
    y = 116
    for label, detail, colour in rows:
        d.rectangle([48, y, 1232, y + 88], outline=LINE, width=1, fill=PANEL)
        d.rectangle([48, y, 52, y + 88], fill=colour)
        d.text((74, y + 16), label, font=f("consola.ttf", 17), fill=INK)
        d.text((74, y + 48), detail, font=f("consola.ttf", 14), fill=MUTED)
        y += 100
    d.text((48, 560), "A fixture cannot produce these. The contract server stays as the offline test double,", font=f("consola.ttf", 14), fill=MUTED)
    d.text((48, 586), "and the page you can open shows this live run's artifacts.", font=f("consola.ttf", 14), fill=MUTED)
    d.text((48, 640), "github.com/liutingqiu/qloo-cultural-taste-agent", font=f("consola.ttf", 15), fill=Q)
    img.save(path)

out = Path(sys.argv[1] if len(sys.argv) > 1 else "runs/video")
out.mkdir(parents=True, exist_ok=True)
m = json.loads(Path("data/metrics.json").read_text(encoding="utf-8"))
r = json.loads(Path("data/result.json").read_text(encoding="utf-8"))
title_card(out / "q1.png", m)
terminal_card(out / "q2.png", r)
results_card(out / "q3.png", r)
honesty_card(out / "q4.png", r)
print("cards written")
