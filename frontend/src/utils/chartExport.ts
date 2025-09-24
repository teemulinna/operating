import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { ExportOptions } from '../types/analytics';

/**
 * Export utilities for charts and analytics data
 */
export class ChartExportUtils {
  /**
   * Export chart as PNG image
   */
  static async exportChartAsPNG(chartElement: HTMLElement, filename: string): Promise<void> {
    try {
      const canvas = await html2canvas(chartElement, {
        background: '#ffffff',
        // scale: 2, // Higher resolution - not supported by html2canvas types
        logging: false,
        useCORS: true
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `${filename}.png`);
        }
      });
    } catch (error) {
      console.error('Error exporting chart as PNG:', error);
      throw new Error('Failed to export chart as PNG');
    }
  }

  /**
   * Export chart as PDF
   */
  static async exportChartAsPDF(chartElement: HTMLElement, filename: string): Promise<void> {
    try {
      const canvas = await html2canvas(chartElement, {
        background: '#ffffff',
        // scale: 2,
        logging: false,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Error exporting chart as PDF:', error);
      throw new Error('Failed to export chart as PDF');
    }
  }

  /**
   * Export multiple charts as PDF report
   */
  static async exportMultipleChartsAsPDF(
    chartElements: { element: HTMLElement; title: string }[],
    reportTitle: string,
    filename: string
  ): Promise<void> {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Add title page
      pdf.setFontSize(24);
      pdf.text(reportTitle, pageWidth / 2, 30, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 45, { align: 'center' });
      
      for (let i = 0; i < chartElements.length; i++) {
        const { element, title } = chartElements[i];
        
        if (i > 0 || chartElements.length > 1) {
          pdf.addPage();
        }
        
        // Add chart title
        pdf.setFontSize(16);
        pdf.text(title, 20, 30);
        
        // Capture chart
        const canvas = await html2canvas(element, {
          background: '#ffffff',
          // scale: 1.5, // Note: scale property not supported in html2canvas types
          logging: false,
          useCORS: true
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 40; // 20mm margin on each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Check if image fits on page
        if (imgHeight <= pageHeight - 60) {
          pdf.addImage(imgData, 'PNG', 20, 40, imgWidth, imgHeight);
        } else {
          // Scale down to fit
          const scaledHeight = pageHeight - 60;
          const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
          pdf.addImage(imgData, 'PNG', 20, 40, scaledWidth, scaledHeight);
        }
      }
      
      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Error exporting multiple charts as PDF:', error);
      throw new Error('Failed to export charts as PDF report');
    }
  }

  /**
   * Export data as CSV
   */
  static exportDataAsCSV(data: any[], filename: string, headers?: string[]): void {
    try {
      if (!data || data.length === 0) {
        throw new Error('No data to export');
      }
      
      const csvHeaders = headers || Object.keys(data[0]);
      const csvContent = [csvHeaders.join(',')];
      
      data.forEach(row => {
        const values = csvHeaders.map(header => {
          const value = row[header];
          // Handle commas and quotes in values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        });
        csvContent.push(values.join(','));
      });
      
      const blob = new Blob([csvContent.join('\n')], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${filename}.csv`);
    } catch (error) {
      console.error('Error exporting data as CSV:', error);
      throw new Error('Failed to export data as CSV');
    }
  }

  /**
   * Export data as JSON
   */
  static exportDataAsJSON(data: any, filename: string): void {
    try {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      saveAs(blob, `${filename}.json`);
    } catch (error) {
      console.error('Error exporting data as JSON:', error);
      throw new Error('Failed to export data as JSON');
    }
  }

  /**
   * Get chart element by ID with error handling
   */
  static getChartElement(chartId: string): HTMLElement {
    const element = document.getElementById(chartId);
    if (!element) {
      throw new Error(`Chart element with ID '${chartId}' not found`);
    }
    return element;
  }

  /**
   * Validate export options
   */
  static validateExportOptions(options: ExportOptions): void {
    const validFormats = ['png', 'pdf', 'csv', 'json'];
    if (!validFormats.includes(options.format)) {
      throw new Error(`Invalid export format: ${options.format}`);
    }
    
    if (options.dateRange.from >= options.dateRange.to) {
      throw new Error('Invalid date range: from date must be before to date');
    }
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(baseName: string, includeTimestamp: boolean = true): string {
    const timestamp = includeTimestamp ? 
      `_${new Date().toISOString().split('T')[0]}` : '';
    return `${baseName}${timestamp}`;
  }
}