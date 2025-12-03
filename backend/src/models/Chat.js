import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        title: { type: String },
        messages: [{
            role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
            content: { type: String, required: true },
            timestamp: { type: Date, default: Date.now },
            metadata: {
                model: String,
                tokensUsed: Number,
                contextDocs: [String],
            },
        }],
        metadata: {
            lastModel: String,
            totalTokens: Number,
        },
    },
    { timestamps: true }
);

chatSchema.index({ userId: 1, updatedAt: -1 });

export const Chat = mongoose.model('Chat', chatSchema);
