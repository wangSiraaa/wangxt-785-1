import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000
});

api.interceptors.response.use(
  response => {
    if (response.data.success) {
      return response.data.data;
    }
    return Promise.reject(new Error(response.data.error || '请求失败'));
  },
  error => {
    return Promise.reject(error);
  }
);

export const claimApi = {
  createReport: (data) => api.post('/reports', data),
  getReports: (params) => api.get('/reports', { params }),
  getReportById: (id) => api.get(`/reports/${id}`),
  
  uploadPhoto: (reportId, formData) => {
    return api.post(`/reports/${reportId}/photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  getPhotos: (reportId) => api.get(`/reports/${reportId}/photos`),
  submitSurvey: (reportId, operator) => api.post(`/reports/${reportId}/submit-survey`, { operator }),
  
  saveDamageItems: (reportId, items, operator) => api.post(`/reports/${reportId}/damage-items`, { items, operator }),
  submitAssessment: (reportId, operator) => api.post(`/reports/${reportId}/submit-assessment`, { operator }),
  
  getReviewQueue: () => api.get('/review-queue'),
  startReview: (reportId, reviewer) => api.post(`/reports/${reportId}/start-review`, { reviewer }),
  processReview: (reportId, reviewer, result, opinion) => 
    api.post(`/reports/${reportId}/process-review`, { reviewer, result, opinion }),
  
  savePayoutSuggestion: (reportId, suggestion, amount, operator) =>
    api.post(`/reports/${reportId}/payout-suggestion`, { suggestion, amount, operator }),
  completeReport: (reportId, operator) =>
    api.post(`/reports/${reportId}/complete`, { operator }),
  
  getThresholds: () => api.get('/thresholds'),
  getStatusList: () => api.get('/status-list')
};

export default api;
