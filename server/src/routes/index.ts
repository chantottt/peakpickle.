import { authenticate, csrf, adminOnly } from '../middleware/auth.js';
import { permissions, safeFields } from '../middleware/permissions.js';
import { authRouter } from './auth.js';
import { Court } from '../models/Court.js';
import { publicSummary } from '../services/statisticsService.js';
import { Router } from 'express';
import * as players from '../controllers/playerController.js';
import * as courts from '../controllers/courtController.js';
import * as reservations from '../controllers/reservationController.js';
import * as queue from '../controllers/queueController.js';
import * as matches from '../controllers/matchController.js';
import * as statistics from '../controllers/statisticsController.js';
export const apiRouter = Router();
const playerRouter = Router();
playerRouter.get('/matches', players.matching);
playerRouter.get('/rankings', players.rankingList);
playerRouter.route('/').get(players.list).post(players.create);
playerRouter.route('/:id').get(players.detail).patch(players.update).delete(players.remove);
const courtRouter = Router();
courtRouter.get('/availability', courts.available);
courtRouter.route('/').get(courts.list).post(courts.create);
courtRouter.route('/:id').get(courts.detail).patch(courts.update).delete(courts.remove);
const reservationRouter = Router();
reservationRouter.route('/').get(reservations.list).post(reservations.create);
reservationRouter
  .route('/:id')
  .get(reservations.detail)
  .patch(reservations.update)
  .delete(reservations.remove);
const queueRouter = Router();
queueRouter.get('/summary', queue.summary);
queueRouter.post('/courts/:courtId/call-next', queue.call);
queueRouter.post('/courts/:courtId/start-match', queue.start);
queueRouter.route('/').get(queue.list).post(queue.create);
queueRouter.route('/:id').patch(queue.update).delete(queue.remove);
const matchRouter = Router();
matchRouter.route('/').get(matches.list).post(matches.create);
matchRouter.route('/:id').get(matches.detail).patch(matches.update).delete(matches.remove);
const resultRouter = Router();
resultRouter.post('/', matches.createResult);
resultRouter.get('/:id', adminOnly, matches.resultDetail);
apiRouter.get('/health', (_req, res) => res.json({ status: 'ok', application: 'PeakPickle' }));
apiRouter.get('/public/courts', async (_req, res) =>
  res.json(
    await Court.find()
      .select('name courtNumber location type status openingTime closingTime')
      .sort({ courtNumber: 1 })
      .lean(),
  ),
);
apiRouter.get('/public/rankings', async (_req, res) => {
  const { rankings } = await import('../services/playerService.js');
  res.json(safeFields(await rankings()));
});
apiRouter.get('/public/summary', async (_req, res) => {
  res.json(await publicSummary());
});
apiRouter.use(csrf);
apiRouter.use('/auth', authRouter);
apiRouter.use(authenticate, permissions);
apiRouter.use('/players', playerRouter);
apiRouter.use('/courts', courtRouter);
apiRouter.use('/reservations', reservationRouter);
apiRouter.use('/queue-entries', queueRouter);
apiRouter.use('/matches', matchRouter);
apiRouter.use('/match-results', resultRouter);
apiRouter.get('/statistics/dashboard', statistics.dashboardSummary);
apiRouter.get('/statistics', statistics.analytics);
