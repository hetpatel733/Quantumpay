import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { exportAPI } from './api';

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
    onProgress = () => {}
  } = options;

  try {
    onProgress(10, 'Capturing dashboard...');

    // Find the main dashboard content
    const dashboardElement = document.querySelector('[data-dashboard-content]') || 
                            document.querySelector('main') ||
                            document.querySelector('.dashboard-content');

    if (!dashboardElement) {
      throw new Error('Dashboard content not found');
    }

    onProgress(30, 'Generating image...');

    // Capture the dashboard as canvas
    const canvas = await html2canvas(dashboardElement, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: dashboardElement.scrollWidth,
      windowHeight: dashboardElement.scrollHeight
    });

    onProgress(50, 'Creating PDF...');

    // Calculate PDF dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Add title
    pdf.setFontSize(16);
    pdf.setTextColor(31, 41, 55);
    pdf.text(title, 10, 15);
    
    // Add timestamp
    pdf.setFontSize(10);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 10, 22);
    
    // Add the dashboard image
    const imgData = canvas.toDataURL('image/png');
    let heightLeft = imgHeight;
    let position = 30; // Start below title

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - position);

    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
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
