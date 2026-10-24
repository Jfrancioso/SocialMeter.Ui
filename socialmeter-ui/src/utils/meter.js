// Score bands mirror SocialMeterScore.LabelFor on the API.
const BANDS = [
  { min: 80, key: "electric", label: "Electric", color: "var(--meter-electric)" },
  { min: 65, key: "hot", label: "Hot", color: "var(--meter-hot)" },
  { min: 50, key: "warm", label: "Warm", color: "var(--meter-warm)" },
  { min: 35, key: "lukewarm", label: "Lukewarm", color: "var(--meter-lukewarm)" },
  { min: 0, key: "cold", label: "Cold", color: "var(--meter-cold)" }
];

export const NO_SIGNAL = { key: "none", label: "No signal", color: "var(--meter-none)" };

/** Band for a reading; a reading with no posts is "No signal" regardless of score. */
export function meterBand(score, totalPosts = 1) {
  if (score == null || totalPosts === 0) return NO_SIGNAL;
  return BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];
}

export function meterKey(type, id) {
  return `${type}:${id}`;
}

export function sentimentColor(sentiment) {
  switch (sentiment) {
    case "positive":
      return "var(--loved)";
    case "negative":
      return "var(--hated)";
    default:
      return "var(--mixed)";
  }
}
