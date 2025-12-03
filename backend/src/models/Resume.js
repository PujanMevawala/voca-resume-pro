import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        filename: String,
        storageObject: String,
        text: String,
        summary: String,
        embeddingId: String,
        status: { type: String, enum: ['uploaded', 'processing', 'ready', 'error'], default: 'uploaded' },
        error: String,

        // Extended analysis fields
        jobDescription: String,
        analysis: {
            strengths: [String],
            weaknesses: [String],
            atsImprovements: [String],
            summaryInsights: String,
        },
        suggestions: {
            actionableImprovements: [String],
            toneEnhancements: [String],
            atsGuidance: [String],
        },
        interviewQuestions: [{
            question: String,
            answer: String,
        }],
        jobFitScore: {
            score: Number,
            explanation: String,
        },
        script: String, // TTS-ready conversational script
    },
    { timestamps: true }
);

export const Resume = mongoose.model('Resume', resumeSchema);
