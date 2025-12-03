/**
 * Text chunking utilities for embedding
 */

/**
 * Split text into chunks with overlap
 * @param {string} text - Text to chunk
 * @param {number} chunkSize - Size of each chunk in characters
 * @param {number} overlap - Overlap between chunks in characters
 * @returns {string[]} - Array of text chunks
 */
export function chunkText(text, chunkSize = 500, overlap = 50) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    // For very small texts, just return as single chunk
    if (text.length <= chunkSize) {
        return [text.trim()];
    }

    // Limit text size to prevent memory issues (max 100KB)
    const maxTextSize = 100000;
    if (text.length > maxTextSize) {
        text = text.slice(0, maxTextSize);
    }

    const chunks = [];
    let start = 0;
    const maxChunks = 50; // Reduced limit for performance

    while (start < text.length && chunks.length < maxChunks) {
        const end = Math.min(start + chunkSize, text.length);
        let chunk = text.slice(start, end);

        // Try to break at sentence boundary
        if (end < text.length) {
            const lastPeriod = chunk.lastIndexOf('. ');
            const lastNewline = chunk.lastIndexOf('\n');
            const breakPoint = Math.max(lastPeriod, lastNewline);

            if (breakPoint > chunkSize * 0.7) {
                chunk = chunk.slice(0, breakPoint + 1);
            }
        }

        const trimmedChunk = chunk.trim();
        if (trimmedChunk.length > 20) {
            chunks.push(trimmedChunk);
        }

        // Move forward by full chunk size
        start = end;

        // If we're at the end, break
        if (start >= text.length) {
            break;
        }
    }

    return chunks.length > 0 ? chunks : [text.trim()];
}

/**
 * Smart chunking based on paragraphs
 * @param {string} text - Text to chunk
 * @param {number} maxChunkSize - Maximum chunk size
 * @returns {string[]} - Array of text chunks
 */
export function chunkByParagraphs(text, maxChunkSize = 1000) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const chunks = [];
    let currentChunk = '';

    for (const para of paragraphs) {
        if (currentChunk.length + para.length > maxChunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = para;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks.filter(c => c.length > 20);
}

/**
 * Semantic chunking - tries to keep related content together
 * @param {string} text - Text to chunk
 * @param {number} targetSize - Target chunk size
 * @returns {string[]} - Array of text chunks
 */
export function semanticChunk(text, targetSize = 800) {
    if (!text || typeof text !== 'string') {
        return [];
    }

    // Split by major sections (double newline, headings, etc.)
    const sections = text.split(/(?:\n\n+|\n(?=[A-Z][^\n]{10,}:))/);
    const chunks = [];
    let currentChunk = '';

    for (const section of sections) {
        const trimmed = section.trim();
        if (!trimmed) continue;

        if (currentChunk.length + trimmed.length > targetSize * 1.2) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
            }
            // If section itself is too large, split it
            if (trimmed.length > targetSize * 1.5) {
                chunks.push(...chunkText(trimmed, targetSize, 100));
                currentChunk = '';
            } else {
                currentChunk = trimmed;
            }
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
        }
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks.filter(c => c.length > 20);
}

/**
 * Extract metadata from text
 * @param {string} text - Input text
 * @returns {object} - Metadata object
 */
export function extractMetadata(text) {
    if (!text || typeof text !== 'string') {
        return { wordCount: 0, charCount: 0, language: 'unknown' };
    }

    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    return {
        wordCount: words.length,
        charCount: text.length,
        sentenceCount: sentences.length,
        avgWordLength: words.reduce((sum, w) => sum + w.length, 0) / words.length || 0,
        language: detectLanguage(text),
    };
}

/**
 * Simple language detection
 * @param {string} text - Input text
 * @returns {string} - Language code
 */
function detectLanguage(text) {
    if (!text) return 'unknown';

    // Simple heuristic - check for common English words
    const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'for', 'on', 'with'];
    const lowerText = text.toLowerCase();
    const matches = englishWords.filter(word => lowerText.includes(` ${word} `)).length;

    return matches >= 3 ? 'en' : 'unknown';
}
