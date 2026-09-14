import Papa from 'papaparse';

/**
 * Utility to download JSON array data as a CSV file
 * @param {Array<Object>} data - Array of row objects
 * @param {string} filenamePrefix - Prefix for the downloaded CSV file
 */
export const exportToCSV = (data, filenamePrefix = 'export') => {
  if (!data || !data.length) {
    alert('No data available to export.');
    return;
  }
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
