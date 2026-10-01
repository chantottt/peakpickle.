import { Schema, model } from 'mongoose';
const schema = new Schema(
  {
    matchId: { type: Schema.Types.ObjectId, ref: 'Match', required: true, unique: true },
    teamOneScore: { type: Number, required: true, min: 0, max: 99, validate: Number.isInteger },
    teamTwoScore: { type: Number, required: true, min: 0, max: 99, validate: Number.isInteger },
    winnerPlayerIds: [{ type: Schema.Types.ObjectId, ref: 'Player', required: true }],
  },
  { timestamps: true },
);
schema.pre('validate', function () {
  if (this.teamOneScore === this.teamTwoScore)
    this.invalidate('teamTwoScore', 'Scores cannot be tied');
});
export const MatchResult = model('MatchResult', schema);
