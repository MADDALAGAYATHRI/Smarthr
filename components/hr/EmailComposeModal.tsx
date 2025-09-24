
import React, { useState, useEffect, useCallback } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import type { Candidate, Job, ApplicationStatus } from '../../types';

interface EmailComposeModalProps {
    candidate: Candidate;
    job: Job;
    status: ApplicationStatus;
    onClose: () => void;
    onSend: (subject: string, body: string) => void;
}

const EmailComposeModal = ({ candidate, job, status, onClose, onSend }: EmailComposeModalProps) => {
    const { generateFollowUpEmail } = useSmartHire();
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getStatusText = (status: ApplicationStatus) => {
        const map: Record<ApplicationStatus, { verb: string; color: string }> = {
            'Interviewing': { verb: 'Invite', color: 'blue' },
            'Hired': { verb: 'Hire', color: 'blue' },
            'Rejected': { verb: 'Reject', color: 'slate' },
            'Under Review': { verb: 'Update', color: 'slate' },
        };
        return map[status] || { verb: 'Update', color: 'slate' };
    }

    const fetchEmailDraft = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const draft = await generateFollowUpEmail(candidate.id, job.id, status);
            setSubject(draft.subject);
            setBody(draft.body);
        } catch (err) {
            console.error("Failed to generate email draft:", err);
            setError(err instanceof Error ? err.message : "Could not generate email draft.");
        } finally {
            setIsLoading(false);
        }
    }, [generateFollowUpEmail, candidate.id, job.id, status]);

    useEffect(() => {
        fetchEmailDraft();
    }, [fetchEmailDraft]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSend(subject, body);
    };

    const statusInfo = getStatusText(status);
    const inputStyle = "w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow";

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl border-2 border-primary/20" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Compose Follow-up Email</h3>
                <p className="text-slate-600 mb-6">
                    You are changing <span className="font-bold">{candidate.name}'s</span> status to 
                    <span className={`font-bold text-${statusInfo.color}-600`}> "{status}"</span>.
                    Review and send the AI-generated email below.
                </p>
                
                {isLoading && (
                     <div className="flex flex-col items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <p className="text-slate-800 mt-4">Generating email draft...</p>
                    </div>
                )}

                {error && (
                    <div className="text-center h-64 flex flex-col justify-center bg-red-50 p-4 rounded-lg">
                        <p className="text-red-700 font-bold">Error Generating Email</p>
                        <p className="text-red-600 text-sm">{error}</p>
                        <button onClick={fetchEmailDraft} className="mt-4 mx-auto px-4 py-2 rounded-lg text-white bg-primary hover:bg-primary-dark font-semibold">
                            Try Again
                        </button>
                    </div>
                )}

                {!isLoading && !error && (
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="subject" className="block text-slate-700 font-bold mb-2">Subject</label>
                            <input type="text" id="subject" value={subject} onChange={e => setSubject(e.target.value)} className={inputStyle} required />
                        </div>
                        <div className="mb-6">
                            <label htmlFor="body" className="block text-slate-700 font-bold mb-2">Body</label>
                            <textarea id="body" value={body} onChange={e => setBody(e.target.value)} rows={10} className={`${inputStyle} font-sans`} required />
                        </div>
                        <div className="flex justify-end space-x-4">
                            <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-slate-800 bg-slate-100 hover:bg-slate-200 font-semibold">Cancel</button>
                            <button type="submit" className="px-6 py-2 rounded-lg text-white bg-primary hover:bg-primary-dark font-semibold">
                                {statusInfo.verb} & Send Email
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default EmailComposeModal;