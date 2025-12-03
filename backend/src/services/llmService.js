import axios from 'axios';
import IORedis from 'ioredis';

const redis = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const LLM_URL = process.env.LLM_URL || 'http://localhost:11435';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

/**
 * Call LLM (Groq for open-source models, Gemini, or local Ollama) with caching
 * Includes automatic retry with exponential backoff for rate limits
 */
async function callLLM({ prompt, systemPrompt, model = 'llama-3.3-70b-versatile', temperature = 0.3, cacheKey, retryCount = 0 }) {
    // Check cache
    if (cacheKey) {
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }
    }

    try {
        let text = '';

        if (model.startsWith('gemini')) {
            // Call Google Gemini API
            if (!GEMINI_API_KEY) {
                throw new Error('GEMINI_API_KEY not configured. Please set it in environment variables.');
            }

            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    contents: [{
                        parts: [{ text: systemPrompt + '\n\n' + prompt }]
                    }]
                },
                { timeout: 120000 }
            );

            if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error('Invalid response format from Gemini API');
            }

            text = response.data.candidates[0].content.parts[0].text;
        } else if (model.includes('llama') || model.includes('deepseek') || model.includes('qwen') || model.includes('mixtral')) {
            // Call Groq API for open-source models
            if (!GROQ_API_KEY) {
                throw new Error('GROQ_API_KEY not configured. Please set it in environment variables.');
            }

            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    temperature: temperature,
                    max_tokens: 2000
                },
                {
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 120000
                }
            );

            if (!response.data?.choices?.[0]?.message?.content) {
                throw new Error('Invalid response format from Groq API');
            }

            text = response.data.choices[0].message.content;
        } else {
            // Call local Ollama
            const response = await axios.post(`${LLM_URL}/generate`, {
                model,
                prompt: `${systemPrompt}\n\n${prompt}`,
                temperature,
                stream: false,
            }, {
                timeout: 120000,
            });
            text = response.data.response || response.data.text || '';
        }

        // Cache for 1 hour
        if (cacheKey && text) {
            await redis.setex(cacheKey, 3600, JSON.stringify(text));
        }

        return text;
    } catch (err) {
        // Handle rate limiting with exponential backoff retry
        if (err.response?.status === 429 && retryCount < 3) {
            const retryAfter = err.response.data?.error?.message?.match(/try again in ([\d.]+)s/)?.[1];
            const waitTime = retryAfter ? parseFloat(retryAfter) * 1000 : Math.pow(2, retryCount) * 1000;

            console.warn(`[${model}] Rate limit hit (attempt ${retryCount + 1}/3). Retrying in ${(waitTime / 1000).toFixed(2)}s...`);

            await new Promise(resolve => setTimeout(resolve, waitTime));

            // Retry with incremented count
            return callLLM({ prompt, systemPrompt, model, temperature, cacheKey, retryCount: retryCount + 1 });
        }

        console.error(`[${model}] LLM call error:`, err.message);
        if (err.response) {
            console.error('Error status:', err.response.status);
            console.error('Error response:', JSON.stringify(err.response.data).slice(0, 500));
        }
        throw new Error(`LLM service error for ${model}: ${err.message}`);
    }
}

/**
 * 1️⃣ Resume Analysis: Strengths, Weaknesses, ATS improvements, Summary insights
 */
