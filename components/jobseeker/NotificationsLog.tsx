
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import type { Job, ChatMessage } from '../../types';

const DeadlineCard = ({job}: {job: Job}) => {
    if (!job.applicationDeadline) return null;
    const daysLeft = Math.ceil((new Date(job.applicationDeadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return null;

    return (
        <div className="p-4 bg-white border border-primary/50 rounded-lg flex justify-between items-center">
            <div>
                <p className="font-bold text-slate-800">{job.title}</p>
                <p className="text-sm text-slate-500">{job.location}</p>
            </div>
            <div className="text-center">
                 <p className={`font-bold text-xl ${daysLeft <= 3 ? 'text-red-500' : 'text-primary'}`}>{daysLeft}</p>
                 <p className="text-xs text-slate-500">{daysLeft === 1 ? 'day left' : 'days left'}</p>
            </div>
        </div>
    )
}

const NotificationsLog = () => {
    const { getEmailsForCurrentUser, jobs, savedJobs } = useSmartHire();
    const emails = getEmailsForCurrentUser();

    const upcomingDeadlines = useMemo(() => {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return jobs
            .filter(job =>
                job.status === 'Open' &&
                job.applicationDeadline &&
                savedJobs.has(job.id) &&
                new Date(job.applicationDeadline) > now &&
                new Date(job.applicationDeadline) <= sevenDaysFromNow
            )
            .sort((a, b) => new Date(a.applicationDeadline!).getTime() - new Date(b.applicationDeadline!).getTime());
    }, [jobs, savedJobs]);

    return (
        <div className="space-y-8">
            {upcomingDeadlines.length > 0 && (
                 <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Upcoming Deadlines for Saved Jobs</h3>
                    <div className="space-y-3">
                        {upcomingDeadlines.map(job => <DeadlineCard key={job.id} job={job} />)}
                    </div>
                 </div>
            )}

            {emails.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                    <h3 className="text-xl font-bold text-slate-900 mb-4">Communication History</h3>
                    <div className="space-y-4">
                        {emails.map(email => (
                            <div key={email.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                <div className="flex justify-between items-start">
                                     <div>
                                        <p className="font-bold text-slate-800">{email.subject}</p>
                                        <p className="text-xs text-slate-500">For: {email.jobTitle}</p>
                                    </div>
                                    <span className="text-xs text-slate-400">{new Date(email.sentAt).toLocaleString()}</span>
                                </div>
                                <pre className="whitespace-pre-wrap font-sans mt-3 bg-white p-3 rounded text-sm text-slate-700 border border-slate-200">
                                    {email.body}
                                </pre>
                            </div>
                        ))}
                    </div>
                </div>
            )}

             {emails.length === 0 && upcomingDeadlines.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-300">
                    <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <h3 className="text-xl font-bold text-slate-800">Inbox Zero</h3>
                    <p className="text-slate-500">You have no notifications yet. Application updates and job alerts will appear here.</p>
                </div>
            )}
        </div>
    );
};

export default NotificationsLog;