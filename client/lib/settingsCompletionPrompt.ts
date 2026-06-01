export const ICT_FIELD_LABELS = [
  'ICT Support Name',
  'ICT Support Email',
  'ICT Support Phone (WhatsApp)',
] as const;

export const SETTINGS_COMPLETION_POPUP_ELIGIBLE_KEY =
  'school_settings_completion_popup_eligible_at';

const ONE_MINUTE_MS = 60_000;

export function isIctSupportComplete(missingFields: string[]): boolean {
  return !ICT_FIELD_LABELS.some((label) => missingFields.includes(label));
}

/** Schedule the profile-completion popup to become eligible 1 minute from now. */
export function markSettingsCompletionPopupEligibleInOneMinute(): void {
  localStorage.setItem(
    SETTINGS_COMPLETION_POPUP_ELIGIBLE_KEY,
    String(Date.now() + ONE_MINUTE_MS),
  );
}

/** Milliseconds until the popup may show; 0 if eligible now; null if not scheduled. */
export function msUntilSettingsCompletionPopupEligible(): number | null {
  const raw = localStorage.getItem(SETTINGS_COMPLETION_POPUP_ELIGIBLE_KEY);
  if (!raw) return null;
  const eligibleAt = parseInt(raw, 10);
  if (Number.isNaN(eligibleAt)) return null;
  return Math.max(0, eligibleAt - Date.now());
}
