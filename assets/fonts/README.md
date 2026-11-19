# Botanical fonts

## WenKai · primary headings and journal text

`botanical-wenkai.woff2` is a web-only subset of **LXGW WenKai Regular**, version 1.530 (October 18, 2026), from https://github.com/lxgw/LxgwWenKai. It supplies the app's headings, buttons, observation notes and encyclopedia summaries. Form inputs, small labels and longer reference text keep the system sans serif family.

Source: `https://raw.githubusercontent.com/lxgw/LxgwWenKai/main/fonts/TTF/LXGWWenKai-Regular.ttf`, downloaded November 19, 2026. Original TTF SHA-256: `2d73eea94ad808999d90c0000c239a84a33b09d4bc6ab6c5b8bbf1eda8a7fc8b`. The copyright, SIL Open Font License 1.1 and additional permission for web subsets are in `WENKAI-OFL.txt`.

The character list combines printable ASCII, GB2312 and the app's root JavaScript/HTML sources. This covers common Chinese plant names as well as interface text; uncommon characters fall back to the system Kai/Song family. The 1.6 MB WOFF2 is hosted and cached with the app, without any external font service. Keep the full downloaded TTF outside the repository.

To reproduce, install FontTools with Brotli support, generate the character list, then subset the TTF:

```sh
python - <<'PY'
from pathlib import Path
chars = set(chr(i) for i in range(32, 127))
for a in range(0xa1, 0xf8):
    for b in range(0xa1, 0xff):
        try: chars.update(bytes((a, b)).decode('gb2312'))
        except UnicodeDecodeError: pass
for source in [*Path('.').glob('*.js'), *Path('.').glob('*.html')]:
    chars.update(source.read_text())
Path('/tmp/wanwusheng-wenkai-chars.txt').write_text(''.join(sorted(chars)))
PY
pyftsubset /tmp/LXGWWenKai-Regular.ttf \
  --text-file=/tmp/wanwusheng-wenkai-chars.txt --flavor=woff2 \
  --output-file=assets/fonts/botanical-wenkai.woff2 \
  --layout-features='*' --name-IDs='*' --name-languages='*' --drop-tables+=DSIG
```

## Song · fallback

`botanical-serif.woff` is a character subset of **Noto Serif CJK SC Regular** (face 2 of `NotoSerifCJK-Regular.ttc`, from Debian's `fonts-noto-cjk` package). Upstream: https://github.com/notofonts/noto-cjk. The font is distributed under the SIL Open Font License 1.1; the package's copyright notices and license are included in `LICENSE.txt`.

The subset includes printable ASCII and characters present in this app's JavaScript sources. The WOFF is hosted with the app and cached by its service worker as a fallback, so typography adds no external network dependency.

To regenerate with fonttools, create a UTF-8 text file containing the source characters plus printable ASCII, then run:

```sh
pyftsubset /usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc \
  --font-number=2 --text-file=/tmp/wanwusheng-type-chars.txt \
  --flavor=woff --output-file=assets/fonts/botanical-serif.woff \
  --layout-features='*' --name-IDs='*' --name-languages='*' --drop-tables+=DSIG
```
