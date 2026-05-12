import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { dashboardAPI, exportAPI } from './api';

/**
 * Captures the dashboard and generates a PDF export
 * @param {Object} options - Export options
 * @param {string} options.title - Title for the export
 * @param {Function} options.onProgress - Progress callback
 * @returns {Promise<{success: boolean, downloadUrl?: string, error?: string}>}
 */
export const exportDashboardToPDF = async (options = {}) => {
  const {
    title = `Dashboard Report - ${new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`,
    period = '30',
    onProgress = () => {}
  } = options;

  try {
    onProgress(10, 'Loading dashboard data...');

    const [overviewResponse, recentActivityResponse] = await Promise.all([
      dashboardAPI.getOverview(period, true),
      dashboardAPI.getRecentActivity(10)
    ]);

    if (!overviewResponse?.success) {
      throw new Error(overviewResponse?.message || 'Failed to load dashboard metrics');
    }

    const periodMetrics = overviewResponse.periodMetrics || {};
    const statusSummary = periodMetrics.statusSummary || {};
    const volumeMap = periodMetrics.volume || {};
    const recentActivity = recentActivityResponse?.success
      ? (recentActivityResponse.recentActivity || [])
      : [];

    const chartTargets = [
      { selector: '[data-export-chart="payment-trends"]', title: 'Payment Trends' },
      { selector: '[data-export-chart="crypto-distribution"]', title: 'Crypto Distribution' }
    ];

    onProgress(25, 'Capturing charts...');

    const chartImages = [];
    for (const chart of chartTargets) {
      const element = document.querySelector(chart.selector);
      if (!element) {
        continue;
      }

      try {
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true
        });

        chartImages.push({
          title: chart.title,
          dataUrl: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height
        });
      } catch (chartError) {
        console.warn(`Chart capture failed: ${chart.title}`, chartError);
      }
    }

    onProgress(35, 'Building report layout...');

    const pdf = new jsPDF('p', 'mm', 'a4');

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const formatCurrency = (value) => `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatNumber = (value) => Number(value || 0).toLocaleString('en-US');
    const statusLabel = (status) => status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : 'Unknown';

    const ensureSpace = (requiredHeight) => {
      if (y + requiredHeight > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
    };

    const drawSectionTitle = (text) => {
      ensureSpace(10);
      pdf.setFontSize(12);
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.text(text, margin, y);
      y += 7;
    };

    // Header band
    pdf.setFillColor(15, 23, 42);
    pdf.roundedRect(margin, y, contentWidth, 24, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.text('QuantumPay Dashboard Report', margin + 4, y + 9);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(title, margin + 4, y + 16);
    pdf.text(`Period: Last ${period} days`, margin + 4, y + 21);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 68, y + 21);
    y += 30;

    drawSectionTitle('Executive Summary');

    const cards = [
      { label: 'Total Sales', value: formatCurrency(periodMetrics.totalSales) },
      { label: 'Completed Transactions', value: formatNumber(statusSummary.completed) },
      { label: 'Pending (Live)', value: formatNumber(statusSummary.pending) },
      { label: 'Failed Transactions', value: formatNumber(statusSummary.failed) },
      { label: 'Average Transaction', value: formatCurrency(periodMetrics.averageTransactionValue) },
      { label: 'Top Cryptocurrency', value: periodMetrics.topCryptoCurrency || 'N/A' }
    ];

    const cardGap = 4;
    const cardWidth = (contentWidth - cardGap) / 2;
    const cardHeight = 16;

    cards.forEach((card, index) => {
      if (index % 2 === 0) {
        ensureSpace(cardHeight + 3);
      }

      const x = margin + (index % 2) * (cardWidth + cardGap);
      if (index % 2 === 0 && index > 0) {
        y += cardHeight + 3;
      }

      pdf.setDrawColor(226, 232, 240);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      pdf.text(card.label, x + 3, y + 6);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(15, 23, 42);
      pdf.text(String(card.value), x + 3, y + 12);
    });
    y += cardHeight + 9;

    drawSectionTitle('Status Breakdown');
    const statusRows = [
      ['Status', 'Count'],
      ['Completed', formatNumber(statusSummary.completed)],
      ['Pending', formatNumber(statusSummary.pending)],
      ['Failed', formatNumber(statusSummary.failed)],
      ['Total', formatNumber(statusSummary.totalPayments)]
    ];

    const statusCol1 = contentWidth * 0.65;
    const rowHeight = 8;
    statusRows.forEach((row, idx) => {
      ensureSpace(rowHeight + 1);
      const rowY = y;

      pdf.setDrawColor(226, 232, 240);
      pdf.setFillColor(idx === 0 ? 241 : 255, idx === 0 ? 245 : 255, idx === 0 ? 249 : 255);
      pdf.rect(margin, rowY, contentWidth, rowHeight, 'FD');

      pdf.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);
      pdf.text(row[0], margin + 3, rowY + 5.5);
      pdf.text(row[1], margin + statusCol1 + 3, rowY + 5.5);

      y += rowHeight;
    });
    y += 5;

    drawSectionTitle('Charts');

    if (chartImages.length === 0) {
      ensureSpace(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Charts are unavailable for this export.', margin, y + 4);
      y += 10;
    } else {
      chartImages.forEach((chart) => {
        ensureSpace(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(15, 23, 42);
        pdf.text(chart.title, margin, y);
        y += 5;

        let imgWidth = contentWidth;
        let imgHeight = (chart.height * imgWidth) / chart.width;
        const maxHeight = pageHeight - margin * 2 - 12;

        if (imgHeight > maxHeight) {
          const scale = maxHeight / imgHeight;
          imgHeight = maxHeight;
          imgWidth *= scale;
        }

        ensureSpace(imgHeight + 6);
        const imgX = margin + (contentWidth - imgWidth) / 2;
        pdf.addImage(chart.dataUrl, 'PNG', imgX, y, imgWidth, imgHeight);
        y += imgHeight + 6;
      });
    }

    drawSectionTitle('Crypto Volume (USD)');
    const cryptoRows = Object.entries(volumeMap)
      .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
      .slice(0, 8)
      .map(([symbol, usd]) => [symbol, formatCurrency(usd)]);

    if (cryptoRows.length === 0) {
      ensureSpace(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text('No crypto volume data available for this period.', margin, y + 4);
      y += 10;
    } else {
      const cryptoTable = [['Cryptocurrency', 'Volume (USD)'], ...cryptoRows];
      cryptoTable.forEach((row, idx) => {
        ensureSpace(rowHeight + 1);
        const rowY = y;
        pdf.setDrawColor(226, 232, 240);
        pdf.setFillColor(idx === 0 ? 241 : 255, idx === 0 ? 245 : 255, idx === 0 ? 249 : 255);
        pdf.rect(margin, rowY, contentWidth, rowHeight, 'FD');

        pdf.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(15, 23, 42);
        pdf.text(row[0], margin + 3, rowY + 5.5);
        pdf.text(row[1], margin + statusCol1 + 3, rowY + 5.5);
        y += rowHeight;
      });
      y += 5;
    }

    drawSectionTitle('Recent Transactions');
    const activityHeader = ['Date/Time', 'Customer', 'Amount (USD)', 'Crypto', 'Status'];
    const activityRows = (recentActivity || []).slice(0, 10).map((item) => [
      item.timestamp ? new Date(item.timestamp).toLocaleString() : '-',
      item.customer || 'Unknown',
      formatCurrency(item.amount),
      `${Number(item.cryptoAmount || 0)} ${item.cryptoSymbol || item.cryptocurrency || ''}`.trim(),
      statusLabel(item.status)
    ]);

    const activityData = [activityHeader, ...activityRows];
    const colWidths = [38, 46, 30, 34, 20];

    activityData.forEach((row, idx) => {
      ensureSpace(rowHeight + 1);
      const rowY = y;
      pdf.setDrawColor(226, 232, 240);
      pdf.setFillColor(idx === 0 ? 241 : 255, idx === 0 ? 245 : 255, idx === 0 ? 249 : 255);
      pdf.rect(margin, rowY, contentWidth, rowHeight, 'FD');

      pdf.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(15, 23, 42);

      let x = margin + 2;
      row.forEach((cell, cellIdx) => {
        const text = pdf.splitTextToSize(String(cell ?? '-'), colWidths[cellIdx] - 3)[0] || '-';
        pdf.text(text, x, rowY + 5.3);
        x += colWidths[cellIdx];
      });

      y += rowHeight;
    });

    if (activityRows.length === 0) {
      ensureSpace(10);
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(9);
      pdf.setTextColor(100, 116, 139);
      pdf.text('No recent transaction activity available.', margin, y + 6);
      y += 10;
    }

    // Footer/page numbers
    const pageCount = pdf.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`Page ${page} of ${pageCount}`, pageWidth - margin - 22, pageHeight - 5);
      pdf.text('QuantumPay', margin, pageHeight - 5);
    }

    onProgress(70, 'Preparing download...');

    // Convert PDF to blob
    const pdfBlob = pdf.output('blob');
    
    // Create a File object for upload
    const fileName = `dashboard-report-${Date.now()}.pdf`;

    onProgress(80, 'Saving to export history...');

    // Upload the PDF file to the server
    const uploadResponse = await exportAPI.uploadDashboardPDF({
      name: title,
      fileName: fileName,
      pdfBlob: pdfBlob
    });

    if (!uploadResponse?.success) {
      throw new Error(uploadResponse?.message || 'Failed to save dashboard export');
    }

    // Create local download URL from blob for instant download
    const localDownloadUrl = URL.createObjectURL(pdfBlob);

    onProgress(100, 'Complete!');

    // Trigger immediate download
    const link = document.createElement('a');
    link.href = localDownloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(localDownloadUrl), 60000);

    return {
      success: true,
      downloadUrl: uploadResponse?.export?.downloadUrl || localDownloadUrl,
      fileName,
      exportId: uploadResponse?.export?.id
    };

  } catch (error) {
    console.error('Dashboard export error:', error);
    return {
      success: false,
      error: error.message || 'Failed to export dashboard'
    };
  }
};

export default exportDashboardToPDF;
