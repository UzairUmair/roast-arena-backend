import { Idea } from '../models/Idea.js';
import { Review } from '../models/Review.js';
import { Vote } from '../models/Vote.js';
import { calculateFinalScore, roundScore } from '../services/scoringService.js';

export const getLeaderboard = async (req, res) => {
  try {
    const ideas = await Idea.find({ currentVersionId: { $ne: null } })
      .populate('ownerId', 'displayName')
      .sort({ createdAt: 1 });

    const leaderboard = [];

    // Simple loop is easy to follow and enough for classroom-size data.
    for (const idea of ideas) {
      const reviews = await Review.find({ versionId: idea.currentVersionId });
      const voteCount = await Vote.countDocuments({ ideaId: idea._id });
      const scoreData = calculateFinalScore(reviews, voteCount);

      if (scoreData.finalScore !== null) {
        leaderboard.push({
          id: idea._id.toString(),
          title: idea.title,
          owner: { displayName: idea.ownerId.displayName },
          versionNumber: idea.currentVersionNumber,
          createdAt: idea.createdAt,
          aiAverage: scoreData.aiAverage,
          voteCount: scoreData.voteCount,
          voteScore: scoreData.voteScore,
          finalScore: scoreData.finalScore,
        });
      }
    }

    leaderboard.sort((firstIdea, secondIdea) => {
      if (secondIdea.finalScore !== firstIdea.finalScore) {
        return secondIdea.finalScore - firstIdea.finalScore;
      }

      if (secondIdea.voteCount !== firstIdea.voteCount) {
        return secondIdea.voteCount - firstIdea.voteCount;
      }

      return new Date(firstIdea.createdAt) - new Date(secondIdea.createdAt);
    });

    const items = leaderboard.map((idea, index) => ({
      ...idea,
      rank: index + 1,
      aiAverage: roundScore(idea.aiAverage),
      voteScore: roundScore(idea.voteScore),
      finalScore: roundScore(idea.finalScore),
    }));

    return res.status(200).json({ success: true, data: { items } });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      error: { code: 'LEADERBOARD_FAILED', message: 'Could not get leaderboard.' },
    });
  }
};
