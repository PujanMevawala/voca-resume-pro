/**
 * Markdown Sanitizer for TTS
 * Replicates utils/text_utils.py::normalize_for_tts logic
 */

/**
 * Normalize text for TTS by removing markdown formatting and special characters
 * @param {string} text - Input markdown text
 * @returns {string} - TTS-safe plain text
 */
export function normalizeForTTS(text) {
    if (!text) return '';

    let normalized = text;

    // Remove code blocks (```)
    normalized = normalized.replace(/```[\s\S]*?```/g, '');

    // Remove inline code (`)
    normalized = normalized.replace(/`[^`]+`/g, '');

    // Remove headings (# ## ###)
    normalized = normalized.replace(/^#{1,6}\s+/gm, '');

    // Convert bullet points to plain text
    normalized = normalized.replace(/^\s*[-*+]\s+/gm, '');
    normalized = normalized.replace(/^\s*\d+\.\s+/gm, '');

    // Remove bold/italic markers
    normalized = normalized.replace(/(\*\*|__)(.*?)\1/g, '$2');
    normalized = normalized.replace(/(\*|_)(.*?)\1/g, '$2');

    // Remove links [text](url)
    normalized = normalized.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    // Remove images ![alt](url)
    normalized = normalized.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');

    // Remove horizontal rules
    normalized = normalized.replace(/^---+$/gm, '');
    normalized = normalized.replace(/^\*\*\*+$/gm, '');

    // Remove blockquotes
    normalized = normalized.replace(/^>\s+/gm, '');

    // Remove HTML tags
    normalized = normalized.replace(/<[^>]+>/g, '');

    // Remove special characters that don't work well with TTS
    normalized = normalized.replace(/[#*_~`|\\]/g, '');

    // Collapse multiple whitespace to single space
    normalized = normalized.replace(/\s+/g, ' ');

    // Collapse multiple newlines to max 2
    normalized = normalized.replace(/\n{3,}/g, '\n\n');

    // Trim whitespace from lines
    normalized = normalized.split('\n').map(line => line.trim()).join('\n');

    // Remove empty lines
    normalized = normalized.replace(/^\s*\n/gm, '');

    // Final trim
    normalized = normalized.trim();

    return normalized;
}

/**
 * Convert analysis object to markdown string
 */
export function analysisToMarkdown(analysis) {
    let md = '';

    if (analysis.summaryInsights) {
        md += `Summary: ${analysis.summaryInsights}\n\n`;
    }

    if (analysis.strengths && analysis.strengths.length > 0) {
        md += 'Strengths:\n';
        analysis.strengths.forEach(s => md += `- ${s}\n`);
        md += '\n';
    }

    if (analysis.weaknesses && analysis.weaknesses.length > 0) {
        md += 'Weaknesses:\n';
        analysis.weaknesses.forEach(w => md += `- ${w}\n`);
        md += '\n';
    }

    if (analysis.atsImprovements && analysis.atsImprovements.length > 0) {
        md += 'ATS Improvements:\n';
        analysis.atsImprovements.forEach(a => md += `- ${a}\n`);
        md += '\n';
    }

    return md;
}

/**
 * Sanitize and prepare text for TTS
 * Main entry point combining all normalization steps
 */
export function prepareForTTS(text) {
    // First normalize markdown
    let clean = normalizeForTTS(text);

    // Additional TTS-specific cleanup
    // Replace common abbreviations for better pronunciation
    clean = clean.replace(/\bDr\./g, 'Doctor');
    clean = clean.replace(/\bMr\./g, 'Mister');
    clean = clean.replace(/\bMrs\./g, 'Missus');
    clean = clean.replace(/\bMs\./g, 'Miss');
    clean = clean.replace(/\bvs\./g, 'versus');
    clean = clean.replace(/\betc\./g, 'et cetera');
    clean = clean.replace(/\be\.g\./g, 'for example');
    clean = clean.replace(/\bi\.e\./g, 'that is');

    // Handle numbers
    clean = clean.replace(/\$(\d+)/g, '$1 dollars');
    clean = clean.replace(/(\d+)%/g, '$1 percent');

    // Remove URLs
    clean = clean.replace(/https?:\/\/[^\s]+/g, '');

    // Remove email addresses
    clean = clean.replace(/\S+@\S+\.\S+/g, '');

    // Final cleanup
    clean = clean.replace(/\s+/g, ' ').trim();

    return clean;
}

/**
 * Chunk text for TTS (useful for long content)
 * @param {string} text - Input text
 * @param {number} maxLength - Maximum chunk length
 * @returns {string[]} - Array of chunks
 */
export function chunkForTTS(text, maxLength = 500) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxLength && currentChunk) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}
