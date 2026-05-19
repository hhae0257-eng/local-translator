export function detectLang(text) {
  if (!text) return null;
  const sample = text.slice(0, 400);
  let han = 0, hira = 0, kata = 0, hangul = 0, latin = 0;
  for (const ch of sample) {
    const c = ch.codePointAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) hangul++;
    else if (c >= 0x3040 && c <= 0x309f) hira++;
    else if (c >= 0x30a0 && c <= 0x30ff) kata++;
    else if ((c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf)) han++;
    else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)) latin++;
  }
  if (hangul > 0) return "ko";
  if (hira + kata > 0) return "ja";
  if (han > 0) return "zh";
  if (latin > 0) return "en";
  return null;
}

export const LANG_LABEL = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
};
