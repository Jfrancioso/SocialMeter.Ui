// Why a post was removed. The values match the API's PostModeration.Reasons; the labels are what the admin sees.
export const MODERATION_REASONS = [
  { value: "sensitive", label: "Sensitive" },
  { value: "spam", label: "Spam" },
  { value: "off-topic", label: "Off-topic" },
  { value: "wrong-title", label: "Wrong title" },
  { value: "other", label: "Other" }
];

export const reasonLabel = (value) => MODERATION_REASONS.find((r) => r.value === value)?.label ?? value;
