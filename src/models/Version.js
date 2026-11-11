import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema(
  {
    ideaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Idea', required: true },
    versionNumber: { type: Number, required: true, min: 1 },
    problem: { type: String, required: true, trim: true, maxlength: 600 },
    solution: { type: String, required: true, trim: true, maxlength: 600 },
    customer: { type: String, required: true, trim: true, maxlength: 600 },
    roastLevel: { type: String, required: true, enum: ['mild', 'medium', 'spicy'] },
    evaluationStatus: { type: String, required: true, enum: ['pending', 'complete', 'partial', 'failed'], default: 'pending' },
  },
  { timestamps: true },
);

versionSchema.index({ ideaId: 1, versionNumber: 1 }, { unique: true });

export const Version = mongoose.model('Version', versionSchema);
