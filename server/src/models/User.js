const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: true
    },
    website: {
        type: String,
        trim: true,
        default: ''
    },
    phoneNumber: {
        type: String,
        trim: true,
        default: ''
    },
    country: {
        type: String,
        trim: true,
        default: ''
    },
    businessType: {
        type: String,
        trim: true,
        default: ''
    },
    businessName: {
        type: String,
        trim: true,
        default: ''
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    profileImage: {
        type: String,
        trim: true,
        default: ''
    },
    profileImageFileId: {
        type: String,
        trim: true,
        default: null
    },
    timeZone: {
        type: String,
        default: 'America/New_York'
    },
    verified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'suspended', 'pending', 'inactive'],
        default: 'active'
    },
    role: {
        type: String,
        enum: ['business', 'customer', 'admin'],
        default: 'customer'
    }
}, {
    timestamps: true
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: 1 });

const User = mongoose.model('User', userSchema);

module.exports = { User };
