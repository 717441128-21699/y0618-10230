import { Router } from 'express';
import { TemplateController } from '../controllers/TemplateController.js';

const router = Router();

router.get('/', TemplateController.getTemplates);
router.put('/:type/:country', TemplateController.updateTemplate);

export default router;
