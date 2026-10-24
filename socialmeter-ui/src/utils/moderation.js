// Why a post was removed. The values match the API's PostModeration.Reasons; the labels are what the admin sees.
export const MODERATION_REASONS = [
  { value: "sensitive", label: "Sensitive" },
  { value: "spam", label: "Spam" },
  { value: "off-topic", label: "Off-topic" },
  { value: "wrong-title", label: "Wrong title" },
  { value: "other", label: "Other" }
];

export const reasonLabel = (value) => MODERATION_REASONS.find((r) => r.value === value)?.label ?? value;

// The labels an admin can correct a post to (the API's Sentiment values).
export const SENTIMENT_LABELS = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" }
];

export const sentimentName = (value) => SENTIMENT_LABELS.find((s) => s.value === value)?.label ?? value;

// A relabel needs a reason this long (the API's PostModeration.MinNoteLength / MaxNoteLength).
export const NOTE_MIN = 3;
export const NOTE_MAX = 300;
