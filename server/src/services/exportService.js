const { TransactionExport } = require('../models/TransactionExport');
const { Payment } = require('../models/Payment');
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const PDFDocument = require('pdfkit');

// Helper: Format date for filenames
function formatDateForFilename() {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

// Helper: Calculate date range from preset
function calculateDateRange(dateRange, customStart, customEnd) {
    const endDate = new Date();
    let startDate = new Date();

    switch (dateRange) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setDate(endDate.getDate() - 1);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'last7days':
            startDate.setDate(startDate.getDate() - 7);
            break;
        case 'last30days':
            startDate.setDate(startDate.getDate() - 30);
            break;
        case 'last90days':
            startDate.setDate(startDate.getDate() - 90);
            break;
        case 'thisMonth':
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'lastMonth':
            startDate.setMonth(startDate.getMonth() - 1);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setDate(0); // Last day of previous month
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'custom':
            if (customStart) startDate = new Date(customStart);
            if (customEnd) endDate = new Date(customEnd);
            break;
        default:
            startDate.setDate(startDate.getDate() - 30);
    }

    return { startDate, endDate };
}

// Helper: Get column header label
function getColumnHeader(column) {
    const headers = {
        transactionId: 'Transaction ID',
        payId: 'Payment ID',
        date: 'Date',
        amount: 'Amount (USD)',
        amountCrypto: 'Crypto Amount',
        cryptocurrency: 'Cryptocurrency',
        cryptoSymbol: 'Symbol',
        network: 'Network',
        status: 'Status',
        customer: 'Customer Name',
        customerEmail: 'Customer Email',
        walletAddress: 'Wallet Address',
        hash: 'Transaction Hash',
        fees: 'Fees',
        exchangeRate: 'Exchange Rate',
        productId: 'Product ID',
        completedAt: 'Completed At',
        failureReason: 'Failure Reason'
    };
    return headers[column] || column;
}

// Helper: Get column value from payment
function getColumnValue(payment, column) {
    switch (column) {
        case 'transactionId':
        case 'payId':
            return payment.payId || '';
        case 'date':
            return payment.createdAt ? new Date(payment.createdAt).toISOString() : '';
        case 'amount':
            return payment.amountUSD?.toFixed(2) || '0.00';
        case 'amountCrypto':
            return payment.amountCrypto?.toString() || '0';
        case 'cryptocurrency':
            return payment.cryptoType || '';
        case 'cryptoSymbol':
            return payment.cryptoSymbol || payment.cryptoType || '';
        case 'network':
            return payment.network || '';
        case 'status':
            return payment.status || '';
        case 'customer':
            return payment.customerName || '';
        case 'customerEmail':
            return payment.customerEmail || '';
        case 'walletAddress':
            return payment.walletAddress || '';
        case 'hash':
            return payment.hash || '';
        case 'fees':
            return payment.fees?.toFixed(2) || '0.00';
        case 'exchangeRate':
            return payment.exchangeRate?.toString() || '';
        case 'productId':
            return payment.productId || '';
        case 'completedAt':
            return payment.completedAt ? new Date(payment.completedAt).toISOString() : '';
        case 'failureReason':
            return payment.failureReason || '';
        default:
            return '';
    }
}

// Helper: Escape CSV value
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

// Generate CSV content
function generateCSV(payments, columns, includeHeaders) {
    let csv = '';

    if (includeHeaders) {
        csv += columns.map(col => escapeCSV(getColumnHeader(col))).join(',') + '\n';
    }

    for (const payment of payments) {
        csv += columns.map(col => escapeCSV(getColumnValue(payment, col))).join(',') + '\n';
    }

    return csv;
}

// Generate JSON content
function generateJSON(payments, columns) {
    return JSON.stringify(payments.map(payment => {
        const obj = {};
        columns.forEach(col => {
            obj[col] = getColumnValue(payment, col);
        });
        return obj;
    }), null, 2);
}

