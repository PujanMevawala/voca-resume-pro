export async function healthRoutes(app) {
    app.get('/', async () => ({
        status: 'ok',
        services: {
            mongo: 'connected',
            redis: 'available',
            qdrant: 'available',
            minio: 'available',
        },
    }));
}
