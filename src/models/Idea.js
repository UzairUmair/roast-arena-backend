import mongoose from 'mongoose';

const ideaSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    currentVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Version', default: null },
    currentVersionNumber: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

ideaSchema.index({ createdAt: -1 });

export const Idea = mongoose.model('Idea', ideaSchema);