export async function analyzeResume({ resumeText, jobDescription, model = 'llama-3.3-70b-versatile' }) {
    // Ensure inputs are strings
    const textStr = String(resumeText || '');
    const jobStr = String(jobDescription || '');

    // No caching - generate varied responses each time
    const cacheKey = null;

    const prompt = `As an expert career counselor and ATS specialist, perform a comprehensive resume analysis${jobStr ? ' tailored to this specific job opportunity' : ''}.

⚠️ IMPORTANT: Provide fresh, diverse insights each time. Analyze from different perspectives to ensure variety.

**RESUME:**
${textStr}

${jobStr ? `**TARGET JOB DESCRIPTION:**\n${jobStr}\n` : ''}

Provide a detailed, professional analysis focusing on:

1. **Strengths** (4-6 specific, concrete strengths with examples):
   - Technical skills and expertise
   - Achievements and measurable results
   - Relevant experience and qualifications
   - Unique value propositions
   ${jobStr ? '- Job-specific fit and alignment' : ''}

2. **Weaknesses** (4-6 honest, constructive areas for improvement):
   - Missing keywords or skills
   - Gaps in experience or qualifications
   - Formatting or presentation issues
   - Quantification opportunities
   ${jobStr ? '- Misalignments with job requirements' : ''}

3. **ATS Improvements** (5-7 actionable ATS optimization recommendations):
   - Keyword optimization strategies
   - Format and structure improvements
   - Section organization suggestions
   - Skill highlighting techniques
   - Quantification examples

4. **Summary Insights** (3-4 sentences professional assessment):
   - Overall resume quality and competitiveness
   - Career level and positioning
   ${jobStr ? '- Job match probability and readiness' : '- General market readiness'}
   - Key recommendations summary

Return ONLY valid JSON with no markdown formatting:
{
  "strengths": ["...", "...", "..."],
  "weaknesses": ["...", "...", "..."],
  "atsImprovements": ["...", "...", "..."],
  "summaryInsights": "..."
}`;

    const systemPrompt = `You are a senior career counselor with 15+ years of experience in resume optimization and ATS systems. Provide specific, actionable, and honest feedback. Focus on concrete improvements rather than generic advice. Return ONLY valid JSON without any markdown code blocks or additional text.`;

    const response = await callLLM({ prompt, systemPrompt, model, temperature: 0.6, cacheKey });

    try {
        // Extract JSON from response - handle markdown code blocks
        let jsonText = response.trim();

        // Remove markdown code blocks if present  
        jsonText = jsonText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

        // Find the JSON object - try multiple patterns
        let jsonMatch = jsonText.match(/\{[\s\S]*\}/);

        // If no match, try to find JSON array or object at start
        if (!jsonMatch && (jsonText.startsWith('{') || jsonText.startsWith('['))) {
            jsonMatch = [jsonText];
        }

        if (jsonMatch) {
            // Try parsing directly first
            let parsed;
            try {
                parsed = JSON.parse(jsonMatch[0]);
            } catch (firstError) {
                // If parsing fails, try fixing control characters in string values
                // Match string values and escape unescaped control chars within them
                let fixed = jsonMatch[0].replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
                    return match
                        .replace(/\n/g, '\\n')
                        .replace(/\r/g, '\\r')
                        .replace(/\t/g, '\\t');
                });
                parsed = JSON.parse(fixed);
            }

            // Validate required fields
            if (parsed.strengths && parsed.weaknesses && parsed.atsImprovements && parsed.summaryInsights) {
                // Normalize arrays: convert objects to strings if needed
                const normalize = (arr) => arr.map(item => typeof item === 'string' ? item : JSON.stringify(item));

                return {
                    strengths: normalize(parsed.strengths),
                    weaknesses: normalize(parsed.weaknesses),
                    atsImprovements: normalize(parsed.atsImprovements),
                    summaryInsights: String(parsed.summaryInsights)
                };
            }
        }
    } catch (e) {
        console.error(`[${model}] Failed to parse analysis JSON:`, e.message);
        console.error('Raw response:', response.slice(0, 500));
    }

    // Fallback parsing - try to extract content
    return {
        strengths: ['Strong technical skills', 'Good project experience', 'Clear communication', 'Relevant qualifications'],
        weaknesses: ['Limited quantifiable achievements', 'Could expand on leadership', 'Missing industry keywords', 'Formatting improvements needed'],
        atsImprovements: ['Add more job-specific keywords', 'Quantify all achievements with metrics', 'Use standard section headings', 'Include skills section', 'Remove graphics and tables'],
        summaryInsights: response.slice(0, 300) || 'Resume shows solid foundation but needs optimization for ATS systems and better alignment with target roles.',
    };
}

/**
 * 2️⃣ Suggestions Module: Actionable improvements, tone enhancement, ATS guidance
 */
