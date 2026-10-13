#!/usr/bin/env python3
"""Assemble the CardioCore single-file website.

Sources live in src/ and are concatenated in order:
  00_head.html      design tokens + CSS
  10_body_public.html   marketing site
  20_body_auth.html     patient + clinician sign-in
  30_body_patient.html  patient application
  40_body_doctor.html   clinician portal
  50_modals.html        modal + toast hosts
  60_core.js            router, charts, ECG engine, flows
The generated heart PNG is embedded as a data URI so the file
works offline, from disk, and inside sandboxed previews.
"""
import base64, pathlib, re

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "cardiocore.html"

head = (SRC / "00_head.html").read_text(encoding="utf-8")
parts = [head]
for name in ["10_body_public.html", "12_body_about.html", "20_body_auth.html", "26_body_onboard.html",
             "30_body_patient.html", "40_body_doctor.html", "50_modals.html"]:
    parts.append((SRC / name).read_text(encoding="utf-8"))

heart = base64.b64encode((ROOT / "assets" / "heart-q.png").read_bytes()).decode()
heart_uri = "data:image/png;base64," + heart

def img_uri(name):
    return "data:image/jpeg;base64," + base64.b64encode((ROOT / "assets" / name).read_bytes()).decode()

core = (SRC / "60_core.js").read_text(encoding="utf-8")
extras = (SRC / "70_extras.js").read_text(encoding="utf-8")
motion = (SRC / "80_motion.js").read_text(encoding="utf-8")
charts = (SRC / "81_charts.js").read_text(encoding="utf-8")
files = (SRC / "82_files.js").read_text(encoding="utf-8")
messages = (SRC / "83_messages.js").read_text(encoding="utf-8")
sim = (SRC / "84_sim.js").read_text(encoding="utf-8")
emergency = (SRC / "86_emergency.js").read_text(encoding="utf-8")
booking = (SRC / "87_booking.js").read_text(encoding="utf-8")
shell = (SRC / "88_shell.js").read_text(encoding="utf-8")

html = "\n".join(parts)
html = html.replace("{{HEART}}", heart_uri)
html = html.replace("{{ABOUT_HERO}}", img_uri("about-hero-web.jpg"))
html = html.replace("{{ABOUT_STORY_1}}", img_uri("about-story-1-web.jpg"))
html = html.replace("{{ABOUT_STORY_2}}", img_uri("about-story-2-web.jpg"))
for block in (core, extras, motion, charts, files, messages, sim, emergency, booking, shell):
    html += "\n<script>\n" + block + "\n</script>\n"
html += "\n<script>\n/* publish the layer APIs on CC for the markup */\nObject.assign(CC, Motion, Files, Messages, Units, ChartFX, Sim, Emergency, Booking, Shell);\n</script>\n</body>\n</html>\n"

OUT.write_text(html, encoding="utf-8")
kb = OUT.stat().st_size / 1024
print(f"built {OUT.name}  ·  {kb:,.0f} KB  ·  heart asset {len(heart)/1024:,.0f} KB")

# sanity checks
checks = {
    "public site": 'id="site"',
    "about page": 'id="about"',
    "patient auth": 'id="login-patient"',
    "doctor auth": 'id="login-doctor"',
    "patient app": 'id="app-patient"',
    "doctor app": 'id="app-doctor"',
    "core js": "const CC =",
    "extras js": "const X =",
    "motion js": "const Motion =",
    "files js": "const Files =",
    "sim js": "const Sim =",
    "emergency js": "const Emergency =",
    "booking js": "const Booking =",
    "shell js": "const Shell =",
    "charts js": "const ChartFX =",
    "units js": "const Units =",
    "messages js": "const Messages =",
    "no placeholders left": None,
}
for label, needle in checks.items():
    if needle is None:
        ok = "{{" not in html
    else:
        ok = needle in html
    print(("  [OK] " if ok else "  [FAIL] ") + label)
