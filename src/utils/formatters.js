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
//
//  All phone normalization now happens on the backend, driven by the
//  campaign's stored `autoAddCountryCode` / `defaultCountryCode`.
//
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
