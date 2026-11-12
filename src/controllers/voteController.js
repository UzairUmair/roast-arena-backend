import mongoose from 'mongoose';
import { Idea } from '../models/Idea.js';
import { Vote } from '../models/Vote.js';

export const voteForIdea = async (req, res) => {
  try {
    const { id: ideaId } = req.params;

    if (!mongoose.isValidObjectId(ideaId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invalid idea ID.' },
      });
    }

    const idea = await Idea.findById(ideaId);

    if (!idea) {
      return res.status(404).json({
        success: false,
        error: { code: 'IDEA_NOT_FOUND', message: 'Idea not found.' },
      });
    }

    if (idea.ownerId.toString() === req.user.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'SELF_VOTE_FORBIDDEN', message: 'You cannot vote for your own idea.' },
      });
    }

    const vote = await Vote.create({ userId: req.user.id, ideaId });
    const voteCount = await Vote.countDocuments({ ideaId });

    return res.status(201).json({
      success: true,
      data: {
        voteId: vote._id.toString(),
        ideaId,
        voteCount,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: { code: 'VOTE_DUPLICATE', message: 'You have already voted for this idea.' },
      });
    }

    console.log(error);
    return res.status(500).json({
      success: false,
      error: { code: 'VOTE_FAILED', message: 'Could not save vote.' },
    });
  }
};
