import api from './api';

export const getMediaImages = () => api.get('/media');

export const deleteMediaImages = (publicIds) =>
  api.post('/media/delete', { publicIds });