// Bypass transformers to avoid sharp dependency issues
// Return dummy embeddings for local development

const EMBEDDING_SIZE = 384; // Standard size for all-MiniLM-L6-v2

export async function embedText(text) {
    // Return a simple hash-based dummy embedding
    // This allows the app to run without the transformer model
    const embedding = new Array(EMBEDDING_SIZE).fill(0);

    // Simple hash for some variety (not cryptographic, just for routing)
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash = hash & hash;
    }

    // Spread the hash across the embedding
    for (let i = 0; i < EMBEDDING_SIZE; i++) {
        embedding[i] = Math.sin(hash + i) * 0.1;
    }

    return embedding;
}

export async function embeddingSize() {
    return EMBEDDING_SIZE;
}