// Generate PDF file using pdfkit
async function generatePDF(payments, columns, includeHeaders, exportName, filePath) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                margin: 40,
                size: 'A4',
                layout: 'landscape' // Better for tables with many columns
            });
            
            const writeStream = fs.createWriteStream(filePath);
            doc.pipe(writeStream);

            // Colors
            const primaryColor = '#1ec1c7';
            const headerBgColor = '#f3f4f6';
            const borderColor = '#e5e7eb';
            const textColor = '#1f2937';
            const lightTextColor = '#6b7280';

            // Header
            doc.rect(0, 0, doc.page.width, 80).fill(primaryColor);
            doc.fillColor('white')
               .fontSize(24)
               .font('Helvetica-Bold')
               .text('Transaction Export Report', 40, 25);
            
            doc.fontSize(10)
               .font('Helvetica')
               .text(`Generated: ${new Date().toLocaleString()}`, 40, 55);
            
            doc.text(`Total Records: ${payments.length}`, 250, 55);

            // Reset position
            let yPosition = 100;

            // Report name
            doc.fillColor(textColor)
               .fontSize(14)
               .font('Helvetica-Bold')
               .text(exportName, 40, yPosition);
            
            yPosition += 30;

            if (payments.length === 0) {
                doc.fillColor(lightTextColor)
                   .fontSize(12)
                   .font('Helvetica')
                   .text('No transactions found matching the specified criteria.', 40, yPosition);
                doc.end();
                writeStream.on('finish', () => resolve());
                writeStream.on('error', reject);
                return;
            }

            // Calculate column widths based on available space
            const pageWidth = doc.page.width - 80; // margins
            const columnCount = columns.length;
            const columnWidth = Math.min(pageWidth / columnCount, 120);
            const tableWidth = columnWidth * columnCount;
            const startX = 40;

            // Table header
            if (includeHeaders) {
                doc.rect(startX, yPosition, tableWidth, 25).fill(headerBgColor);
                
                doc.fillColor(textColor)
                   .fontSize(8)
                   .font('Helvetica-Bold');
                
                columns.forEach((col, index) => {
                    const x = startX + (index * columnWidth) + 5;
                    const headerText = getColumnHeader(col);
                    // Truncate header if too long
                    const truncatedHeader = headerText.length > 15 ? headerText.substring(0, 12) + '...' : headerText;
                    doc.text(truncatedHeader, x, yPosition + 8, { 
                        width: columnWidth - 10,
                        ellipsis: true
                    });
                });
                
                yPosition += 25;
            }

            // Table rows
            doc.font('Helvetica').fontSize(7);
            
            payments.forEach((payment, rowIndex) => {
                // Check if we need a new page
                if (yPosition > doc.page.height - 60) {
                    doc.addPage({ layout: 'landscape' });
                    yPosition = 40;
                    
                    // Repeat header on new page
                    if (includeHeaders) {
                        doc.rect(startX, yPosition, tableWidth, 25).fill(headerBgColor);
                        doc.fillColor(textColor).fontSize(8).font('Helvetica-Bold');
                        columns.forEach((col, index) => {
                            const x = startX + (index * columnWidth) + 5;
                            const headerText = getColumnHeader(col);
                            const truncatedHeader = headerText.length > 15 ? headerText.substring(0, 12) + '...' : headerText;
                            doc.text(truncatedHeader, x, yPosition + 8, { width: columnWidth - 10, ellipsis: true });
                        });
                        yPosition += 25;
                        doc.font('Helvetica').fontSize(7);
                    }
                }

                // Alternate row background
                if (rowIndex % 2 === 0) {
                    doc.rect(startX, yPosition, tableWidth, 20).fill('#f9fafb');
                }
                
                // Draw row border
                doc.rect(startX, yPosition, tableWidth, 20).stroke(borderColor);
                
                doc.fillColor(textColor);
                
                columns.forEach((col, index) => {
                    const x = startX + (index * columnWidth) + 5;
                    let value = String(getColumnValue(payment, col) || '-');
                    
                    // Truncate long values
                    if (value.length > 18) {
                        value = value.substring(0, 15) + '...';
                    }
                    
                    // Special formatting for status
                    if (col === 'status') {
                        const statusColors = {
                            completed: '#10b981',
                            pending: '#f59e0b',
                            failed: '#ef4444'
                        };
                        doc.fillColor(statusColors[value.toLowerCase()] || textColor);
                    }
                    
                    doc.text(value, x, yPosition + 6, { 
                        width: columnWidth - 10,
                        ellipsis: true
                    });
                    
                    doc.fillColor(textColor);
                });
                
                yPosition += 20;
            });

            // Footer
            const totalPages = doc.bufferedPageRange().count;
            for (let i = 0; i < totalPages; i++) {
                doc.switchToPage(i);
                doc.fillColor(lightTextColor)
                   .fontSize(8)
                   .text(
                       `Page ${i + 1} of ${totalPages} | QuantumPay Transaction Report`,
                       40,
                       doc.page.height - 30,
                       { align: 'center', width: doc.page.width - 80 }
                   );
            }

            doc.end();
            
            writeStream.on('finish', () => {
                //console.log('✅ PDF generated successfully');
                resolve();
            });
            
            writeStream.on('error', (err) => {
                console.error('❌ PDF write error:', err);
                reject(err);
            });

        } catch (error) {
            console.error('❌ PDF generation error:', error);
            reject(error);
        }
    });
}