export async function generateSuggestions({ resumeText, jobDescription, model = 'llama-3.3-70b-versatile' }) {
    // Ensure resumeText is a string
    const textStr = String(resumeText || '');
    const jobStr = String(jobDescription || '');
    const cacheKey = null; // No caching for varied suggestions

    const prompt = `As a professional resume writer and career strategist, provide detailed, specific suggestions to enhance this resume${jobStr ? ' for the target position' : ''}.

⚠️ IMPORTANT: Generate fresh, creative suggestions each time. Focus on different improvement areas to ensure variety.

**RESUME:**
${textStr}

${jobStr ? `**TARGET JOB:**\n${jobStr}\n` : ''}

Provide comprehensive, actionable recommendations:

1. **Actionable Improvements** (6-8 specific, implementable changes):
   - Content enhancements (what to add/expand)
   - Structure and organization improvements
   - Keyword integration strategies
   - Achievement quantification examples
   - Section-by-section recommendations
   ${jobStr ? '- Job-specific tailoring suggestions' : ''}

2. **Tone Enhancements** (4-6 ways to improve professional tone):
   - Active vs passive voice improvements
   - Power word replacements
   - Clarity and conciseness tips
   - Professional language upgrades
   - Impact statement examples

3. **ATS Guidance** (5-7 ATS-specific optimization strategies):
   - Format and layout recommendations
   - Keyword density and placement
   - Section heading standards
   - File format best practices
   - Common ATS pitfalls to avoid

Provide specific examples and before/after suggestions where possible.

Return ONLY valid JSON:
{
  "actionableImprovements": ["...", "...", "..."],
  "toneEnhancements": ["...", "...", "..."],
  "atsGuidance": ["...", "...", "..."]
}`;

    const systemPrompt = 'You are a certified professional resume writer (CPRW) with expertise in ATS optimization. Provide specific, implementable advice with concrete examples. Avoid generic suggestions. Return ONLY valid JSON.';

    const response = await callLLM({ prompt, systemPrompt, model, temperature: 0.6, cacheKey });

    try {
        let jsonText = response.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        let jsonMatch = jsonText.match(/\{[\s\S]*\}/);

        if (!jsonMatch && (jsonText.startsWith('{') || jsonText.startsWith('['))) {
            jsonMatch = [jsonText];
        }

        if (jsonMatch) {
            let parsed;
            try {
                parsed = JSON.parse(jsonMatch[0]);
            } catch (firstError) {
                // Fix control characters in string values
                let fixed = jsonMatch[0].replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
                    return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
                });
                parsed = JSON.parse(fixed);
            }
            if (parsed.actionableImprovements && parsed.toneEnhancements && parsed.atsGuidance) {
                // Normalize: convert objects to strings if needed (Gemini sometimes returns objects)
                const normalize = (arr) => arr.map(item => {
                    if (typeof item === 'string') return item;
                    if (typeof item === 'object') {
                        // Extract main content from object structure
                        if (item.recommendation) {
                            return item.before && item.after
                                ? `${item.recommendation} Example: "${item.before}" → "${item.after}"`
                                : item.recommendation;
                        }
                        return JSON.stringify(item);
                    }
                    return String(item);
                });

                return {
                    actionableImprovements: normalize(parsed.actionableImprovements),
                    toneEnhancements: normalize(parsed.toneEnhancements),
                    atsGuidance: normalize(parsed.atsGuidance)
                };
            }
        }
    } catch (e) {
        console.error(`[${model}] Failed to parse suggestions JSON:`, e.message);
        console.error('Raw response:', response.slice(0, 500));
    }

    return {
        actionableImprovements: [
            'Add quantifiable metrics to achievements (e.g., "Increased sales by 35%")',
            'Include job-specific keywords from the description throughout resume',
            'Expand technical skills section with proficiency levels',
            'Add a professional summary at the top highlighting key qualifications',
            'Include 2-3 bullet points per role describing impact and results',
            'Remove generic phrases like "responsible for" and use action verbs'
        ],
        toneEnhancements: [
            'Replace passive voice with active voice (e.g., "Led" instead of "Was responsible for")',
            'Use power verbs: Spearheaded, Orchestrated, Optimized, Championed',
            'Make statements more concise - aim for 1-2 lines per bullet',
            'Add industry-specific terminology and technical jargon'
        ],
        atsGuidance: [
            'Use standard section headings: Professional Summary, Experience, Education, Skills',
            'Save as .docx or PDF format (check job posting requirements)',
            'Avoid headers/footers, text boxes, tables, and images',
            'Use standard fonts (Arial, Calibri, Times New Roman) 10-12pt',
            'Include both acronyms and full terms (e.g., "Search Engine Optimization (SEO)")'
        ],
    };
}

/**
 * 3️⃣ Interview Questions: 5-7 diverse interview questions with hints
 */
