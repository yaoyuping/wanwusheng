# Botanical title font

`botanical-serif.woff` is a character subset of **Noto Serif CJK SC Regular** (face 2 of `NotoSerifCJK-Regular.ttc`, from Debian's `fonts-noto-cjk` package). Upstream: https://github.com/notofonts/noto-cjk. The font is distributed under the SIL Open Font License 1.1; the package's copyright notices and license are included in `LICENSE.txt`.

The subset includes printable ASCII and characters present in this app's JavaScript sources. Uncommon characters in user-entered names fall back to the system's Song/serif fonts. Body copy uses system sans serif fonts. The WOFF is hosted with the app and cached by its service worker, so typography adds no external network dependency.

To regenerate with fonttools, create a UTF-8 text file containing the source characters plus printable ASCII, then run:

```sh
pyftsubset /usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc \
  --font-number=2 --text-file=/tmp/wanwusheng-type-chars.txt \
  --flavor=woff --output-file=assets/fonts/botanical-serif.woff \
  --layout-features='*' --name-IDs='*' --name-languages='*' --drop-tables+=DSIG
```
