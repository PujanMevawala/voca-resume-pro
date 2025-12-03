import mongoose from 'mongoose';

const jobAnalysisSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume' },
        documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
        jobDescription: { type: String, required: true },
        analysis: {
            keywords: [String],
            skillGaps: [String],
            atsScore: Number,
            coreCompetencies: [String],
            missingExperience: [String],
            recommendations: [String],
            tailoredAnswers: [{
                question: String,
                answer: String,
            }],
            improvementSuggestions: [String],
        },
        status: {
            type: String,
            enum: ['pending', 'analyzing', 'ready', 'error'],
            default: 'pending'
        },
        error: { type: String },
    },
    { timestamps: true }
);

jobAnalysisSchema.index({ userId: 1, createdAt: -1 });

export const JobAnalysis = mongoose.model('JobAnalysis', jobAnalysisSchema);
