import { Schema, model } from 'mongoose';
const schema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'member'], required: true, default: 'member' },
    isActive: { type: Boolean, default: true },
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'Player',
      required: function () {
        return this.role === 'member';
      },
    },
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);
schema.index(
  { playerId: 1 },
  { unique: true, partialFilterExpression: { playerId: { $type: 'objectId' } } },
);
export const User = model('User', schema);
