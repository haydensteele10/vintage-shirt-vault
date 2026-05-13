/** Strip HTML tags and trim whitespace. */
function stripHtml(str) {
  return typeof str === 'string' ? str.replace(/<[^>]*>/g, '').trim() : '';
}

/** Sanitize a free-text field: strip HTML and enforce a max length. */
export function sanitizeText(str, maxLen = 500) {
  if (!str && str !== 0) return '';
  return stripHtml(String(str)).slice(0, maxLen);
}

/**
 * Sanitize all user-editable fields in the shirt form before sending to Supabase.
 * Enums (style, condition) and numeric fields are left untouched — they are
 * validated by the DB constraints and the form's controlled inputs respectively.
 */
export function sanitizeShirtForm(form) {
  return {
    ...form,
    brand:            sanitizeText(form.brand, 100),
    era:              sanitizeText(form.era, 20),
    size:             sanitizeText(form.size, 20),
    tour_or_event:    sanitizeText(form.tour_or_event, 200),
    graphic_keywords: sanitizeText(form.graphic_keywords, 200),
    sport:            sanitizeText(form.sport, 50),
    location:         sanitizeText(form.location, 100),
    tag_brand:        sanitizeText(form.tag_brand, 50),
    valuation_notes:  sanitizeText(form.valuation_notes, 1000),
    notes:            sanitizeText(form.notes, 2000),
  };
}

/** Sanitize profile editable fields. */
export function sanitizeProfileDraft(draft) {
  return {
    username: sanitizeText(draft.username, 20).toLowerCase(),
    bio:      sanitizeText(draft.bio, 160),
  };
}
