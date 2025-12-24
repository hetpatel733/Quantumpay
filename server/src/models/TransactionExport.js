const mongoose = require('mongoose');

const transactionExportSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    format: {
        type: String,
        required: true,
        enum: ['csv', 'excel', 'pdf', 'json'],
        default: 'csv'
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'processing', 'completed', 'failed', 'expired'],
        default: 'pending'
    },
    // Filter configuration used for export
    filters: {
        dateRange: {
            type: String,
            default: 'last30days'
        },
        customStartDate: Date,
        customEndDate: Date,
        status: {
            type: String,
            default: 'all'
        },
        cryptocurrencies: {
            type: [String],
            default: ['all']
        },
        amountMin: Number,
        amountMax: Number
    },
    // Selected columns for export
    columns: {
        type: [String],
        default: ['transactionId', 'amount', 'cryptocurrency', 'status', 'date']
    },
    includeHeaders: {
        type: Boolean,
        default: true
    },
    // Export results
    recordCount: {
        type: Number,
        default: 0
    },
    fileSize: {
        type: String,
        default: null
    },
    // tmpfiles.org URL - expires after 1 hour
    downloadUrl: {
        type: String,
        default: null
    },
    // When the download URL expires
    expiresAt: {
        type: Date,
        default: null
    },
    // Error message if failed
    errorMessage: {
        type: String,
        default: null
    },
    // Processing timestamps
    startedAt: {
        type: Date,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    },
    // Email delivery option
    emailDelivery: {
        type: Boolean,
        default: false
    },
    emailAddress: {
        type: String,
        trim: true,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
transactionExportSchema.index({ userId: 1, createdAt: -1 });
transactionExportSchema.index({ userId: 1, status: 1 });
transactionExportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for auto-cleanup

const TransactionExport = mongoose.model('TransactionExport', transactionExportSchema);

module.exports = { TransactionExport };
