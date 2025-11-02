import React, { useState, useEffect, useCallback } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import type { Job } from '../../types';

interface EmailDraftModalProps {
    job: Job;
    onClose: () => void;
    onSend: (subject: string, body: string) => void;
}

const EmailDraftModal = ({ job, onClose, onSend }: EmailDraftModalProps) => {
    const { generateSeekerFollowUpEmail } = useSmartHire();
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    const fetchEmailDraft = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const draft = await generateSeekerFollowUpEmail(job.id);
            setSubject(draft.subject);
            setBody(draft.body);
        } catch (err) {
            console.error("Failed to generate email draft:", err);
            setError(err instanceof Error ? err.message : "Could not generate email draft.");
        } finally {
            setIsLoading(false);
        }
    }, [generateSeekerFollowUpEmail, job.id]);

    useEffect(() => {
        fetchEmailDraft();
    }, [fetchEmailDraft]);
    
    const handleSubmit = () => {
        onSend(subject, body);
    };

    const handleCopyToClipboard = () => {
        const fullEmail = `Subject: ${subject}\n\n${body}`;
        navigator.clipboard.writeText(fullEmail).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }).catch(err => {
            console.error("Failed to copy text: ", err);
            alert("Could not copy text to clipboard.");
        });
    };

    const inputStyle = "w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow";

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl border-2 border-primary/20" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Draft Follow-up Email</h3>
                <p className="text-slate-600 mb-6">
                    Review and edit the AI-generated draft for your follow-up on the <span className="font-bold">{job.title}</span> position.
                </p>
                
                {isLoading && (
                     <div className="flex flex-col items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <p className="text-slate-800 mt-4">Drafting with Gemini...</p>
                    </div>
                )}

                {error && (
                    <div className="text-center h-64 flex flex-col justify-center bg-red-50 p-4 rounded-lg">
                        <p className="text-red-700 font-bold">Error Generating Draft</p>
                        <p className="text-red-600 text-sm">{error}</p>
                        <button onClick={fetchEmailDraft} className="mt-4 mx-auto px-4 py-2 rounded-lg text-white bg-primary hover:bg-primary-dark font-semibold">
                            Try Again
                        </button>
                    </div>
                )}

                {!isLoading && !error && (
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="subject" className="block text-slate-700 font-bold mb-2">Subject</label>
                            <input type="text" id="subject" value={subject} onChange={e => setSubject(e.target.value)} className={inputStyle} required />
                        </div>
                        <div>
                            <label htmlFor="body" className="block text-slate-700 font-bold mb-2">Body</label>
                            <textarea id="body" value={body} onChange={e => setBody(e.target.value)} rows={12} className={`${inputStyle} font-sans`} required />
                        </div>
                        <div className="flex justify-end items-center space-x-4">
                            <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-slate-800 bg-slate-100 hover:bg-slate-200 font-semibold">Close</button>
                            <button 
                                onClick={handleCopyToClipboard}
                                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${copySuccess ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'}`}
                            >
                                {copySuccess ? 'Copied!' : 'Copy'}
                            </button>
                            <button 
                                onClick={handleSubmit}
                                className="px-6 py-2 rounded-lg text-white bg-primary hover:bg-primary-dark font-semibold"
                            >
                                Send Email
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmailDraftModal;