import type { RequestHandler } from 'express';
import { dashboard, statistics } from '../services/statisticsService.js';
export const dashboardSummary: RequestHandler = async (_req, res) => res.json(await dashboard());
export const analytics: RequestHandler = async (_req, res) => res.json(await statistics());
