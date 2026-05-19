const LANG_NAMES = {
  ko: "Korean (한국어)",
  en: "English",
  ja: "Japanese (日本語)",
  zh: "Chinese (中文, Simplified)",
};

export function langName(code) {
  return LANG_NAMES[code] ?? code;
}

function baseRules(target) {
  return [
    `Translate the user's text into ${langName(target)}.`,
    `Preserve the original meaning, tone, and intent precisely.`,
    `Do NOT add explanations, notes, alternatives, romanization, or quotes.`,
    `Do NOT translate proper nouns, code, URLs, @mentions, #hashtags, or emoji.`,
    `Output ONLY the translated text — nothing else.`,
  ].join(" ");
}

const STYLE_INSTRUCTIONS = {
  natural: (target) =>
    `Use natural, idiomatic phrasing that a fluent native speaker of ${langName(target)} would actually use in everyday conversation. ` +
    `Avoid literal/word-for-word translation. Prefer the most natural register for the source's apparent tone (neutral by default). ` +
    `For Korean output, use 해요체 unless the source is clearly casual or formal.`,

  sns: (target) =>
    `Translate as if writing a post for social media (Twitter/X, Instagram, KakaoTalk, LINE, Weibo). ` +
    `Use casual, contemporary phrasing typical of native ${langName(target)} speakers' SNS posts: short sentences, current slang where appropriate, and natural informal contractions. ` +
    `For Korean, use 반말 or casual 해요체 depending on the source's tone. For Japanese, use casual だ/である or plain form. For Chinese, use colloquial 口语. For English, use casual conversational tone. ` +
    `Keep punctuation light. Preserve emoji and hashtags from the source if present, but do NOT add new ones.`,

  formal: (target) =>
    `Translate in a formal, polished register suitable for business correspondence, academic writing, or official documents in ${langName(target)}. ` +
    `Use respectful, precise, and complete phrasing. ` +
    `For Korean, use 합쇼체 (-습니다/-ㅂ니다). For Japanese, use 敬語 (です/ます or 謙譲語/尊敬語 as appropriate). For Chinese, use formal 书面语. For English, use polished professional English.`,
};

export const STYLES = ["natural", "sns", "formal"];

export const STYLE_LABEL = {
  natural: "자연스러운 번역",
  sns: "SNS 스타일",
  formal: "Formal / 격식체",
};

export function buildSystemPrompt(style, sourceLangCode, targetLangCode) {
  const sourceClause =
    sourceLangCode && sourceLangCode !== "auto"
      ? `The source text is in ${langName(sourceLangCode)}. `
      : `Detect the source language automatically. `;
  return [
    `You are a professional translator specializing in ${langName(targetLangCode)}.`,
    sourceClause + baseRules(targetLangCode),
    STYLE_INSTRUCTIONS[style](targetLangCode),
    // Disable reasoning mode for Qwen3 / DeepSeek-R1-style "thinking" models.
    // These models otherwise consume the token budget on hidden chain-of-thought
    // and return an empty `content` field. /no_think is the Qwen3 convention;
    // ignored by other models.
    "/no_think",
  ].join("\n\n");
}
