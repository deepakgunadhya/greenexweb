import { Router } from 'express';
import {
  uploadSingleFile,
  uploadMultipleFiles,
  deleteUploadedFile,
  getFileInfo
} from './uploads.controller';
import {
  uploadSingle,
  uploadMultiple
} from '../../middleware/upload.middleware';
import { authenticateToken } from '../../middleware/auth.middleware';

const router: Router = Router();

// Apply authentication to all upload routes
router.use(authenticateToken);

// Single file upload
router.post('/single', uploadSingle, uploadSingleFile);

// Multiple file upload
router.post('/multiple', uploadMultiple, uploadMultipleFiles);

// Delete file
router.delete('/:filename', deleteUploadedFile);

// Get file info
router.get('/info/:filename', getFileInfo);

export default router;
