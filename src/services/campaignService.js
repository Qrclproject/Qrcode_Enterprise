import api from './api';

// Create a new campaign (stores recipients, settings, etc.)
export const createCampaign = (data) => api.post('/campaigns', data);

// Launch a campaign by its ID (starts sending messages)
export const launchCampaign = (campaignId) => {
  console.log('📤 Sending POST /campaigns/launch with body:', { campaignId });
  return api.post('/campaigns/launch', { campaignId });
};
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
// Accepts an object: { headerImageUrl?: string, includeHeaderImage?: boolean }
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

// Delete ALL campaigns for the current user (clears history)
export const deleteAllCampaigns = () =>
  api.delete('/campaigns');