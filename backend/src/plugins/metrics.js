import client from 'prom-client';

export async function metricsPlugin(app) {
    const register = new client.Registry();
    client.collectDefaultMetrics({ register });
    app.get('/metrics', async (_, reply) => {
        reply.header('Content-Type', register.contentType);
        reply.send(await register.metrics());
    });
}
