#!/usr/bin/env bash
# Rebuild the headless-browser stack in this sandbox (nothing here persists between turns).
set -e
export LD_LIBRARY_PATH=/tmp/root/usr/lib/x86_64-linux-gnu:/tmp/root/lib/x86_64-linux-gnu
pip install --quiet playwright 2>/dev/null | tail -1 || true
python3 -m playwright install chromium 2>&1 | tail -1
mkdir -p /tmp/debs/root /tmp/root
cd /tmp/debs
if [ ! -f ok ]; then
  curl -s http://deb.debian.org/debian/dists/trixie/main/binary-amd64/Packages.gz -o P.gz
  zcat P.gz > P.txt
  python3 - << 'PY'
import re, pathlib
txt = pathlib.Path('/tmp/debs/P.txt').read_text(errors='ignore')
want = ['libnspr4','libnss3','libatk1.0-0t64','libatk-bridge2.0-0t64','libatspi2.0-0t64','libxdamage1','libxkbcommon0','libasound2t64']
files = []
for b in txt.split('\n\n'):
    m = re.search(r'^Package: (\S+)', b, re.M)
    a = re.search(r'^Architecture: (\S+)', b, re.M)
    f = re.search(r'^Filename: (\S+)', b, re.M)
    if m and f and a and a.group(1) in ('amd64','all') and (m.group(1) in want or m.group(1).startswith('libnss3')):
        files.append(f.group(1))
pathlib.Path('/tmp/debs/list.txt').write_text('\n'.join(files))
PY
  while read -r f; do [ -f "$(basename "$f")" ] || curl -s -O "http://deb.debian.org/debian/$f"; done < list.txt
  for d in *.deb; do
    dpkg-deb -x "$d" /tmp/root 2>/dev/null || { ar x "$d" && tar -xf data.tar.* -C /tmp/root && rm -f data.tar.* control.tar.* debian-binary; }
  done
  [ -f /tmp/root/usr/lib/x86_64-linux-gnu/libnss3.so ] || { echo "libnss3 missing"; exit 1; }
  touch ok
fi
echo "playwright ready — run with LD_LIBRARY_PATH=$LD_LIBRARY_PATH"