// Upload file to tmpfiles.org
async function uploadToTmpFiles(filePath, fileName) {
    try {
        const form = new FormData();
        form.append('file', fs.createReadStream(filePath), fileName);

        //console.log(`📤 Uploading ${fileName} to tmpfiles.org...`);

        const response = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
            headers: {
                ...form.getHeaders()
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        //console.log('📦 tmpfiles.org response:', response.data);

        if (response.data && response.data.status === 'success' && response.data.data && response.data.data.url) {
            // Convert view URL to direct download URL
            // tmpfiles.org returns: https://tmpfiles.org/12345/file.csv
            // Direct download: https://tmpfiles.org/dl/12345/file.csv
            const viewUrl = response.data.data.url;
            const downloadUrl = viewUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            
            return {
                success: true,
                url: downloadUrl,
                viewUrl: viewUrl
            };
        }

        return {
            success: false,
            error: 'Invalid response from tmpfiles.org'
        };
    } catch (error) {
        console.error('❌ tmpfiles.org upload error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// CREATE EXPORT JOB
async function createExport(req, res) {
    try {
        const { userId, name, format, filters, columns, includeHeaders, emailDelivery, emailAddress } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        //console.log(`📋 Creating export job for user: ${userId}`);

        // Create export record
        const exportJob = new TransactionExport({
            userId,
            name: name || `Transaction Report - ${formatDateForFilename()}`,
            format: format || 'csv',
            status: 'pending',
            filters: filters || {},
            columns: columns || ['transactionId', 'amount', 'cryptocurrency', 'status', 'date'],
            includeHeaders: includeHeaders !== false,
            emailDelivery: emailDelivery || false,
            emailAddress: emailAddress || null
        });

        await exportJob.save();

        //console.log(`✅ Export job created: ${exportJob._id}`);

        // Start processing in background
        processExport(exportJob._id);

        return res.status(201).json({
            success: true,
            message: 'Export job created and processing started',
            export: {
                id: exportJob._id,
                name: exportJob.name,
                format: exportJob.format,
                status: exportJob.status,
                createdAt: exportJob.createdAt
            }
        });

    } catch (error) {
        console.error('❌ Create export error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create export job'
        });
    }
}

// PROCESS EXPORT (Background job)
async function processExport(exportId) {
    let exportJob;
    let tempFilePath;

    try {
        exportJob = await TransactionExport.findById(exportId);
        if (!exportJob) {
            console.error(`❌ Export job not found: ${exportId}`);
            return;
        }

        //console.log(`⚙️ Processing export job: ${exportId}, format: ${exportJob.format}`);

        exportJob.status = 'processing';
        exportJob.startedAt = new Date();
        await exportJob.save();

        const { startDate, endDate } = calculateDateRange(
            exportJob.filters.dateRange,
            exportJob.filters.customStartDate,
            exportJob.filters.customEndDate
        );

        // Build query
        const query = {
            userId: exportJob.userId,
            createdAt: { $gte: startDate, $lte: endDate }
        };

        if (exportJob.filters.status && exportJob.filters.status !== 'all') {
            query.status = exportJob.filters.status;
        }

        if (exportJob.filters.cryptocurrencies && 
            exportJob.filters.cryptocurrencies.length > 0 && 
            !exportJob.filters.cryptocurrencies.includes('all')) {
            query.cryptoType = { $in: exportJob.filters.cryptocurrencies };
        }

        if (exportJob.filters.amountMin || exportJob.filters.amountMax) {
            query.amountUSD = {};
            if (exportJob.filters.amountMin) query.amountUSD.$gte = exportJob.filters.amountMin;
            if (exportJob.filters.amountMax) query.amountUSD.$lte = exportJob.filters.amountMax;
        }

        const payments = await Payment.find(query).sort({ createdAt: -1 }).lean();
        //console.log(`📊 Found ${payments.length} payments to export`);

        // Generate file based on format
        let fileExtension;
        const fileName = `export_${exportJob._id}_${formatDateForFilename()}`;

        switch (exportJob.format) {
            case 'json':
                tempFilePath = path.join(os.tmpdir(), `${fileName}.json`);
                const jsonContent = generateJSON(payments, exportJob.columns);
                fs.writeFileSync(tempFilePath, jsonContent, 'utf8');
                fileExtension = 'json';
                break;
                
            case 'pdf':
                tempFilePath = path.join(os.tmpdir(), `${fileName}.pdf`);
                await generatePDF(payments, exportJob.columns, exportJob.includeHeaders, exportJob.name, tempFilePath);
                fileExtension = 'pdf';
                break;
                
            case 'csv':
            default:
                tempFilePath = path.join(os.tmpdir(), `${fileName}.csv`);
                const csvContent = generateCSV(payments, exportJob.columns, exportJob.includeHeaders);
                fs.writeFileSync(tempFilePath, csvContent, 'utf8');
                fileExtension = 'csv';
                break;
        }

        const fileStats = fs.statSync(tempFilePath);
        const fileSizeFormatted = fileStats.size > 1024 * 1024 
            ? `${(fileStats.size / (1024 * 1024)).toFixed(2)} MB`
            : `${(fileStats.size / 1024).toFixed(2)} KB`;

        //console.log(`📄 Generated ${fileExtension.toUpperCase()} file: ${fileName}.${fileExtension} (${fileSizeFormatted})`);

        // Upload to tmpfiles.org
        const uploadResult = await uploadToTmpFiles(tempFilePath, `${fileName}.${fileExtension}`);

        if (uploadResult.success) {
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

            exportJob.status = 'completed';
            exportJob.recordCount = payments.length;
            exportJob.fileSize = fileSizeFormatted;
            exportJob.downloadUrl = uploadResult.url;
            exportJob.expiresAt = expiresAt;
            exportJob.completedAt = new Date();
            await exportJob.save();

            //console.log(`✅ Export completed: ${exportId}, URL: ${uploadResult.url}`);
        } else {
            throw new Error(`Upload failed: ${uploadResult.error}`);
        }

    } catch (error) {
        console.error(`❌ Export processing error for ${exportId}:`, error);
        if (exportJob) {
            exportJob.status = 'failed';
            exportJob.errorMessage = error.message;
            await exportJob.save();
        }
    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try {
                fs.unlinkSync(tempFilePath);
                //console.log(`🧹 Cleaned up temp file: ${tempFilePath}`);
            } catch (e) {
                console.warn(`⚠️ Failed to cleanup temp file: ${e.message}`);
            }
        }
    }
}

// GET ALL EXPORTS FOR USER
async function getAllExports(req, res) {
    try {
        const { userId, limit = 20, skip = 0 } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        //console.log(`📋 Fetching exports for user: ${userId}`);

        // Check and update expired exports
        const now = new Date();
        await TransactionExport.updateMany(
            {
                userId,
                status: 'completed',
                expiresAt: { $lt: now }
            },
            {
                $set: { status: 'expired', downloadUrl: null }
            }
        );

        const exports = await TransactionExport.find({ userId })
            .sort({ createdAt: -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .lean();

        const total = await TransactionExport.countDocuments({ userId });

        return res.status(200).json({
            success: true,
            exports: exports.map(exp => ({
                id: exp._id,
                name: exp.name,
                format: exp.format.toUpperCase(),
                status: exp.status,
                recordCount: exp.recordCount,
                fileSize: exp.fileSize,
                downloadUrl: exp.status === 'completed' ? exp.downloadUrl : null,
                expiresAt: exp.expiresAt,
                createdAt: exp.createdAt,
                completedAt: exp.completedAt,
                errorMessage: exp.errorMessage
            })),
            pagination: {
                total,
                skip: parseInt(skip),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Get exports error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch exports'
        });
    }
}

// GET SINGLE EXPORT BY ID
async function getExportById(req, res) {
    try {
        const { exportId } = req.params;

        const exportJob = await TransactionExport.findById(exportId).lean();

        if (!exportJob) {
            return res.status(404).json({
                success: false,
                message: 'Export not found'
            });
        }

        // Check if expired
        if (exportJob.status === 'completed' && exportJob.expiresAt && new Date() > new Date(exportJob.expiresAt)) {
            await TransactionExport.findByIdAndUpdate(exportId, {
                status: 'expired',
                downloadUrl: null
            });
            exportJob.status = 'expired';
            exportJob.downloadUrl = null;
        }

        return res.status(200).json({
            success: true,
            export: {
                id: exportJob._id,
                name: exportJob.name,
                format: exportJob.format.toUpperCase(),
                status: exportJob.status,
                filters: exportJob.filters,
                columns: exportJob.columns,
                recordCount: exportJob.recordCount,
                fileSize: exportJob.fileSize,
                downloadUrl: exportJob.status === 'completed' ? exportJob.downloadUrl : null,
                expiresAt: exportJob.expiresAt,
                createdAt: exportJob.createdAt,
                completedAt: exportJob.completedAt,
                errorMessage: exportJob.errorMessage
            }
        });

    } catch (error) {
        console.error('❌ Get export by ID error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch export'
        });
    }
}

// DELETE EXPORT
async function deleteExport(req, res) {
    try {
        const { exportId } = req.params;

        const exportJob = await TransactionExport.findByIdAndDelete(exportId);

        if (!exportJob) {
            return res.status(404).json({
                success: false,
                message: 'Export not found'
            });
        }

        //console.log(`🗑️ Export deleted: ${exportId}`);

        return res.status(200).json({
            success: true,
            message: 'Export deleted successfully'
        });

    } catch (error) {
        console.error('❌ Delete export error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete export'
        });
    }
}

// RETRY FAILED EXPORT
async function retryExport(req, res) {
    try {
        const { exportId } = req.params;

        const exportJob = await TransactionExport.findById(exportId);

        if (!exportJob) {
            return res.status(404).json({
                success: false,
                message: 'Export not found'
            });
        }

        if (exportJob.status !== 'failed') {
            return res.status(400).json({
                success: false,
                message: 'Can only retry failed exports'
            });
        }

        // Reset export for retry
        exportJob.status = 'pending';
        exportJob.errorMessage = null;
        exportJob.downloadUrl = null;
        exportJob.expiresAt = null;
        exportJob.startedAt = null;
        exportJob.completedAt = null;
        await exportJob.save();

        //console.log(`🔄 Retrying export: ${exportId}`);

        // Start processing
        processExport(exportId);

        return res.status(200).json({
            success: true,
            message: 'Export retry started',
            export: {
                id: exportJob._id,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('❌ Retry export error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to retry export'
        });
    }
}

module.exports = {
    createExport,
    getAllExports,
    getExportById,
    deleteExport,
    retryExport
};
