import { Schema, model } from 'mongoose';
const schema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    skillLevel: { type: String, required: true, enum: ['beginner', 'intermediate', 'advanced'] },
    preferredPlay: { type: String, required: true, enum: ['singles', 'doubles', 'both'] },
    isActive: { type: Boolean, default: true },
    availability: {
      type: [String],
      enum: ['morning', 'afternoon', 'evening'],
      default: ['morning', 'evening'],
    },
  },
  { timestamps: true },
);
export const Player = model('Player', schema);
