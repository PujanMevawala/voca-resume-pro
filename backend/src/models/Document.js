import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        type: {
            type: String,
            enum: ['resume', 'job_description', 'cover_letter', 'certificate', 'sop', 'other'],
            required: true
        },
        filename: { type: String, required: true },
        originalName: { type: String },
        storageObject: { type: String, required: true },
        mimeType: { type: String },
        fileSize: { type: Number },
        text: { type: String },
        chunks: [{ type: String }],
        embeddingIds: [{ type: String }],
        status: {
            type: String,
            enum: ['pending', 'processing', 'ready', 'error'],
            default: 'pending'
        },
        error: { type: String },
        metadata: {
            pageCount: Number,
            wordCount: Number,
            language: String,
        },
    },
    { timestamps: true }
);

documentSchema.index({ userId: 1, type: 1, status: 1 });

export const Document = mongoose.model('Document', documentSchema);