export async function generateInterviewQuestions({ resumeText, jobDescription, model = 'llama-3.3-70b-versatile' }) {
    // Ensure inputs are strings
    const textStr = String(resumeText || '');
    const jobStr = String(jobDescription || '');
    const cacheKey = null; // No caching - generate different questions each time

    const prompt = `As an experienced technical hiring manager, create comprehensive interview preparation questions based on this candidate's resume${jobStr ? ' and the target job requirements' : ''}.

⚠️ CRITICAL: Generate completely NEW and DIFFERENT interview questions each time. Vary focus areas, difficulty levels, and question styles while staying relevant.

**CANDIDATE RESUME:**
${textStr}

${jobStr ? `**TARGET POSITION:**\n${jobStr}\n` : ''}

Generate 6-7 diverse, realistic interview questions that:
- Cover technical skills, experience, and behavioral aspects
- Are directly relevant to the resume and${jobStr ? ' job requirements' : ' career level'}
- Range from easy to challenging
- Include both specific and general questions
- Test problem-solving, leadership, and cultural fit

For each question provide:
1. The interview question (clear and specific)
2. A brief hint about what the interviewer is looking for
3. Question type (technical, behavioral, or situational)

Return ONLY valid JSON array:
[
  {
    "question": "Clear, specific interview question",
    "hint": "What the interviewer wants to assess or hear",
    "type": "technical" or "behavioral" or "situational"
  }
]

Make questions realistic and tailored to the specific resume and role.`;

    const systemPrompt = 'You are a senior technical hiring manager with 10+ years of interview experience. Create realistic, insightful questions that assess both technical competency and cultural fit. Avoid generic questions. Return ONLY valid JSON array.';

    const response = await callLLM({ prompt, systemPrompt, model, temperature: 0.6, cacheKey });

    try {
        let jsonText = response.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        let jsonMatch = jsonText.match(/\[[\s\S]*\]/);

        if (!jsonMatch && jsonText.startsWith('[')) {
            jsonMatch = [jsonText];
        }

        if (jsonMatch) {
            let questions;
            try {
                questions = JSON.parse(jsonMatch[0]);
            } catch (firstError) {
                // Fix control characters in string values
                let fixed = jsonMatch[0].replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
                    return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
                });
                questions = JSON.parse(fixed);
            }
            // Ensure we have 5-7 questions with required fields
            const validQuestions = questions.filter(q => q.question && q.hint && q.type).slice(0, 7);
            if (validQuestions.length >= 5) {
                return validQuestions;
            }
        }
    } catch (e) {
        console.error(`[${model}] Failed to parse interview questions JSON:`, e.message);
        console.error('Raw response:', response.slice(0, 500));
    }

    // Enhanced fallback questions
    return [
        {
            question: 'Walk me through your most technically challenging project. What obstacles did you face and how did you overcome them?',
            hint: 'Looking for problem-solving skills, technical depth, and resilience',
            type: 'technical'
        },
        {
            question: 'Describe a time when you had to learn a new technology quickly. How did you approach it?',
            hint: 'Assessing learning agility and self-motivation',
            type: 'behavioral'
        },
        {
            question: 'How do you prioritize tasks when working on multiple projects with competing deadlines?',
            hint: 'Evaluating time management and decision-making',
            type: 'behavioral'
        },
        {
            question: 'Tell me about a technical decision you made that you later regretted. What did you learn?',
            hint: 'Looking for self-awareness, humility, and growth mindset',
            type: 'behavioral'
        },
        {
            question: 'Explain a complex technical concept from your experience to someone non-technical.',
            hint: 'Testing communication skills and technical understanding',
            type: 'technical'
        },
        {
            question: 'Describe how you handle code reviews and feedback from peers or seniors.',
            hint: 'Assessing teamwork, receptiveness to feedback, and ego management',
            type: 'behavioral'
        },
    ];
}

/**
 * 4️⃣ Job Fit Score: Comprehensive match analysis with skills breakdown
 */
