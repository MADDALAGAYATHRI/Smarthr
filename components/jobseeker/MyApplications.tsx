
import React from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import type { ApplicationStatus } from '../../types';

const statusStyles: Record<ApplicationStatus, string> = {
    'Under Review': 'bg-sky-100 text-sky-800',
    'Interviewing': 'bg-blue-100 text-blue-800',
    'Hired': 'bg-indigo-100 text-indigo-800',
    'Rejected': 'bg-slate-100 text-slate-800',
};

const MyApplications = () => {
    const { getApplicationsForCurrentUser } = useSmartHire();
    const applications = getApplicationsForCurrentUser();

    if (applications.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-300">
                 <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <h3 className="text-xl font-bold text-slate-800">No Applications Yet</h3>
                <p className="text-slate-500">You haven't applied to any jobs. Find your next opportunity in the "Available Jobs" tab!</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4">My Applications</h3>
            <ul className="space-y-4">
                {applications.map(({ id, job, candidate, status }) => (
                    <li key={id} className="p-4 border border-slate-200 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 transition-shadow hover:shadow-md hover:border-slate-300">
                        <div>
                            <h4 className="font-bold text-lg text-slate-800">{job.title}</h4>
                            <p className="text-sm text-slate-500">Applied on: {new Date(candidate.appliedAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                             <div className="text-center">
                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">ATS Score</p>
                                <p className={`font-bold text-xl ${candidate.score >= 70 ? 'text-primary' : candidate.score >= 50 ? 'text-slate-700' : 'text-slate-500'}`}>{candidate.score}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Status</p>
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${statusStyles[status]}`}>
                                    {status}
                                </span>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default MyApplications;