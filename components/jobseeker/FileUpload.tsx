
import React, { useState, useCallback } from 'react';

interface FileUploadProps {
    onFileChange: (file: File | null) => void;
    acceptedFileTypes?: string;
}

const FileUpload = ({ onFileChange, acceptedFileTypes = ".txt,.pdf,.md,.docx" }: FileUploadProps) => {
    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState('');

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);
    
    const handleFile = useCallback((file: File | null) => {
        if (file) {
            onFileChange(file);
            setFileName(file.name);
        } else {
            onFileChange(null);
            setFileName('');
        }
    }, [onFileChange]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, [handleFile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    return (
        <label 
            htmlFor="file-upload-input"
            onDragEnter={handleDrag} 
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative block p-6 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${dragActive ? 'border-primary bg-primary/10' : 'border-slate-300 bg-slate-50 hover:border-primary'}`}
        >
            <input 
                type="file" 
                id="file-upload-input" 
                className="hidden" 
                accept={acceptedFileTypes}
                onChange={handleChange} 
            />
            
            <div className="flex flex-col items-center justify-center pointer-events-none">
                <svg className="w-12 h-12 text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <p className="font-semibold text-slate-700">
                    <span className="text-primary">Click to upload</span> or drag and drop
                </p>
                <p className="text-sm text-slate-500">TXT, PDF, MD, or DOCX</p>
                {fileName && <p className="mt-4 text-sm font-semibold text-slate-800 bg-slate-200 px-3 py-1 rounded-full">{fileName}</p>}
            </div>
        </label>
    );
};

export default FileUpload;