import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '../utils/cn';

interface FileUploadProps {
  onFileProcessed: (content: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileProcessed }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      setError("Please upload a valid CSV file.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      onFileProcessed(text);
    };
    reader.readAsText(file);
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
      <div 
        className={cn(
          "relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl transition-all duration-300 bg-white",
          dragActive ? "border-brand-500 bg-brand-50" : "border-slate-300 hover:border-slate-400",
          error ? "border-red-300 bg-red-50" : ""
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          ref={inputRef}
          type="file" 
          className="hidden" 
          accept=".csv"
          onChange={handleChange}
        />
        
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600 mb-4">
          <Upload size={32} />
        </div>
        
        <h3 className="text-lg font-semibold text-slate-900">Upload Bank Statement</h3>
        <p className="text-sm text-slate-500 mt-2 text-center">
          Drag & drop your CSV here, or click to browse.
          <br/>
          <span className="text-xs opacity-70">(We process everything locally in your browser)</span>
        </p>

        <button 
          onClick={onButtonClick}
          className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-sm"
        >
          Select CSV File
        </button>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-100 px-4 py-2 rounded-lg">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};