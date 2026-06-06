const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const claimService = require('../services/claimService');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件 (JPG, PNG, GIF, WEBP)'));
    }
  }
});

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

router.post('/reports/:id/photos', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请选择要上传的照片文件' });
    }
    
    const photoData = {
      photo_type: req.body.photo_type || 'scene',
      damage_part: req.body.damage_part || '',
      file_name: req.file.originalname,
      file_path: '/uploads/' + req.file.filename,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      description: req.body.description || '',
      upload_by: req.body.upload_by || '系统'
    };
    
    const result = claimService.uploadPhoto(req.params.id, photoData);
    res.json({ success: true, data: result });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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

router.post('/reports/:id/payout-suggestion', (req, res) => {
  try {
    const { suggestion, amount, operator } = req.body;
    const result = claimService.savePayoutSuggestion(req.params.id, suggestion, amount, operator);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/reports/:id/complete', (req, res) => {
  try {
    const { operator } = req.body;
    const result = claimService.completeReport(req.params.id, operator);
    res.json({ success: true, data: result });
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
