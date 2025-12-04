const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['business', 'customer', 'Business', 'Personal'], // Add both old and new formats
        default: 'customer'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    businessName: {
        type: String,
        trim: true,
        required: function() {
            return this.type === 'business';
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    passwordHash: {
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
    timeZone: {
        type: String,
        default: 'America/New_York'
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    verified: {
        type: Boolean,
        default: false
    },
    token: {
        type: String,
        default: null
    }
}, { 
    timestamps: true 
});

// Add indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ type: 1 });
userSchema.index({ businessName: 1 });

const User = mongoose.model('User', userSchema);

module.exports = { User };
