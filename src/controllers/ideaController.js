import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { getIdeaDetail, getVersionHistory, listIdeas, listMyIdeas } from '../services/ideas/ideaQueryService.js';
import { presentIdeaSummary, presentReviewDocuments } from '../services/ideas/ideaPresenter.js';
import { createIdea, repitchIdea } from '../services/ideas/ideaWriteService.js';
import { voteForIdea } from '../services/ideas/voteService.js';

function buildIdeaSubmissionResponse(result) {
  return {
    idea: presentIdeaSummary(result.idea),
    version: {
      id: result.version._id.toString(),
      versionNumber: result.version.versionNumber,
      evaluationStatus: result.version.evaluationStatus,
    },
    reviews: presentReviewDocuments(result.reviews),
  };
}

export const create = asyncHandler(async (req, res) => {
  const result = await createIdea(req.user.id, req.body);
  const response = buildIdeaSubmissionResponse(result);

  return sendSuccess(res, response, 201);
});

export const list = asyncHandler(async (req, res) => {
  const data = await listIdeas(req.validatedQuery);
  return sendSuccess(res, data);
});

export const mine = asyncHandler(async (req, res) => {
  const items = await listMyIdeas(req.user.id);
  return sendSuccess(res, { items });
});

export const detail = asyncHandler(async (req, res) => {
  const idea = await getIdeaDetail(req.params.id, req.user?.id);
  return sendSuccess(res, { idea });
});

export const versions = asyncHandler(async (req, res) => {
  const items = await getVersionHistory(req.params.id);
  return sendSuccess(res, { items });
});

export const repitch = asyncHandler(async (req, res) => {
  const result = await repitchIdea(req.params.id, req.user.id, req.body);
  const response = {
    ...buildIdeaSubmissionResponse(result),
    comparison: result.comparison,
  };

  return sendSuccess(res, response, 201);
});

export const vote = asyncHandler(async (req, res) => {
  const data = await voteForIdea(req.params.id, req.user.id);
  return sendSuccess(res, data, 201);
});