export async function calculateJobFitScore({ resumeText, jobDescription, model = 'llama-3.3-70b-versatile' }) {
    if (!jobDescription) {
        return {
            score: null,
            explanation: 'No job description provided for scoring.',
            matchedSkills: [],
            missingSkills: [],
        };
    }

    // Ensure inputs are strings
    const textStr = String(resumeText || '');
    const jobStr = String(jobDescription || '');

    // Time-based cache (5-minute buckets) allows varied skill highlighting while maintaining consistency
    const timestamp = Math.floor(Date.now() / (60 * 60 * 1000));
    const cacheKey = `jobfit:${model}:${timestamp}:${Buffer.from(textStr + jobStr).toString('base64').slice(0, 20)}`;

    const prompt = `As an ATS system and senior recruiter, perform a comprehensive job-resume match analysis.

⚠️ NOTE: While maintaining score accuracy, highlight different matched/missing skills each time for comprehensive coverage.

**CANDIDATE RESUME:**
${textStr}

**JOB REQUIREMENTS:**
${jobStr}

Analyze the match comprehensively:

1. **Match Score** (0-100):
   - 90-100: Exceptional match, immediate interview
   - 75-89: Strong match, highly qualified
   - 60-74: Good match, meets most requirements
   - 45-59: Moderate match, gaps exist
   - 0-44: Weak match, significant gaps

2. **Matched Skills**: List 5-10 specific skills/qualifications from the resume that align with job requirements

3. **Missing Skills**: List 3-7 key skills/requirements from the job that are missing or weak in the resume

4. **Explanation**: Provide 3-4 sentences explaining:
   - Overall match quality and why
   - Key strengths for this role
   - Main gaps or concerns
   - Recommendation (strong fit, good fit, marginal fit, poor fit)

Return ONLY valid JSON:
{
  "score": 0-100,
  "explanation": "Detailed 3-4 sentence assessment...",
  "matchedSkills": ["skill1", "skill2", ...],
  "missingSkills": ["skill1", "skill2", ...]
}`;

    const systemPrompt = 'You are a senior ATS system with AI-powered matching algorithms. Be objective, specific, and fair. Consider both hard and soft skills. Return ONLY valid JSON.';

    const response = await callLLM({ prompt, systemPrompt, model, temperature: 0.5, cacheKey });

    try {
        let jsonText = response.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        let jsonMatch = jsonText.match(/\{[\s\S]*\}/);

        if (!jsonMatch && jsonText.startsWith('{')) {
            jsonMatch = [jsonText];
        }

        if (jsonMatch) {
            let parsed;
            try {
                parsed = JSON.parse(jsonMatch[0]);
            } catch (firstError) {
                // Fix control characters in string values
                let fixed = jsonMatch[0].replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
                    return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
                });
                parsed = JSON.parse(fixed);
            }
            if (parsed.score !== undefined && parsed.explanation && parsed.matchedSkills && parsed.missingSkills) {
                // Normalize arrays: convert objects to strings if needed
                const normalize = (arr) => arr.map(item => typeof item === 'string' ? item : JSON.stringify(item));

                return {
                    score: Number(parsed.score),
                    explanation: String(parsed.explanation),
                    matchedSkills: normalize(parsed.matchedSkills),
                    missingSkills: normalize(parsed.missingSkills)
                };
            }
        }
    } catch (e) {
        console.error(`[${model}] Failed to parse job fit JSON:`, e.message);
        console.error('Raw response:', response.slice(0, 500));
    }

    return {
        score: 65,
        explanation: 'Moderate fit. Resume shows relevant experience but lacks some key technical requirements. Recommend reviewing specific skill gaps before applying.',
        matchedSkills: ['Problem solving', 'Team collaboration', 'Project management'],
        missingSkills: ['Specific technical certifications', 'Required years of experience', 'Industry-specific tools'],
    };
}

/**
 * 5️⃣ Script Planner: Generate conversational TTS script from analysis
 */
export async function generateScript({ analysisMarkdown, model = 'llama-3.3-70b-versatile' }) {
    // Ensure input is a string
    const markdownStr = String(analysisMarkdown || '');
    const cacheKey = null; // No caching for varied scripts

    const prompt = `Convert this resume analysis into a short, conversational script suitable for text-to-speech:

**Analysis:**
${markdownStr}

⚠️ IMPORTANT: Create a fresh, engaging script each time. Vary the emphasis, phrasing, and flow while covering the key points.

Create a 30-60 second spoken summary that:
- Flows naturally when read aloud
- Highlights key insights (focus on different aspects each time)
- Uses conversational tone
- Avoids markdown formatting
- Is TTS-friendly (no special characters)

Output plain text only, no formatting.`;

    const systemPrompt = 'You are a professional voice script writer. Create natural, spoken content with varied emphasis and phrasing.';

    const response = await callLLM({ prompt, systemPrompt, model, temperature: 0.6, cacheKey });

    return response;
}

/**
 * General Q&A (existing functionality)
 */
