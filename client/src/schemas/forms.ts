import { z } from 'zod';
const requiredId = z.string().min(1, 'Please make a selection.');
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose a valid time.');
export const playerSchema = z.object({
  name: z.string().trim().min(2, 'Enter at least 2 characters.').max(80),
  email: z.email('Enter a valid email address.'),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  preferredPlay: z.enum(['singles', 'doubles', 'both']),
  availability: z
    .array(z.enum(['morning', 'afternoon', 'evening']))
    .min(1, 'Choose at least one available time.'),
  isActive: z.boolean(),
});
export type PlayerFormValues = z.infer<typeof playerSchema>;
export const courtSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter the court name.'),
    courtNumber: z.number().int().min(1, 'Use a positive court number.'),
    location: z.string().trim().min(2, 'Enter the location.'),
    type: z.enum(['indoor', 'outdoor']),
    status: z.enum(['available', 'occupied', 'maintenance']),
    openingTime: time,
    closingTime: time,
  })
  .refine((value) => value.openingTime < value.closingTime, {
    message: 'Closing time must be after opening time.',
    path: ['closingTime'],
  });
export type CourtFormValues = z.infer<typeof courtSchema>;
export const reservationSchema = z
  .object({
    playerId: requiredId,
    courtId: requiredId,
    reservationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date.'),
    startTime: time,
    endTime: time,
    status: z.enum(['pending', 'confirmed', 'completed', 'cancelled']),
  })
  .refine((value) => value.startTime < value.endTime, {
    message: 'End time must be after start time.',
    path: ['endTime'],
  });
export type ReservationFormValues = z.infer<typeof reservationSchema>;
export const matchSchema = z
  .object({
    courtId: requiredId,
    playType: z.enum(['singles', 'doubles']),
    scheduledAt: z.string().min(1, 'Choose the match date and time.'),
    playerOne: requiredId,
    playerTwo: requiredId,
    playerThree: z.string(),
    playerFour: z.string(),
  })
  .superRefine((value, ctx) => {
    const fields =
      value.playType === 'singles'
        ? (['playerOne', 'playerTwo'] as const)
        : (['playerOne', 'playerTwo', 'playerThree', 'playerFour'] as const);
    const ids = fields.map((field) => value[field]);
    fields.forEach((field) => {
      if (!value[field])
        ctx.addIssue({ code: 'custom', path: [field], message: 'Select a player.' });
      else if (ids.filter((id) => id === value[field]).length > 1)
        ctx.addIssue({ code: 'custom', path: [field], message: 'Each player must be different.' });
    });
  });
export type MatchFormValues = z.infer<typeof matchSchema>;
export const resultSchema = z
  .object({
    teamOneScore: z.number().int().min(0, 'Score cannot be negative.').max(99),
    teamTwoScore: z.number().int().min(0, 'Score cannot be negative.').max(99),
  })
  .refine((value) => value.teamOneScore !== value.teamTwoScore, {
    message: 'A completed match cannot end in a tie.',
    path: ['teamTwoScore'],
  });
export type ResultFormValues = z.infer<typeof resultSchema>;
export const joinQueueSchema = z.object({ playerId: requiredId, courtId: requiredId });
export type JoinQueueValues = z.infer<typeof joinQueueSchema>;
