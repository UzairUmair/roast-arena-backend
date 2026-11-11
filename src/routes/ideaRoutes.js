import { Router } from 'express';
import {
  create,
  detail,
  list,
  mine,
  repitch,
  versions,
  vote,
} from '../controllers/ideaController.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  paginationSchema,
  pitchSchema,
  repitchSchema,
} from '../validation/schemas.js';

export const ideaRouter = Router();

ideaRouter.get('/', validate(paginationSchema, 'query'), list);
ideaRouter.post('/', requireAuth, validate(pitchSchema), create);

// Keep this specific route before '/:id', otherwise Express treats "mine" as an ID.
ideaRouter.get('/mine', requireAuth, mine);

ideaRouter.get('/:id', optionalAuth, detail);
ideaRouter.get('/:id/versions', versions);
ideaRouter.post('/:id/repitch', requireAuth, validate(repitchSchema), repitch);
ideaRouter.post('/:id/vote', requireAuth, vote);
