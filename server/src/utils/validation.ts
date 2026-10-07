import { z } from 'zod';
import { HttpError } from './errors.js';
const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ID');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm time');
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD date')
  .refine((value) => {
    const date = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Invalid calendar date');
export const playerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().pipe(z.email()),
    skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    preferredPlay: z.enum(['singles', 'doubles', 'both']),
    isActive: z.boolean().optional(),
    availability: z
      .array(z.enum(['morning', 'afternoon', 'evening']))
      .min(1)
      .optional(),
  })
  .strict();
export const courtSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    courtNumber: z.number().int().min(1),
    location: z.string().trim().min(2).max(120),
    type: z.enum(['indoor', 'outdoor']),
    status: z.enum(['available', 'occupied', 'maintenance']).optional(),
    openingTime: time,
    closingTime: time,
  })
  .strict();
export const reservationSchema = z
  .object({
    playerId: id,
    courtId: id,
    reservationDate: dateSchema,
    startTime: time,
    endTime: time,
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']).optional(),
  })
  .strict();
export const queueSchema = z.object({ playerId: id, courtId: id }).strict();
export const queuePatchSchema = z
  .object({
    status: z.enum(['called', 'playing', 'completed', 'cancelled', 'skipped']),
    playType: z.enum(['singles', 'doubles']).optional(),
  })
  .strict();
export const queueCallSchema = z
  .object({ playType: z.enum(['singles', 'doubles']).default('singles') })
  .strict();
export const matchSchema = z
  .object({
    courtId: id,
    players: z.array(id).min(2).max(4),
    playType: z.enum(['singles', 'doubles']),
    scheduledAt: z.iso.datetime({ offset: true }),
    status: z.enum(['scheduled', 'ongoing', 'completed', 'cancelled']).optional(),
  })
  .strict();
export const resultSchema = z
  .object({
    matchId: id,
    teamOneScore: z.number().int().min(0).max(99),
    teamTwoScore: z.number().int().min(0).max(99),
    winnerPlayerIds: z.array(id).optional(),
  })
  .strict()
  .refine((value) => value.teamOneScore !== value.teamTwoScore, {
    message: 'A completed match cannot end in a tie.',
    path: ['teamTwoScore'],
  });
export const availabilitySchema = z.object({
  date: dateSchema,
  startTime: time,
  endTime: time,
  excludeReservationId: id.optional(),
});
export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success)
    throw new HttpError(
      400,
      result.error.issues
        .map((issue) => `${issue.path.join('.') || 'Request'}: ${issue.message}`)
        .join('; '),
    );
  return result.data;
}
export function validateId(value: string) {
  return parse(id, value);
}
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});
export function pagination(page: unknown, pageSize: unknown) {
  if (page === undefined && pageSize === undefined) return null;
  const values = parse(paginationSchema, { page, pageSize });
  return {
    skip: (values.page - 1) * values.pageSize,
    limit: values.pageSize + 1,
    pageSize: values.pageSize,
  };
}