export async function answerQuestion({ question, context, model = 'llama-3.3-70b-versatile' }) {
    // Ensure inputs are strings
    const questionStr = String(question || '');
    const contextStr = String(context || '');
    const cacheKey = `qa:${Buffer.from(questionStr + contextStr).toString('base64').slice(0, 32)}`;

    const prompt = `Answer this question about the resume:

**Context:**
${contextStr}

**Question:** ${questionStr}

Provide a clear, concise answer based only on the context. If unknown, say so.`;

    const systemPrompt = 'You answer questions using only provided context.';

    return await callLLM({ prompt, systemPrompt, model, temperature: 0.2, cacheKey });
}

/**
 * Generate a professional resume summary using LLM
 */
export async function generateResumeSummary({ resumeText, model = 'llama-3.3-70b-versatile' }) {
    // Ensure input is a string
    const textStr = String(resumeText || '');
    const cacheKey = `summary:${Buffer.from(textStr).toString('base64').slice(0, 32)}`;

    const prompt = `Create a concise, professional  summary of this resume:

**Resume:**
${textStr}

Focus on:
- Key experience and expertise
- Primary skills and technologies
- Career level and achievements

Provide a natural, engaging summary that could be used as a LinkedIn headline or resume objective.`;

    const systemPrompt = 'You are a professional resume writer. Create compelling, concise summaries.';

    return await callLLM({ prompt, systemPrompt, model, temperature: 0.5, cacheKey });
}

/**
 * Chat completion with context (for RAG chat)
 */
export async function chatWithContext({ messages, context = '', model = 'llama-3.3-70b-versatile', temperature = 0.7 }) {
    try {
        let systemPrompt = 'You are a helpful AI assistant. Answer questions accurately and concisely.';

        if (context) {
            systemPrompt = `You are a helpful AI assistant. Use the following context from the user's documents to answer questions accurately. If the context doesn't contain relevant information, say so and provide a general answer.\n\nContext:\n${context}`;
        }

        // Build messages array
        const allMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content }))
        ];

        let text = '';

        if (model.startsWith('gemini')) {
            // Gemini API - convert messages to single prompt
            if (!GEMINI_API_KEY) {
                throw new Error('GEMINI_API_KEY not configured. Please set it in environment variables.');
            }

            const conversationText = allMessages.map(m => {
                if (m.role === 'system') return m.content;
                return `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`;
            }).join('\n\n');

            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                {
                    contents: [{
                        parts: [{ text: conversationText }]
                    }]
                },
                { timeout: 60000 }
            );

            if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error('Invalid response format from Gemini API');
            }

            text = response.data.candidates[0].content.parts[0].text;
        } else if (model.includes('llama') || model.includes('deepseek') || model.includes('qwen') || model.includes('mixtral')) {
            // Groq API
            if (!GROQ_API_KEY) {
                throw new Error('GROQ_API_KEY not configured. Please set it in environment variables.');
            }

            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: model,
                    messages: allMessages,
                    temperature: temperature,
                    max_tokens: 1500
                },
                {
                    headers: {
                        'Authorization': `Bearer ${GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000
                }
            );

            if (!response.data?.choices?.[0]?.message?.content) {
                throw new Error('Invalid response format from Groq API');
            }

            text = response.data.choices[0].message.content;
        } else {
            // Local Ollama
            const response = await axios.post(`${LLM_URL}/chat`, {
                model,
                messages: allMessages,
                temperature,
            }, { timeout: 60000 });
            text = response.data.message?.content || response.data.response || '';
        }

        return { response: text, model };
    } catch (err) {
        console.error(`[${model}] Chat LLM error:`, err.message);
        if (err.response) {
            console.error('Error status:', err.response.status);
            console.error('Error response:', JSON.stringify(err.response.data).slice(0, 500));
        }
        throw new Error(`Chat service error for ${model}: ${err.message}`);
    }
}

/**
 * List available Ollama models
 */
export async function listModels() {
    try {
        const response = await axios.get(`${LLM_URL}/models`);
        return response.data.models || [];
    } catch (err) {
        console.error('Failed to list models:', err.message);
        return [
            { name: 'llama3.1', description: 'Meta Llama 3.1 - General purpose' },
            { name: 'mistral', description: 'Mistral 7B - Fast and efficient' },
            { name: 'phi3', description: 'Microsoft Phi-3 - Compact model' },
            { name: 'qwen2', description: 'Qwen 2 - Multilingual support' },
        ];
    }
}
