const mongoose = require('mongoose');

const businessAPISchema = new mongoose.Schema({
    businessEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        ref: 'User'
    },
    label: {
        type: String,
        required: true,
        trim: true
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
    permissions: [{
        type: String,
        enum: ['read', 'write', 'refund', 'webhook'],
        default: 'read'
    }],
    isActive: {
        type: Boolean,
        default: true
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

// Add indexes for performance and security
businessAPISchema.index({ businessEmail: 1 });
businessAPISchema.index({ key: 1 }, { unique: true });
businessAPISchema.index({ isActive: 1 });

// Add method to increment usage
businessAPISchema.methods.incrementUsage = function() {
    this.usageCount = (this.usageCount || 0) + 1;
    this.lastUsed = new Date();
    return this.save();
};

// Add method to toggle active status
businessAPISchema.methods.toggleStatus = function() {
    this.isActive = !this.isActive;
    return this.save();
};

const BusinessAPI = mongoose.model('BusinessAPI', businessAPISchema);

module.exports = { BusinessAPI };
