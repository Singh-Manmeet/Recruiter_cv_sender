import React, { useState, useRef, useEffect } from 'react';
import { 
  History, 
  Search, 
  Download, 
  Upload, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X, 
  ExternalLink,
  ChevronDown,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { RecruiterRecord } from '../types';
import { extractCompanyName } from '../db';

interface HistorySectionProps {
  history: RecruiterRecord[];
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
  onSyncHistory: (importedRecords: RecruiterRecord[]) => void;
}

export default function HistorySection({ 
  history, 
  onDeleteRecord, 
  onClearAll,
  onSyncHistory 
}: HistorySectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<RecruiterRecord | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ITEMS_PER_PAGE = 10;

  // Filter history based on search
  const filteredHistory = history.filter(record => {
    const text = (record.email + ' ' + record.companyName + ' ' + record.subject).toLowerCase();
    return text.includes(searchTerm.toLowerCase().trim());
  });

  // Sort descending by sentAt (recent first)
  const sortedHistory = [...filteredHistory].sort((a, b) => {
    return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
  });

  // Calculate pages
  const totalPages = Math.ceil(sortedHistory.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedHistory = sortedHistory.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Jump to page 1 if search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleDelete = (id: string, email: string) => {
    if (window.confirm(`Remove ${email} from your sent history? This removes their duplicate protection.`)) {
      onDeleteRecord(id);
    }
  };

  // Export records to CSV format
  const exportToCSV = () => {
    if (history.length === 0) {
      alert('Your sent history is empty. No data to export.');
      return;
    }

    // Header row
    const headers = ['id', 'email', 'companyName', 'sentAt', 'senderEmail', 'subject', 'body'];
    
    // Escaping helper to ensure double-quotes in body/subject parsed correctly in CSV
    const escapeCSV = (value: string) => {
      if (value === null || value === undefined) return '';
      const text = String(value);
      if (text.includes('"') || text.includes(',') || text.includes('\n') || text.includes('\r')) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };

    const rows = history.map(record => [
      escapeCSV(record.id),
      escapeCSV(record.email),
      escapeCSV(record.companyName),
      escapeCSV(record.sentAt),
      escapeCSV(record.senderEmail),
      escapeCSV(record.subject),
      escapeCSV(record.body)
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `recruiters_sent_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sync / Import sent history from a CSV uploaded file
  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError(null);
    setCsvSuccess(null);
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setCsvError('Unable to read the CSV file contents.');
        return;
      }

      try {
        // Parsing custom robust CSV parser to handle nested quotes & newlines inside subjects/bodies
        const records = parseHistoryCSV(text);
        if (records.length === 0) {
          setCsvError('No valid recruiter records found in the uploaded CSV.');
          return;
        }

        onSyncHistory(records);
        setCsvSuccess(`Successfully synchronized ${records.length} recruiter tracking records!`);
        setTimeout(() => setCsvSuccess(null), 4000);
      } catch (err: any) {
        setCsvError(`CSV Import Syntax Error: ${err.message || 'Malformed structure'}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Complex CSV regex parser that correctly handles escaped quotes, newlines, commas inside fields
   */
  const parseHistoryCSV = (text: string): RecruiterRecord[] => {
    const lines: string[] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentField = '';

    // Walk string character by character to correctly slice field values avoiding split(',') issues
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (c === '"') {
          if (next === '"') {
            // Escaped quote: "" -> "
            currentField += '"';
            i++;
          } else {
            // End quote
            inQuotes = false;
          }
        } else {
          currentField += c;
        }
      } else {
        if (c === '"') {
          inQuotes = true;
        } else if (c === ',') {
          row.push(currentField);
          currentField = '';
        } else if (c === '\n' || c === '\r') {
          if (c === '\r' && next === '\n') {
            i++; // skip standard CRLF
          }
          row.push(currentField);
          if (row.some(field => field.trim() !== '')) {
            lines.push(JSON.stringify(row));
          }
          row = [];
          currentField = '';
        } else {
          currentField += c;
        }
      }
    }

    if (currentField || row.length > 0) {
      row.push(currentField);
      lines.push(JSON.stringify(row));
    }

    if (lines.length <= 1) {
      throw new Error('CSV is empty or missing headers row');
    }

    // First line are the headers
    const headers = JSON.parse(lines[0]) as string[];
    const required = ['email'];
    const missing = required.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      throw new Error(`CSV is missing mandatory columns: ${missing.join(', ')}`);
    }

    // Helper indices
    const emailIdx = headers.indexOf('email');
    const idIdx = headers.indexOf('id');
    const companyIdx = headers.indexOf('companyName');
    const sentAtIdx = headers.indexOf('sentAt');
    const senderEmailIdx = headers.indexOf('senderEmail');
    const subjectIdx = headers.indexOf('subject');
    const bodyIdx = headers.indexOf('body');

    const imported: RecruiterRecord[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const dataRow = JSON.parse(lines[i]) as string[];
      if (dataRow.length < headers.length) continue; // skip broken lines

      const email = dataRow[emailIdx]?.trim();
      if (!email || !email.includes('@')) continue; // validate essential emails

      // Fallback extraction if domain properties missing
      const company = companyIdx !== -1 && dataRow[companyIdx] 
        ? dataRow[companyIdx] 
        : extractCompanyName(email);
      
      const sentTime = sentAtIdx !== -1 && dataRow[sentAtIdx] 
        ? dataRow[sentAtIdx] 
        : new Date().toISOString();

      imported.push({
        id: idIdx !== -1 && dataRow[idIdx] ? dataRow[idIdx] : crypto.randomUUID(),
        email,
        companyName: company,
        sentAt: sentTime,
        senderEmail: senderEmailIdx !== -1 && dataRow[senderEmailIdx] ? dataRow[senderEmailIdx] : 'manmeet.8623@gmail.com',
        subject: subjectIdx !== -1 && dataRow[subjectIdx] ? dataRow[subjectIdx] : '',
        body: bodyIdx !== -1 && dataRow[bodyIdx] ? dataRow[bodyIdx] : '',
      });
    }

    return imported;
  };

  const clearAllHistory = () => {
    if (window.confirm('🚨 EMERGENCY WARNING!\n\nAre you sure you want to permanently delete all recruiter history records? This removes duplicate-checking tracking entirely.')) {
      onClearAll();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
      
      {/* Header toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            4. Recruiter Cold Sent History
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Display lists of recruiters contacted. Keeps automatic record locks to shield you from resending duplicates.
          </p>
        </div>

        {/* Action Button toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={clearAllHistory}
              type="button"
              className="px-3.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
            >
              Clear Log History
            </button>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-750 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
            title="Import tracking CSV back into browser storage"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            Sync App CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVImport}
            className="hidden"
          />

          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer"
            title="Download full backup spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            Download CSV
          </button>
        </div>
      </div>

      {csvError && (
        <div className="mb-4 bg-rose-50 border border-rose-100 text-rose-850 rounded-xl p-3.5 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{csvError}</span>
        </div>
      )}

      {csvSuccess && (
        <div className="mb-4 bg-emerald-50 border border-emerald-100 text-emerald-850 rounded-xl p-3.5 text-xs flex items-center gap-2.5">
          <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-semibold">{csvSuccess}</span>
        </div>
      )}

      {/* Interactive Filtering bar */}
      <div className="flex items-center gap-2 mb-4 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Filter logs by email domain, company name, subject..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-base md:text-xs text-slate-800 placeholder-slate-400 border-none outline-none focus:ring-0 focus:outline-none"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-[10px] uppercase font-mono text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {sortedHistory.length === 0 ? (
        <div className="bg-slate-50/40 rounded-xl border border-dashed border-slate-200 py-10 px-4 text-center">
          <History className="w-8 h-8 text-slate-300 mx-auto mb-2.5" />
          <p className="text-xs font-semibold text-slate-600">No logs found</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {searchTerm ? 'Try widening your search terms or filters.' : 'Your recruitment applications tracking is clean and open!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="min-w-full divide-y divide-slate-150">
              <thead className="bg-slate-50/80">
                <tr className="divide-x divide-slate-100">
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                    Company
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                    Recruiter Email
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                    Sent From
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                    Sent Date & Time
                  </th>
                  <th scope="col" className="relative px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-150 font-sans text-xs text-slate-700">
                {paginatedHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40 divide-x divide-slate-100 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-900 border-l border-indigo-500/20">
                      {item.companyName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-600">
                      {item.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                      {item.senderEmail}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(item.sentAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-xs font-semibold space-x-1.5">
                      <button
                        onClick={() => setSelectedRecord(item)}
                        title="Review applied email text"
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/60 p-1.5 rounded-md cursor-pointer transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.email)}
                        title="Remove duplicate protection log"
                        className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/60 p-1.5 rounded-md cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Simple structural Pagination controls */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3 flex-wrap gap-3">
            <span className="text-[11px] text-slate-500 font-mono">
              Showing <span className="font-semibold text-slate-700">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-slate-700">
                {Math.min(startIndex + ITEMS_PER_PAGE, sortedHistory.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-700">{sortedHistory.length}</span> contacts
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-md disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </button>
              
              <div className="text-xs font-semibold text-slate-600 font-mono px-2">
                Page {currentPage} of {totalPages}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-md disabled:opacity-40 transition-all cursor-pointer"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER / POPUP OVERLAY */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-100 shadow-2xl flex flex-col max-h-[85vh] animate-slide-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-150 bg-slate-50/80 rounded-t-2xl">
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">
                  Applied to {selectedRecord.companyName}
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  ID: {selectedRecord.id} | Sent on {new Date(selectedRecord.sentAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 px-2 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Contents */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Recipient</span>
                  <span className="font-mono text-slate-700">{selectedRecord.email}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">Sender Email</span>
                  <span className="font-mono text-slate-700">{selectedRecord.senderEmail}</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono mb-1">Subject Line</span>
                <div className="px-3 py-2 bg-slate-50 rounded-lg border border-slate-150 text-xs font-semibold text-slate-800 leading-relaxed font-sans">
                  {selectedRecord.subject}
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono mb-1">Cover Letter Message</span>
                <div className="px-3.5 py-3 bg-slate-50 rounded-xl border border-slate-150 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed font-mono">
                  {selectedRecord.body}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="p-4 border-t border-slate-150 bg-slate-50/50 flex justify-end rounded-b-2xl">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
