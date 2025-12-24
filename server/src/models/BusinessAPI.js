const mongoose = require('mongoose');

const businessAPISchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    label: {
        type: String,
        trim: true,
        default: 'API Key'
    },
    key: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    secret: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['live', 'test'],
        default: 'live'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    permissions: {
        type: [String],
        default: ['read']
    },
    usageCount: {
        type: Number,
        default: 0
    },
    lastUsed: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Indexes
businessAPISchema.index({ userId: 1, key: 1 }, { unique: true });
businessAPISchema.index({ key: 1 }, { unique: true });

const BusinessAPI = mongoose.model('BusinessAPI', businessAPISchema);

module.exports = { BusinessAPI };
