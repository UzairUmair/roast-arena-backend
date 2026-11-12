import express from 'express';
import {
  createIdea,
  getIdeaById,
  getIdeas,
  getIdeaVersions,
  getMyIdeas,
  repitchIdea,
} from '../controllers/ideaController.js';
import { optionalProtect, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', getIdeas);
router.post('/', protect, createIdea);

// This must come before '/:id', or Express will think "mine" is an idea ID.
router.get('/mine', protect, getMyIdeas);

router.get('/:id', optionalProtect, getIdeaById);
router.get('/:id/versions', getIdeaVersions);
router.post('/:id/repitch', protect, repitchIdea);

export default router;
