import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema(
  {
    amountLakh: { type: Number, default: null },
    equityPercent: { type: Number, default: null },
  },
  { _id: false },
);

const reviewSchema = new mongoose.Schema(
  {
    versionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Version', required: true },
    investor: { type: String, required: true, enum: ['strict', 'funny', 'dreamer'] },
    status: { type: String, required: true, enum: ['done', 'unscored'] },
    score: { type: Number, default: null, min: 1, max: 10 },
    roast: { type: String, required: true, trim: true, maxlength: 400 },
    tip: { type: String, required: true, trim: true, maxlength: 200 },
    offer: { type: offerSchema, required: true },
    attempts: { type: Number, required: true, min: 1 },
    offerClamped: { type: Boolean, required: true, default: false },
    source: { type: String, required: true, enum: ['groq', 'mock', 'fallback'] },
    providerError: { type: String, default: null, maxlength: 300 },
  },
  { timestamps: true },
);

reviewSchema.index({ versionId: 1, investor: 1 }, { unique: true });

export const Review = mongoose.model('Review', reviewSchema);
