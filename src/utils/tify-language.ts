export type TifyUserLanguage = 'en' | 'tl' | 'mixed';

const TAGALOG_MARKERS =
  /\b(ako|ikaw|kayo|kamusta|po|opo|hindi|oo|salamat|masakit|sakit|uhaw|mainit|init|tubig|pahinga|pagod|hilo|nahihilo|mabuti|masama|pakiramdam|konti|marami|ngayon|araw|dito|lang|ba|na|ang|sa|ko|mo|nyo)\b/i;

const ENGLISH_MARKERS =
  /\b(i|you|we|feel|feeling|well|sick|headache|dizzy|thirsty|water|heat|tired|okay|thanks|today|little|much|rest|hydrated)\b/i;

/** Rough language guess for Tify replies — mirrors how users type in Tuguegarao (Taglish). */
export function detectTifyUserLanguage(text: string): TifyUserLanguage {
  const t = text.trim();
  if (!t) return 'mixed';

  const hasTl = TAGALOG_MARKERS.test(t);
  const hasEn = ENGLISH_MARKERS.test(t);

  if (hasTl && hasEn) return 'mixed';
  if (hasTl) return 'tl';
  if (hasEn) return 'en';
  return 'mixed';
}

export function tifyLanguageInstruction(lang: TifyUserLanguage): string {
  switch (lang) {
    case 'tl':
      return 'Reply mainly in Filipino/Tagalog. English technical terms (heat index, low/moderate/high) are OK when clearer.';
    case 'en':
      return 'Reply in clear English. Short Tagalog words only if the user used them first.';
    default:
      return 'Reply in natural Taglish (Filipino + English) — match how the user typed. Keep it warm and easy to read.';
  }
}
