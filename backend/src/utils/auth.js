import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_me';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

/**
 * Hash password using Argon2
 */
export async function hashPassword(password) {
    return await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 1,
    });
}

/**
 * Verify password against hash
 */
export async function verifyPassword(hash, password) {
    try {
        return await argon2.verify(hash, password);
    } catch (err) {
        return false;
    }
}

/**
 * Generate access token
 */
export function generateAccessToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload) {
    return jwt.sign(
        { ...payload, jti: uuidv4() },
        JWT_REFRESH_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
}

/**
 * Verify access token
 */
export function verifyAccessToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (err) {
        return null;
    }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7);
}
