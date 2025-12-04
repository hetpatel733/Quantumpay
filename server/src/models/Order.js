const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    businessEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        ref: 'User'
    },
    productName: {
        type: String,
        required: true,
        trim: true
    },
    amountUSD: {
        type: Number,
        required: true,
        min: 0
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    category: {
        type: String,
        trim: true,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Add virtual for status display
orderSchema.virtual('statusDisplay').get(function() {
    return this.isActive ? 'Active' : 'Inactive';
});

// Add virtual for payment URL generation
orderSchema.virtual('paymentUrl').get(function() {
    // This will be used to generate payment links
    return `/payment?order_id=${this.orderId}`;
});

// Add method to toggle active status
orderSchema.methods.toggleStatus = function() {
    this.isActive = !this.isActive;
    return this.save();
};

// Pre-save middleware for validation
orderSchema.pre('save', function(next) {
    if (this.isModified('amountUSD') && this.amountUSD <= 0) {
        next(new Error('Amount must be greater than 0'));
    }
    if (this.isModified('productName') && !this.productName.trim()) {
        next(new Error('Product name is required'));
    }
    next();
});

// Add indexes for performance
orderSchema.index({ orderId: 1 });
orderSchema.index({ businessEmail: 1, isActive: 1 });
orderSchema.index({ businessEmail: 1, createdAt: -1 });
orderSchema.index({ productName: 'text', description: 'text' });

// Add static method to find active orders
orderSchema.statics.findActiveByBusiness = function(businessEmail) {
    return this.find({ 
        businessEmail: businessEmail.toLowerCase(), 
        isActive: true 
    }).sort({ createdAt: -1 });
};

// Add static method to get order statistics
orderSchema.statics.getOrderStats = async function(businessEmail) {
    return await this.aggregate([
        { $match: { businessEmail: businessEmail.toLowerCase() } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: ['$isActive', 1, 0] } },
                inactive: { $sum: { $cond: ['$isActive', 0, 1] } },
                totalValue: { $sum: '$amountUSD' },
                averageValue: { $avg: '$amountUSD' }
            }
        }
    ]);
};

const Order = mongoose.model('Order', orderSchema);

module.exports = { Order };
