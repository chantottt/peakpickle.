import { Schema, model } from 'mongoose';
const schema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
    courtId: { type: Schema.Types.ObjectId, ref: 'Court', required: true },
    reservationDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  { timestamps: true },
);
schema.index({ courtId: 1, reservationDate: 1, status: 1, startTime: 1 });
schema.pre('validate', function () {
  if (this.startTime >= this.endTime)
    this.invalidate('endTime', 'End time must be after start time');
});
export const Reservation = model('Reservation', schema);
