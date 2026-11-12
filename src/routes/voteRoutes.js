import express from 'express';
import { voteForIdea } from '../controllers/voteController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// This keeps the public endpoint compatible: POST /api/ideas/:id/vote
router.post('/:id/vote', protect, voteForIdea);

export default router;
