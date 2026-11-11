import { Idea } from '../../models/Idea.js';
import { Vote } from '../../models/Vote.js';
import { AppError } from '../../utils/AppError.js';

/**
 * Creates the single permanent community vote allowed for a user and idea.
 * The unique MongoDB index is the final protection against simultaneous votes.
 */
export async function voteForIdea(ideaId, userId) {
  const idea = await Idea.findById(ideaId);

  if (!idea) {
    throw new AppError(404, 'IDEA_NOT_FOUND', 'Idea not found.');
  }

  if (idea.ownerId.equals(userId)) {
    throw new AppError(403, 'SELF_VOTE_FORBIDDEN', 'You cannot vote for your own idea.');
  }

  try {
    const vote = await Vote.create({ ideaId, userId });
    const voteCount = await Vote.countDocuments({ ideaId });

    return {
      voteId: vote._id.toString(),
      ideaId: ideaId.toString(),
      voteCount,
    };
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError(409, 'VOTE_DUPLICATE', 'You have already voted for this idea.');
    }

    throw error;
  }
}
