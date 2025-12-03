import { User } from '../models/User.js';
import { hashPassword, verifyPassword, generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/auth.js';

export async function userRoutes(app) {
    /**
     * Register new user
     * POST /api/user/register
     */
    app.post('/register', async (req, reply) => {
        try {
            const { email, password, firstName, lastName } = req.body || {};

            if (!email || !password) {
                return reply.code(400).send({ error: 'Email and password required' });
            }

            if (password.length < 8) {
                return reply.code(400).send({ error: 'Password must be at least 8 characters' });
            }

            const existing = await User.findOne({ email: email.toLowerCase() });
            if (existing) {
                return reply.code(400).send({ error: 'User already exists' });
            }

            const passwordHash = await hashPassword(password);
            const user = await User.create({
                email: email.toLowerCase(),
                passwordHash,
                role: 'user',
                isActive: true,
                profile: { firstName, lastName },
            });

            const accessToken = generateAccessToken({ userId: user._id, email: user.email, role: user.role });
            const refreshToken = generateRefreshToken({ userId: user._id });

            user.refreshToken = refreshToken;
            await user.save();

            return {
                success: true,
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                },
                accessToken,
                refreshToken,
            };
        } catch (err) {
            app.log.error('Register error:', err);
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Login
     * POST /api/user/login
     */
    app.post('/login', async (req, reply) => {
        try {
            const { email, password } = req.body || {};

            if (!email || !password) {
                return reply.code(400).send({ error: 'Email and password required' });
            }

            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }

            if (!user.isActive) {
                return reply.code(403).send({ error: 'Account is deactivated' });
            }

            const ok = await verifyPassword(user.passwordHash, password);
            if (!ok) {
                return reply.code(401).send({ error: 'Invalid credentials' });
            }

            const accessToken = generateAccessToken({ userId: user._id, email: user.email, role: user.role });
            const refreshToken = generateRefreshToken({ userId: user._id });

            user.refreshToken = refreshToken;
            user.lastLogin = new Date();
            await user.save();

            // For backward compatibility, also return 'token'
            return {
                success: true,
                token: accessToken,
                accessToken,
                refreshToken,
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                },
            };
        } catch (err) {
            app.log.error('Login error:', err);
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Refresh access token
     * POST /api/user/refresh
     */
    app.post('/refresh', async (req, reply) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return reply.code(400).send({ error: 'Refresh token required' });
            }

            const decoded = verifyRefreshToken(refreshToken);
            if (!decoded) {
                return reply.code(401).send({ error: 'Invalid refresh token' });
            }

            const user = await User.findById(decoded.userId);
            if (!user || user.refreshToken !== refreshToken || !user.isActive) {
                return reply.code(401).send({ error: 'Invalid refresh token' });
            }

            const accessToken = generateAccessToken({ userId: user._id, email: user.email, role: user.role });
            const newRefreshToken = generateRefreshToken({ userId: user._id });

            user.refreshToken = newRefreshToken;
            await user.save();

            return {
                success: true,
                accessToken,
                refreshToken: newRefreshToken,
            };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });

    /**
     * Logout
     * POST /api/user/logout
     */
    app.post('/logout', async (req, reply) => {
        try {
            const { refreshToken } = req.body;
            if (refreshToken) {
                const decoded = verifyRefreshToken(refreshToken);
                if (decoded) {
                    await User.updateOne(
                        { _id: decoded.userId, refreshToken },
                        { $unset: { refreshToken: 1 } }
                    );
                }
            }
            return { success: true };
        } catch (err) {
            reply.code(500);
            return { error: err.message };
        }
    });
}
