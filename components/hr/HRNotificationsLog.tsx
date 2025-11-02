import React, { useEffect } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';

const HRNotificationsLog = () => {
    const { getEmailsForCurrentUser, jobs, currentUser, markEmailsAsReadForCurrentUser } = useSmartHire();
    
    useEffect(() => {
        // When the user views this component, mark all their emails as read.
        if (markEmailsAsReadForCurrentUser) {
            markEmailsAsReadForCurrentUser();
        }
    }, [markEmailsAsReadForCurrentUser]);
    
    const emails = getEmailsForCurrentUser();

    const jobsNeedingProcessing = jobs.filter(job => {
        const deadlinePassed = job.applicationDeadline && new Date(job.applicationDeadline) < new Date();
        return job.hrId === currentUser?.id && deadlinePassed && job.processingStatus !== 'Completed' && job.status === 'Open';
    });

    return (
        <div className="space-y-8">
             <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg text-sm text-sky-800">
                <h4 className="font-bold mb-2 flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <span>New: Automated Email Agent</span>
                </h4>
                <p>To improve communication, application status updates are now automatically emailed to candidates. When you change a candidate's status, our AI agent drafts and sends a professional notification to the email address extracted from their resume.</p>
            </div>

            {jobsNeedingProcessing.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Action Required</h3>
                    <p className="text-slate-600 mb-4">The following job postings have passed their application deadline and are ready for processing:</p>
                    <div className="space-y-3">
                        {jobsNeedingProcessing.map(job => (
                            <div key={job.id} className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="font-bold text-amber-800">{job.title}</p>
                                <p className="text-sm text-amber-700">Deadline was {new Date(job.applicationDeadline!).toLocaleDateString()}.</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-4">My Inbox</h3>
                {emails.length > 0 ? (
                    <div className="space-y-4">
                        {emails.map(email => (
                            <div key={email.id} className={`p-4 border rounded-lg transition-colors ${!email.read ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center space-x-3">
                                        {!email.read && <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0"></div>}
                                        <div>
                                            <p className="font-bold text-slate-800">{email.subject}</p>
                                            <p className="text-xs text-slate-500">Regarding: {email.jobTitle}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400">{new Date(email.sentAt).toLocaleString()}</span>
                                </div>
                                <pre className="whitespace-pre-wrap font-sans mt-3 bg-white p-3 rounded text-sm text-slate-700 border border-slate-200">
                                    {email.body}
                                </pre>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                         <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                        <h3 className="text-xl font-bold text-slate-800">Your Inbox is Empty</h3>
                        <p className="text-slate-500">Notifications, such as new candidate applications, will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HRNotificationsLog;