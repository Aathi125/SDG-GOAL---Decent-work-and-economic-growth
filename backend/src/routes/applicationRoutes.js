import express from 'express';
import {
  applyForInternship,
  getMyApplications,
  getApplicationById,
  withdrawApplication,
  checkApplicationStatus,
  updateApplication
} from '../controllers/applicationController.js';
import uploadCV, { flexibleUpload } from '../middleware/uploadCV.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.post('/apply/:internshipId', flexibleUpload, applyForInternship);
router.get('/my-applications', getMyApplications);
router.get('/check/:internshipId', checkApplicationStatus);
router.get('/:id', getApplicationById);
router.put('/:id', flexibleUpload, updateApplication);
router.delete('/:id', withdrawApplication);

export default router;