import mongoose from 'mongoose';

const transcriptSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        audioFile: { type: String, required: true },
        transcript: { type: String },
        summary: { type: String },
        chunks: [{ type: String }],
        embeddingIds: [{ type: String }],
        language: { type: String, default: 'en' },
        duration: { type: Number },
        status: {
            type: String,
            enum: ['pending', 'transcribing', 'summarizing', 'embedding', 'ready', 'error'],
            default: 'pending'
        },
        error: { type: String },
        metadata: {
            model: String,
            processingTime: Number,
        },
    },
    { timestamps: true }
);

transcriptSchema.index({ userId: 1, status: 1 });

export const Transcript = mongoose.model('Transcript', transcriptSchema);
