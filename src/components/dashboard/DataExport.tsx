import React, { useState } from 'react';
import { FileText, Download, FileJson, Table, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface DataExportProps {
  entries: any[];
  habits: any[];
  t: (key: string) => string;
}

const DataExport: React.FC<DataExportProps> = ({ entries, habits, t }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const exportToJSON = () => {
    try {
      setIsExporting(true);
      const data = {
        exportDate: new Date().toISOString(),
        journalEntries: entries,
        habits: habits
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `growth-keep-export-${new Date().toLocaleDateString()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setExportStatus('success');
      setTimeout(() => setExportStatus('idle'), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = () => {
    try {
      setIsExporting(true);
      
      // Journal Entries CSV
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "ID,Date,Content,Mood,Analysis\n";
      
      entries.forEach(entry => {
        const row = [
          entry.id,
          new Date(entry.created_at).toLocaleDateString(),
          `"${entry.content.replace(/"/g, '""')}"`,
          entry.mood || '',
          entry.analysis ? `"${entry.analysis.replace(/"/g, '""')}"` : ''
        ].join(",");
        csvContent += row + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `journal-entries-${new Date().toLocaleDateString()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setExportStatus('success');
      setTimeout(() => setExportStatus('idle'), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <Download className="w-8 h-8 text-indigo-500" />
        <h2 className="text-3xl font-bold text-slate-800">Export Your Data</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
            <FileJson className="w-6 h-6 text-indigo-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">JSON Export</h3>
          <p className="text-slate-500 mb-6">
            Download your complete data including journal entries, habits, and AI analysis in a developer-friendly JSON format.
          </p>
          <button
            onClick={exportToJSON}
            disabled={isExporting}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            {isExporting ? 'Exporting...' : 'Download JSON'}
          </button>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6">
            <Table className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">CSV Export</h3>
          <p className="text-slate-500 mb-6">
            Export your journal entries to a CSV file that can be opened in Excel or Google Sheets for your own analysis.
          </p>
          <button
            onClick={exportToCSV}
            disabled={isExporting}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            {isExporting ? 'Exporting...' : 'Download CSV'}
          </button>
        </motion.div>
      </div>

      {exportStatus !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center gap-3 ${
            exportStatus === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {exportStatus === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="font-medium">
            {exportStatus === 'success' ? 'Data exported successfully!' : 'Failed to export data. Please try again.'}
          </span>
        </motion.div>
      )}

      <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-500" />
          Data Privacy Note
        </h4>
        <p className="text-sm text-slate-600 leading-relaxed">
          Your data is exported directly from your browser. We do not process or store your exported files on our servers. 
          Keep your exported files secure as they contain your personal reflections and history.
        </p>
      </div>
    </div>
  );
};

export default DataExport;
