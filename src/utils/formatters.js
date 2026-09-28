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

/**
 * Normalize a phone number (mirrors the backend util).
 *
 * @param {string|number} phone
 * @param {object} [options]
 * @param {boolean} [options.enabled=true]
 *   true  → add country code / replace leading 0
 *   false → only strip non-digits
 * @param {string}  [options.countryCode='234']
 * @returns {string} Digits-only phone
 */
export const normalizePhone = (phone, options = {}) => {
  const { enabled = true, countryCode = '234' } = options;

  if (phone === null || phone === undefined || phone === '') return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  if (!enabled) return digits;

  if (digits.startsWith(countryCode)) return digits;
  if (digits.startsWith('0')) return countryCode + digits.slice(1);
  return countryCode + digits;
};

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
