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

export const formatPhone = (phone) => {
  if (!phone) return '';
  return phone.startsWith('+') ? phone : `+${phone}`;
};

export const capitalize = (str) =>
  str.charAt(0).toUpperCase() + str.slice(1);

// ✅ NEW: Convert scientific notation (e.g., 2.34806E+12) to full numeric string
export const convertScientificNotation = (value) => {
  if (typeof value === 'number') {
    return value.toLocaleString('fullwide', { useGrouping: false });
  }
  return value;
};

// ✅ NEW: Normalize phone number to international format
export const normalizePhone = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^\d]/g, ''); // remove all non‑digit characters
  if (cleaned.startsWith('0')) {
    // Assume Nigerian local number: replace leading 0 with 234
    cleaned = '234' + cleaned.slice(1);
  }
  if (!cleaned.startsWith('234')) {
    // If not international, assume it's local and add 234
    cleaned = '234' + cleaned;
  }
  return cleaned; // digits only, e.g. "2349133281741"
};