const mongoose = require('mongoose');

const loginTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // TTL index - auto-delete expired tokens
    }
}, {
    timestamps: true
});

// Indexes
loginTokenSchema.index({ userId: 1, token: 1 }, { unique: true });
loginTokenSchema.index({ expiresAt: 1 });

const LoginToken = mongoose.model('LoginToken', loginTokenSchema);

module.exports = { LoginToken };
