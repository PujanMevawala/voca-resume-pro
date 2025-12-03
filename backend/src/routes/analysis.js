import { Resume } from '../models/Resume.js';
import {
    analyzeResume,
    generateSuggestions,
    generateInterviewQuestions,
    calculateJobFitScore,
    generateScript,
    answerQuestion as llmAnswerQuestion,
    listModels,
} from '../services/llmService.js';
import { routeQuery, listTasks } from '../services/taskRouter.js';
import { analysisToMarkdown, prepareForTTS } from '../utils/textSanitizer.js';

export async function analysisRoutes(app) {
    const auth = async (req) => {
        try {
            await req.jwtVerify();
            return req.user;
        } catch {
            return null;
        }
    };

    /**
     * POST /api/analysis/full
     * Complete resume analysis with job description
     */
    app.post('/full', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });

        const { resumeId, jobDescription, model } = req.body || {};
        if (!resumeId) return reply.code(400).send({ error: 'resumeId required' });

        let resume = await Resume.findOne({ _id: resumeId, userId: user.userId || user.sub });
        if (!resume) return reply.code(404).send({ error: 'Resume not found' });

        // Wait for processing if status is 'processing' (max 30 seconds)
        if (resume.status === 'processing') {
            for (let i = 0; i < 30; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                resume = await Resume.findOne({ _id: resumeId, userId: user.userId || user.sub });
                if (resume.status === 'ready' && resume.text) break;
            }
        }

        if (!resume.text) {
            return reply.code(400).send({
                error: 'Resume not processed yet',
                status: resume.status
            });
        }

        try {
            // Ensure resume text is a string
            const resumeText = String(resume.text || '');
            const jobDesc = jobDescription ? String(jobDescription) : undefined;

            // Run all analyses in parallel
            const [analysis, suggestions, interviewQuestions, jobFitScore] = await Promise.all([
                analyzeResume({ resumeText, jobDescription: jobDesc, model }),
                generateSuggestions({ resumeText, jobDescription: jobDesc, model }),
                generateInterviewQuestions({ resumeText, jobDescription: jobDesc, model }),
                calculateJobFitScore({ resumeText, jobDescription: jobDesc, model }),
            ]);

            // Update resume with results
            resume.jobDescription = jobDescription;
            resume.analysis = analysis;
            resume.suggestions = suggestions;
            resume.interviewQuestions = interviewQuestions;
            resume.jobFitScore = jobFitScore;

            // Generate script for TTS
            const analysisMarkdown = analysisToMarkdown(analysis);
            const script = await generateScript({ analysisMarkdown, model });
            resume.script = prepareForTTS(script);

            await resume.save();

            return {
                resumeId: resume._id,
                analysis,
                suggestions,
                interviewQuestions,
                jobFitScore,
                script: resume.script,
            };
        } catch (error) {
            app.log.error(error);
            return reply.code(500).send({ error: 'Analysis failed', message: error.message });
        }
    });

    /**
     * POST /api/analysis/strengths-weaknesses
     * Get only strengths and weaknesses
     */
    app.post('/strengths-weaknesses', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });

        const { resumeId, jobDescription, model } = req.body || {};
        if (!resumeId) return reply.code(400).send({ error: 'resumeId required' });

        const resume = await Resume.findOne({ _id: resumeId, userId: user.userId || user.sub });
        if (!resume) return reply.code(404).send({ error: 'Resume not found' });

        // Return cached if available
        if (resume.analysis && !jobDescription) {
            return {
                strengths: resume.analysis.strengths,
                weaknesses: resume.analysis.weaknesses,
            };
        }

        try {
            const analysis = await analyzeResume({ resumeText: resume.text, jobDescription, model });
            resume.analysis = analysis;
            resume.jobDescription = jobDescription;
            await resume.save();

            return {
                strengths: analysis.strengths,
                weaknesses: analysis.weaknesses,
            };
        } catch (error) {
            app.log.error(error);
            return reply.code(500).send({ error: 'Analysis failed', message: error.message });
        }
    });

    /**
     * POST /api/analysis/suggestions
     * Get actionable suggestions
     */
    app.post('/suggestions', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });

        const { resumeId, jobDescription, model } = req.body || {};
        if (!resumeId) return reply.code(400).send({ error: 'resumeId required' });

        const resume = await Resume.findOne({ _id: resumeId, userId: user.userId || user.sub });
        if (!resume) return reply.code(404).send({ error: 'Resume not found' });

        if (resume.suggestions && !jobDescription) {
            return resume.suggestions;
        }

        try {
            const suggestions = await generateSuggestions({ resumeText: resume.text, jobDescription, model });
            resume.suggestions = suggestions;
            resume.jobDescription = jobDescription;
            await resume.save();

            return suggestions;
        } catch (error) {
            app.log.error(error);
            return reply.code(500).send({ error: 'Suggestions failed', message: error.message });
        }
    });

    /**
     * POST /api/analysis/interview-questions
     * Generate interview questions
     */
    app.post('/interview-questions', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });

        const { resumeId, jobDescription, model } = req.body || {};
        if (!resumeId) return reply.code(400).send({ error: 'resumeId required' });

        const resume = await Resume.findOne({ _id: resumeId, userId: user.userId || user.sub });
        if (!resume) return reply.code(404).send({ error: 'Resume not found' });

        if (resume.interviewQuestions && resume.interviewQuestions.length > 0 && !jobDescription) {
            return { questions: resume.interviewQuestions };
        }

        try {
            const questions = await generateInterviewQuestions({ resumeText: resume.text, jobDescription, model });
            resume.interviewQuestions = questions;
            resume.jobDescription = jobDescription;
            await resume.save();

            return { questions };
        } catch (error) {
            app.log.error(error);
            return reply.code(500).send({ error: 'Interview questions failed', message: error.message });
        }
    });

    /**
     * POST /api/analysis/job-fit-score
     * Calculate job fit score
     */
    app.post('/job-fit-score', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });

        const { resumeId, jobDescription, model } = req.body || {};
        if (!resumeId) return reply.code(400).send({ error: 'resumeId required' });
        if (!jobDescription) return reply.code(400).send({ error: 'jobDescription required' });

        const resume = await Resume.findOne({ _id: resumeId, userId: user.userId || user.sub });
        if (!resume) return reply.code(404).send({ error: 'Resume not found' });

        try {
            const jobFitScore = await calculateJobFitScore({ resumeText: resume.text, jobDescription, model });
            resume.jobFitScore = jobFitScore;
            resume.jobDescription = jobDescription;
            await resume.save();

            return jobFitScore;
        } catch (error) {
            app.log.error(error);
            return reply.code(500).send({ error: 'Job fit score failed', message: error.message });
        }
    });

    /**
     * POST /api/analysis/script
     * Generate TTS-ready script
     */
    app.post('/script', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });

        const { resumeId, model } = req.body || {};
        if (!resumeId) return reply.code(400).send({ error: 'resumeId required' });

        const resume = await Resume.findOne({ _id: resumeId, userId: user.userId || user.sub });
        if (!resume) return reply.code(404).send({ error: 'Resume not found' });

        if (resume.script) {
            return { script: resume.script };
        }

        try {
            // Generate analysis if not exists
            if (!resume.analysis) {
                const analysis = await analyzeResume({ resumeText: resume.text, model });
                resume.analysis = analysis;
            }

            const analysisMarkdown = analysisToMarkdown(resume.analysis);
            const script = await generateScript({ analysisMarkdown, model });
            resume.script = prepareForTTS(script);
            await resume.save();

            return { script: resume.script };
        } catch (error) {
            app.log.error(error);
            return reply.code(500).send({ error: 'Script generation failed', message: error.message });
        }
    });

    /**
     * POST /api/analysis/smart-query
     * Route query to appropriate task
     */
    app.post('/smart-query', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });

        const { resumeId, query, model } = req.body || {};
        if (!resumeId || !query) return reply.code(400).send({ error: 'resumeId and query required' });

        const resume = await Resume.findOne({ _id: resumeId, userId: user.userId || user.sub });
        if (!resume) return reply.code(404).send({ error: 'Resume not found' });

        try {
            // Route query to task
            const route = await routeQuery(query);

            let result = { taskId: route.taskId, taskName: route.taskName, confidence: route.confidence };

            // Execute task based on routing
            switch (route.taskId) {
                case 'resume_analysis':
                    result.data = await analyzeResume({ resumeText: resume.text, jobDescription: resume.jobDescription, model });
                    break;
                case 'suggestions':
                    result.data = await generateSuggestions({ resumeText: resume.text, jobDescription: resume.jobDescription, model });
                    break;
                case 'interview_questions':
                    result.data = await generateInterviewQuestions({ resumeText: resume.text, jobDescription: resume.jobDescription, model });
                    break;
                case 'job_fit_score':
                    result.data = await calculateJobFitScore({ resumeText: resume.text, jobDescription: resume.jobDescription, model });
                    break;
                case 'generate_script':
                    const analysisMarkdown = analysisToMarkdown(resume.analysis || {});
                    result.data = { script: await generateScript({ analysisMarkdown, model }) };
                    break;
                case 'general_query':
                default:
                    result.data = { answer: await llmAnswerQuestion({ question: query, context: resume.text, model }) };
                    break;
            }

            return result;
        } catch (error) {
            app.log.error(error);
            return reply.code(500).send({ error: 'Smart query failed', message: error.message });
        }
    });

    /**
     * GET /api/analysis/providers
     * List available LLM providers/models
     */
    app.get('/providers', async (req, reply) => {
        try {
            const models = await listModels();
            return { providers: models || [] };
        } catch (error) {
            app.log.error('Failed to list providers:', error);
            return { providers: [] };
        }
    });

    /**
     * GET /api/analysis/models
     * List available LLM models
     */
    app.get('/models', async (req, reply) => {
        return { models: listProviders() };
    });

    /**
     * GET /api/analysis/tasks
     * List available tasks for routing
     */
    app.get('/tasks', async (req, reply) => {
        return { tasks: listTasks() };
    });

    /**
     * POST /api/analysis/comprehensive
     * Comprehensive analysis with all features for new UI
     */
    app.post('/comprehensive', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });

        const { resumeId, jobDescription, model } = req.body || {};
        if (!resumeId || !jobDescription) {
            return reply.code(400).send({ error: 'resumeId and jobDescription required' });
        }

        let resume = await Resume.findOne({ _id: resumeId, userId: user.userId || user.sub });
        if (!resume) return reply.code(404).send({ error: 'Resume not found' });

        if (!resume.text) {
            return reply.code(400).send({ error: 'Resume not processed yet', status: resume.status });
        }

        try {
            const resumeText = String(resume.text || '');
            const jobDesc = String(jobDescription);

            // Run comprehensive analysis
            const analysis = await analyzeResume({ resumeText, jobDescription: jobDesc, model });
            const suggestions = await generateSuggestions({ resumeText, jobDescription: jobDesc, model });
            const interviewQuestions = await generateInterviewQuestions({ resumeText, jobDescription: jobDesc, model });
            const jobFitScore = await calculateJobFitScore({ resumeText, jobDescription: jobDesc, model });

            // Save to resume
            resume.jobDescription = jobDescription;
            resume.analysis = analysis;
            resume.suggestions = suggestions;
            resume.interviewQuestions = interviewQuestions;
            resume.jobFitScore = jobFitScore;
            await resume.save();

            return {
                success: true,
                analysis: {
                    strengths: analysis.strengths || [],
                    weaknesses: analysis.weaknesses || [],
                    suggestions: suggestions.actionableImprovements || suggestions.suggestions || [],
                    interviewQuestions: Array.isArray(interviewQuestions) ? interviewQuestions : (interviewQuestions.questions || []),
                    summaryInsights: analysis.summaryInsights || 'Analysis complete'
                },
                jobFitScore: jobFitScore
            };
        } catch (error) {
            app.log.error('Comprehensive analysis error:', error);
            return reply.code(500).send({ error: 'Analysis failed', message: error.message });
        }
    });

    /**
     * POST /api/analysis/generate-script
     * Generate TTS script from analysis
     */
    app.post('/generate-script', async (req, reply) => {
        const user = await auth(req);
        if (!user) return reply.code(401).send({ error: 'Unauthorized' });

        const { analysis, jobFitScore, model } = req.body || {};
        if (!analysis) return reply.code(400).send({ error: 'analysis required' });

        try {
            // Create markdown from analysis
            let markdown = '# Analysis Summary\n\n';

            if (analysis.summaryInsights) {
                markdown += `${analysis.summaryInsights}\n\n`;
            }

            if (jobFitScore) {
                markdown += `## Job Fit Score: ${jobFitScore.score}%\n\n${jobFitScore.explanation}\n\n`;
            }

            if (analysis.strengths && analysis.strengths.length > 0) {
                markdown += '## Key Strengths\n\n';
                analysis.strengths.forEach(s => markdown += `- ${s}\n`);
                markdown += '\n';
            }

            if (analysis.weaknesses && analysis.weaknesses.length > 0) {
                markdown += '## Areas for Improvement\n\n';
                analysis.weaknesses.forEach(w => markdown += `- ${w}\n`);
                markdown += '\n';
            }

            const script = await generateScript({ analysisMarkdown: markdown, model });
            const ttsScript = prepareForTTS(script);

            return { success: true, script: ttsScript };
        } catch (error) {
            app.log.error('Script generation error:', error);
            return reply.code(500).send({ error: 'Script generation failed', message: error.message });
        }
    });
}
