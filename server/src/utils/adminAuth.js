const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

/**
 * Middleware: Verify that the request has a valid JWT token.
 * Attaches `req.user` with { id, email, role }.
 */
async function requireAuth(req, res, next) {
    try {
        const token = req.cookies?.token ||
            (req.headers.authorization?.startsWith('Bearer ')
                ? req.headers.authorization.substring(7) : null);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. Please log in.'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('email role status verified');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found. Please log in again.'
            });
        }

        if (user.status === 'suspended') {
            return res.status(403).json({
                success: false,
                message: 'Account suspended. Contact support.'
            });
        }

        req.user = {
            id: user._id,
            email: user.email,
            role: user.role,
            verified: user.verified
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Session expired. Please log in again.'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid authentication token.'
        });
    }
}

/**
 * Middleware: Require the authenticated user to have role === 'admin'.
 * Must be used AFTER requireAuth.
 */
function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    if (req.user.role !== 'admin') {
        console.warn(`⚠️ Non-admin access attempt by ${req.user.email} (role: ${req.user.role})`);
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }

    next();
}

module.exports = { requireAuth, requireAdmin };
