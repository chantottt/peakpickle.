import { Schema, model } from 'mongoose';
const schema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2 },
    courtNumber: { type: Number, required: true, unique: true, min: 1, validate: Number.isInteger },
    location: { type: String, required: true, trim: true },
    type: { type: String, required: true, enum: ['indoor', 'outdoor'] },
    status: { type: String, enum: ['available', 'occupied', 'maintenance'], default: 'available' },
    openingTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    closingTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    // A transactional write on this document serializes competing court operations.
    scheduleVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true },
);
schema.pre('validate', function () {
  if (this.openingTime >= this.closingTime)
    this.invalidate('closingTime', 'Closing time must be after opening time');
});
export const Court = model('Court', schema);
