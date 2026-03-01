import express from 'express';
import {
  applyForInternship,
  getMyApplications,
  getApplicationById,
  withdrawApplication,
  checkApplicationStatus
} from '../controllers/applicationController.js';
import uploadCV from '../middleware/uploadCV.js';

const router = express.Router();

router.post('/apply/:internshipId', uploadCV.single('cv'), applyForInternship);
router.get('/my-applications', getMyApplications);
router.get('/check/:internshipId', checkApplicationStatus);
router.get('/:id', getApplicationById);
router.delete('/:id', withdrawApplication);

export default router;