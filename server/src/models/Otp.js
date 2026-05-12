const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
        index: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true
    },
    codeHash: {
        type: String,
        required: true
    },
    code: {
        type: String,
        default: null
    },
    purpose: {
        type: String,
        enum: ['signup', 'login', 'password-reset'],
        default: 'signup'
    },
    status: {
        type: String,
        enum: ['pending', 'verified', 'expired'],
        default: 'pending'
    },
    attempts: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    },
    verifiedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

otpSchema.index({ userId: 1, purpose: 1, status: 1, createdAt: -1 });
otpSchema.index({ email: 1, purpose: 1, status: 1, createdAt: -1 });

const Otp = mongoose.model('Otp', otpSchema);

module.exports = { Otp };