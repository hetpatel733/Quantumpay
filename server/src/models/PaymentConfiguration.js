const mongoose = require('mongoose');

const paymentConfigurationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true,
        ref: 'User'
    },
    wallets: {
        type: Map,
        of: String,
        default: {}
    }
}, {
    timestamps: true
});

// Indexes
paymentConfigurationSchema.index({ userId: 1 }, { unique: true });

const PaymentConfiguration = mongoose.model('PaymentConfiguration', paymentConfigurationSchema);

module.exports = { PaymentConfiguration };
