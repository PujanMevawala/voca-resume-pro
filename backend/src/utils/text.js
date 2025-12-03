export function simpleSummarize(text, maxSentences = 3) {
    if (!text) return '';
    const sentences = text
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean);
    return sentences.slice(0, maxSentences).join(' ');
}
