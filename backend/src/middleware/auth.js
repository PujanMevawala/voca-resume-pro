import { verifyAccessToken, extractToken } from '../utils/auth.js';
import { User } from '../models/User.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(request, reply) {
    try {
        const token = extractToken(request.headers.authorization);

        if (!token) {
            reply.code(401);
            throw new Error('No token provided');
        }

        const decoded = verifyAccessToken(token);

        if (!decoded) {
            reply.code(401);
            throw new Error('Invalid or expired token');
        }

        // Fetch user
        const user = await User.findById(decoded.userId);

        if (!user || !user.isActive) {
            reply.code(401);
            throw new Error('User not found or inactive');
        }

        // Attach user to request
        request.user = {
            userId: user._id,
            email: user.email,
            role: user.role,
        };
    } catch (err) {
        reply.code(401);
        throw new Error('Authentication failed: ' + err.message);
    }
}

/**
 * Authorization middleware - check for admin role
 */
export async function requireAdmin(request, reply) {
    if (!request.user) {
        reply.code(401);
        throw new Error('Not authenticated');
    }

    if (request.user.role !== 'admin') {
        reply.code(403);
        throw new Error('Admin access required');
    }
}

/**
 * Optional authentication
 * Does not throw error if no token provided
 */
export async function optionalAuth(request, reply) {
    try {
        const token = extractToken(request.headers.authorization);

        if (token) {
            const decoded = verifyAccessToken(token);

            if (decoded) {
                const user = await User.findById(decoded.userId);
                if (user && user.isActive) {
                    request.user = {
                        userId: user._id,
                        email: user.email,
                        role: user.role,
                    };
                }
            }
        }
    } catch (err) {
        // Silently fail for optional auth
    }
}
