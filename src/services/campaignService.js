import api from './api';

// Create a new campaign (stores recipients, settings, etc.)
export const createCampaign = (data) => api.post('/campaigns', data);

// Launch a campaign by its ID (starts sending messages)
export const launchCampaign = (campaignId) => {
  console.log('📤 Sending POST /campaigns/launch with body:', { campaignId });
  return api.post('/campaigns/launch', { campaignId });
};

export const resetRecipientCheckIn = (campaignId, recipientId) =>
  api.post(`/campaigns/${campaignId}/recipients/${recipientId}/reset-checkin`);

// Get paginated campaign history (used by Sent History page)
export const getCampaignHistory = (params) =>
  api.get('/campaigns/history', { params });

// Upload a static header image (returns URL)
export const uploadCampaignHeader = (file) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post('/campaigns/upload-header', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Update campaign header image or includeHeaderImage flag
export const updateCampaignHeaderImage = (campaignId, updates) =>
  api.put(`/campaigns/${campaignId}/header-image`, updates);

// Get single campaign by ID
export const getCampaignById = (id) =>
  api.get(`/campaigns/${id}`);

// Retry failed recipients for a campaign
export const retryFailedMessages = (campaignId) =>
  api.post(`/campaigns/${campaignId}/retry`);

// Trigger QR generation for a campaign
export const generateCampaignQRs = (campaignId) =>
  api.post(`/campaigns/${campaignId}/generate-qrs`);

// Get the current QR generation progress
export const getCampaignQRProgress = (campaignId) =>
  api.get(`/campaigns/${campaignId}/qr-progress`);

// Delete a single campaign
export const deleteCampaign = (id) =>
  api.delete(`/campaigns/${id}`);

export const renameCampaign = (campaignId, name) =>
  api.put(`/campaigns/${campaignId}/rename`, { name });

// Delete ALL campaigns for the current user (clears history)
export const deleteAllCampaigns = () =>
  api.delete('/campaigns');

export const getAddRecipientsProgress = (campaignId) =>
  api.get(`/campaigns/${campaignId}/add-recipients-progress`);

// Add recipients to an existing campaign
export const addRecipientsToCampaign = (campaignId, recipients, options = {}) =>
  api.post(`/campaigns/${campaignId}/recipients`, {
    recipients,
    generateQr: options.generateQr || false,
    sendNow: options.sendNow || false,
  });

// Send manual WhatsApp message to a specific number
export const sendManualMessage = (campaignId, phone, variables = {}) =>
  api.post(`/campaigns/${campaignId}/send-manual`, { phone, variables });

// Send free-form text message (reply)
export const sendTextMessage = (phone, text) =>
  api.post('/whatsapp/send-text', { phone, text });

// ─── Fetch messages with optional filters ─────────────────────
// Usage:
//   getCampaignMessages(campaignId)                       // all
//   getCampaignMessages(campaignId, { phone: '123', status: 'failed' })
//   getCampaignMessages(campaignId, '1234567890')         // legacy phone only
//   getCampaignMessages(campaignId, '1234567890', 'recipientId')
export const getCampaignMessages = (campaignId, phoneOrFilters, recipientId) => {
  let params = {};

  if (typeof phoneOrFilters === 'object' && phoneOrFilters !== null) {
    // New style: filters object
    params = { ...phoneOrFilters };
  } else {
    // Legacy style: phone and optional recipientId
    if (phoneOrFilters) params.phone = phoneOrFilters;
    if (recipientId) params.recipientId = recipientId;
  }

  return api.get(`/campaigns/${campaignId}/messages`, { params });
};