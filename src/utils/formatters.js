// src/utils/formatters.js

export const formatNumber = (num) => num?.toLocaleString() || '0';

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

export const formatTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });
};

export const formatDuration = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(seconds / 86400);
  const h = Math.round((seconds % 86400) / 3600);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
};

// ────────────────────────────────────────────────────────────────
//  normalizePhone HAS BEEN REMOVED from the frontend.
//  All phone normalization now happens on the backend, driven by the
//  campaign's stored `autoAddCountryCode` / `defaultCountryCode`.
//  Do not add a client-side copy of normalizePhone — it will silently
//  corrupt numbers before the backend can apply the user's toggle.
// ────────────────────────────────────────────────────────────────

export const formatPhone = (phone) => {
  if (!phone) return '';
  return phone.startsWith('+') ? phone : `+${phone}`;
};

export const capitalize = (str) =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const convertScientificNotation = (value) => {
  if (typeof value === 'number') {
    return value.toLocaleString('fullwide', { useGrouping: false });
  }
  return value;
};

// ─── Case/whitespace-tolerant recipient value lookup ────────────
// Recipients across different uploads store the same column with
// different casing ("ATTENDEE NAME" vs "Attendee Name"). This resolves
// the value regardless so mapping lookups don't silently return empty.
export const normalizeKey = (s) =>
  String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Get a value from a recipient object using a column name that may
 * differ in case/whitespace from the stored key.
 */
export const getRecipientValue = (recipient, columnName) => {
  if (!recipient || !columnName) return '';

  // Exact match first
  const direct = recipient[columnName];
  if (direct !== undefined && direct !== null) return String(direct).trim();

  // Case + whitespace tolerant match
  const target = normalizeKey(columnName);
  const key = Object.keys(recipient).find((k) => normalizeKey(k) === target);
  if (key === undefined) return '';

  const v = recipient[key];
  return v === undefined || v === null ? '' : String(v).trim();
};

/**
 * Resolve a mapping entry to a column name, supporting both the
 * flat shape `{ "1": "ATTENDEE NAME" }` and the nested shape
 * `{ placeholders: { "1": "ATTENDEE NAME" } }`.
 */
export const resolveMappingColumn = (mapping, key) => {
  if (!mapping) return null;

  if (mapping.placeholders && mapping.placeholders[key] !== undefined) {
    return mapping.placeholders[key];
  }
  if (typeof mapping[key] === 'string') {
    return mapping[key];
  }
  const numKey = String(Number(key));
  if (numKey !== 'NaN' && typeof mapping[numKey] === 'string') {
    return mapping[numKey];
  }
  return null;
};

/**
 * Resolve a recipient's display name using the campaign's mapping
 * when available, falling back through the common key variants.
 */
export const getRecipientDisplayName = (r, mapping) => {
  if (!r) return 'Unknown';

  const nameCol = resolveMappingColumn(mapping, '1');
  const fromMapping = getRecipientValue(r, nameCol);
  if (fromMapping) return fromMapping;

  return (
    getRecipientValue(r, 'name') ||
    getRecipientValue(r, 'Attendee Name') ||
    getRecipientValue(r, 'Name') ||
    getRecipientValue(r, 'attendeeName') ||
    getRecipientValue(r, 'Phone Number') ||
    getRecipientValue(r, 'phone') ||
    '—'
  );
};

/**
 * Resolve a recipient's phone using the campaign's mapping when
 * available, falling back through the common key variants.
 */
export const getRecipientDisplayPhone = (r, mapping) => {
  if (!r) return '';

  const phoneCol = resolveMappingColumn(mapping, 'phone');
  const fromMapping = getRecipientValue(r, phoneCol);
  if (fromMapping) return fromMapping;

  return (
    getRecipientValue(r, 'phone') ||
    getRecipientValue(r, 'Phone Number') ||
    getRecipientValue(r, 'phoneNumber') ||
    getRecipientValue(r, 'PHONE NUMBER') ||
    ''
  );
};