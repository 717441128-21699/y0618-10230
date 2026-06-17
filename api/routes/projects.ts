import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProjectController } from '../controllers/ProjectController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const upload = multer({ storage });

const router = Router();

router.get('/', ProjectController.getProjects);
router.post('/', ProjectController.createProject);
router.get('/:id', ProjectController.getProject);
router.put('/:id', ProjectController.updateProject);
router.put('/:id/documents/batch', ProjectController.batchUpdateDocuments);
router.put('/:id/documents/:docId', ProjectController.updateDocument);
router.post('/:id/documents/:docId/upload', upload.single('file'), ProjectController.uploadDocumentFile);
router.get('/:id/documents/:docId/versions', ProjectController.getDocumentVersions);
router.put('/:id/documents/:docId/versions/:versionId/set-current', ProjectController.setCurrentVersion);
router.post('/:id/documents/:docId/comments', ProjectController.addComment);
router.put('/:id/submission', ProjectController.updateSubmission);
router.post('/:id/milestones', ProjectController.addMilestone);
router.put('/:id/milestones/:milestoneId', ProjectController.updateMilestone);
router.get('/:id/activities', ProjectController.getActivities);

export default router;
