import { Schema, model } from 'mongoose';
const schema = new Schema(
  {
    courtId: { type: Schema.Types.ObjectId, ref: 'Court', required: true },
    // Singles: [A, B]. Doubles: [A1, A2, B1, B2].
    players: [{ type: Schema.Types.ObjectId, ref: 'Player', required: true }],
    playType: { type: String, required: true, enum: ['singles', 'doubles'] },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    scheduledAt: { type: Date, required: true },
    startedAt: Date,
    completedAt: Date,
    queueEntryIds: [{ type: Schema.Types.ObjectId, ref: 'QueueEntry' }],
  },
  { timestamps: true },
);
schema.index({ courtId: 1 }, { unique: true, partialFilterExpression: { status: 'ongoing' } });
schema.pre('validate', function () {
  const size = this.playType === 'singles' ? 2 : 4;
  if (this.players.length !== size || new Set(this.players.map(String)).size !== size)
    this.invalidate('players', `Select ${size} distinct players`);
});
export const Match = model('Match', schema);
