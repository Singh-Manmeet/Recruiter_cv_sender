import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  Trash2, 
  Download, 
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { saveResume, getResume, deleteResume, StoredResume } from '../db';

interface ResumeSectionProps {
  onStatusChange: (uploaded: boolean) => void;
}

export default function ResumeSection({ onStatusChange }: ResumeSectionProps) {
  const [resume, setResume] = useState<StoredResume | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load resume on mount
  useEffect(() => {
    async function load() {
      try {
        const stored = await getResume();
        setResume(stored);
        onStatusChange(!!stored);
      } catch (err) {
        console.error(err);
        setError('Failed to load local resume store.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [onStatusChange]);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF format CV.');
      return;
    }

    // Limit to 10MB to avoid absolute browser performance choke points, even though IndexedDB can store more.
    if (file.size > 10 * 1024 * 1024) {
      setError('File is too large. Please upload a PDF under 10MB.');
      return;
    }

    try {
      setLoading(true);
      const saved = await saveResume(file);
      setResume(saved);
      onStatusChange(true);
    } catch (err: any) {
      setError(err.message || 'Failed to save resume.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteResume();
      setResume(null);
      onStatusChange(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete resume.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resume) return;
    const blob = new Blob([resume.data], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resume.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm transition-all duration-300 hover:shadow-md h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            1. Resume CV Upload
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Store your default PDF CV safely inside your browser
          </p>
        </div>
        {resume && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Ready
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/55 rounded-xl border border-dashed border-slate-200">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
          <span className="text-xs text-slate-500 font-mono">Accessing local storage...</span>
        </div>
      ) : resume ? (
        <div className="flex-1 flex flex-col justify-between bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-sm">
              <FileCheck className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-slate-800 text-sm truncate" title={resume.name}>
                {resume.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-1">
                Size: {formatSize(resume.size)}
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">
                Updated: {new Date(resume.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-6">
            <button
              onClick={handleDownload}
              type="button"
              className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 active:bg-slate-100 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <button
              onClick={handleDelete}
              type="button"
              className="inline-flex items-center justify-center p-2 text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50/50 border border-slate-200 hover:border-rose-100 rounded-lg shadow-sm transition-all cursor-pointer"
              title="Delete Resume CV"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            dragActive
              ? 'border-indigo-500 bg-indigo-50/30'
              : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/30'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf"
            onChange={handleChange}
          />
          <UploadCloud className={`w-10 h-10 mb-2.5 transition-colors ${dragActive ? 'text-indigo-600' : 'text-slate-400'}`} />
          <p className="text-xs font-semibold text-slate-700 text-center">
            Drag & drop PDF here, or <span className="text-indigo-600">browse file</span>
          </p>
          <p className="text-[10px] text-slate-400 text-center mt-1">
            Accepts official PDF formatted CV, MAX 10MB
          </p>
        </div>
      )}
    </div>
  );
}
