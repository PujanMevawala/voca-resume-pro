const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

let isRefreshing = false;
let refreshPromise = null;

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    try {
        const res = await fetch(`${BASE}/api/user/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
            // Refresh token expired or invalid, force logout
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            throw new Error('Session expired');
        }

        const data = await res.json();
        if (data.success) {
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            return data.accessToken;
        }
        throw new Error('Token refresh failed');
    } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        throw err;
    }
}

async function req(path, opts = {}, token) {
    const res = await fetch(`${BASE}${path}`, {
        ...opts,
        headers: {
            ...(opts.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    // Handle 401 Unauthorized - try to refresh token
    if (res.status === 401 && token && !path.includes('/api/user/')) {
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = refreshAccessToken()
                .finally(() => {
                    isRefreshing = false;
                    refreshPromise = null;
                });
        }

        try {
            const newToken = await refreshPromise;
            // Update token in opts if present
            const newOpts = {
                ...opts,
                headers: {
                    ...(opts.headers || {}),
                    Authorization: `Bearer ${newToken}`,
                },
            };
            // Retry original request with new token
            const retryRes = await fetch(`${BASE}${path}`, newOpts);
            if (!retryRes.ok) throw new Error(`${retryRes.status} ${await retryRes.text()}`);
            const ct = retryRes.headers.get('content-type') || '';
            if (ct.includes('application/json')) return retryRes.json();
            return retryRes.blob();
        } catch (err) {
            // Clear tokens and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            throw new Error('Authentication failed');
        }
    }

    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return res.blob();
}

export const api = {
    get: (p, token) => req(p, {}, token),
    post: (p, body, token) =>
        req(
            p,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body || {}),
            },
            token
        ),
    patch: (p, body, token) =>
        req(
            p,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body || {}),
            },
            token
        ),
    delete: (p, token) =>
        req(
            p,
            {
                method: 'DELETE',
            },
            token
        ),
    upload: (p, formData, token) =>
        req(
            p,
            {
                method: 'POST',
                body: formData,
            },
            token
        ),
    tts: async (text) => {
        const res = await fetch(`${BASE}/api/audio/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
        return res.blob();
    },

    // Auth methods
    auth: {
        register: (email, password) =>
            req('/api/user/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            }),
        login: (email, password) =>
            req('/api/user/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            }),
        refresh: (refreshToken) =>
            req('/api/user/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            }),
        logout: (token) =>
            req('/api/user/logout', {
                method: 'POST',
            }, token),
    },
};
