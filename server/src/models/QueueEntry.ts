import { Schema, model } from 'mongoose';
const schema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    courtId: { type: Schema.Types.ObjectId, ref: 'Court', required: true },
    status: {
      type: String,
      enum: ['waiting', 'called', 'playing', 'completed', 'cancelled', 'skipped'],
      default: 'waiting',
    },
    joinedAt: { type: Date, default: Date.now },
    calledAt: Date,
    playType: { type: String, enum: ['singles', 'doubles'], default: 'singles' },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);
schema.index({ courtId: 1, status: 1, joinedAt: 1 });
schema.index(
  { playerId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['waiting', 'called', 'playing'] } } },
);
export const QueueEntry = model('QueueEntry', schema);
