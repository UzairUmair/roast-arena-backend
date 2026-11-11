import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ideaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Idea', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

voteSchema.index({ userId: 1, ideaId: 1 }, { unique: true });
voteSchema.index({ ideaId: 1 });

export const Vote = mongoose.model('Vote', voteSchema);
