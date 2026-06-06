const express = require('express');
const router = express.Router();
const claimService = require('../services/claimService');

router.post('/reports', (req, res) => {
  try {
    const result = claimService.createReport(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/reports', (req, res) => {
  try {
    const result = claimService.listReports(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/reports/:id', (req, res) => {
  try {
    const result = claimService.getReportById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, error: '案件不存在' });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/reports/:id/photos', (req, res) => {
  try {
    const result = claimService.uploadPhoto(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/reports/:id/photos', (req, res) => {
  try {
    const result = claimService.getPhotos(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/reports/:id/submit-survey', (req, res) => {
  try {
    const { operator } = req.body;
    const result = claimService.submitSurvey(req.params.id, operator);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/reports/:id/damage-items', (req, res) => {
  try {
    const { items, operator } = req.body;
    const result = claimService.saveDamageItems(req.params.id, items, operator);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/reports/:id/submit-assessment', (req, res) => {
  try {
    const { operator } = req.body;
    const result = claimService.submitAssessment(req.params.id, operator);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/review-queue', (req, res) => {
  try {
    const result = claimService.getReviewQueue();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/reports/:id/start-review', (req, res) => {
  try {
    const { reviewer } = req.body;
    const result = claimService.startReview(req.params.id, reviewer);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/reports/:id/process-review', (req, res) => {
  try {
    const { reviewer, result, opinion } = req.body;
    const data = claimService.processReview(req.params.id, reviewer, result, opinion);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/thresholds', (req, res) => {
  try {
    const result = claimService.getThresholdConfig();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/status-list', (req, res) => {
  try {
    const result = claimService.getStatusList();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
