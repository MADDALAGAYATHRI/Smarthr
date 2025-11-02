import React, { useState } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import type { Application, ApplicationStatus, Job, Candidate } from '../../types';
import LiveInterview from './LiveInterview';
import EmailDraftModal from './EmailDraftModal';

type ApplicationWithDetails = Application & { job: Job; candidate: Candidate; };

const ProgressTracker = ({ status }: { status: ApplicationStatus }) => {
    const steps = ['Under Review', 'Interviewing', 'Hired'];
    const currentStepIndex = steps.indexOf(status);
    const isRejected = status === 'Rejected';

    const progressPercentage = isRejected ? 0 : currentStepIndex >= 0 ? (currentStepIndex / (steps.length - 1)) * 100 : 0;

    return (
        <div className="w-full">
            <div className="relative flex justify-between items-center">
                {/* Background line */}
                <div className="absolute top-3 left-0 w-full h-1 bg-slate-200"></div>
                {/* Progress line */}
                <div 
                    className="absolute top-3 left-0 h-1 bg-primary transition-all duration-500"
                    style={{ width: `${progressPercentage}%` }}
                ></div>

                {steps.map((step, index) => {
                    const isCompleted = !isRejected && index < currentStepIndex;
                    const isActive = !isRejected && index === currentStepIndex;
                    
                    return (
                        <div key={step} className="relative z-10 flex flex-col items-center w-24">
                            <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors border-2 ${
                                    isRejected ? 'bg-slate-100 border-slate-300' : 
                                    (isCompleted || isActive) ? 'bg-primary border-primary' : 'bg-white border-slate-300'
                                }`}
                            >
                                {isCompleted ? (
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                ) : (
                                    isActive && <div className="w-2 h-2 rounded-full bg-white"></div>
                                )}
                            </div>
                            <p className={`mt-2 text-xs font-semibold text-center ${
                                isRejected ? 'text-slate-400' : 
                                (isCompleted || isActive) ? 'text-primary' : 'text-slate-500'
                            }`}>
                                {step}
                            </p>
                        </div>
                    );
                })}
            </div>
            {isRejected && (
                <p className="mt-3 text-center text-sm font-bold text-red-600 bg-red-50 py-2 rounded-lg border border-red-200">Application Rejected</p>
            )}
        </div>
    );
};


const MyApplications = () => {
    const { getApplicationsForCurrentUser, logEmail } = useSmartHire();
    const applications = getApplicationsForCurrentUser();
    const [interviewingApp, setInterviewingApp] = useState<ApplicationWithDetails | null>(null);
    const [draftingEmailJob, setDraftingEmailJob] = useState<Job | null>(null);
    
    const handleSendEmail = (subject: string, body: string) => {
        if (!draftingEmailJob) return;
        
        // Log the email for the HR user to see in their notifications
        logEmail({
            userId: draftingEmailJob.hrId,
            candidateId: applications.find(a => a.jobId === draftingEmailJob.id)?.candidateId,
            jobTitle: draftingEmailJob.title,
            subject,
            body,
        });
        
        setDraftingEmailJob(null);
        alert('Your email has been sent to the hiring manager!');
    };


    if (interviewingApp) {
        return <LiveInterview application={interviewingApp} onClose={() => setInterviewingApp(null)} />;
    }

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
        <>
            {draftingEmailJob && (
                <EmailDraftModal 
                    job={draftingEmailJob} 
                    onClose={() => setDraftingEmailJob(null)}
                    onSend={handleSendEmail}
                />
            )}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-4">My Applications</h3>
                <ul className="space-y-4">
                    {applications.map((app) => (
                        <li key={app.id} className="p-4 border border-slate-200 rounded-lg transition-shadow hover:shadow-md hover:border-slate-300">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                                <div>
                                    <h4 className="font-bold text-lg text-slate-800">{app.job.title}</h4>
                                    <p className="text-sm text-slate-500">Applied on: {new Date(app.candidate.appliedAt).toLocaleDateString()}</p>
                                </div>
                                <div className="text-center flex-shrink-0 mt-2 sm:mt-0">
                                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">ATS Score</p>
                                    <p className={`font-bold text-xl ${app.candidate.score >= 70 ? 'text-primary' : app.candidate.score >= 50 ? 'text-slate-700' : 'text-slate-500'}`}>{app.candidate.score}</p>
                                </div>
                            </div>

                            <ProgressTracker status={app.status} />
                            
                            <div className="mt-4 pt-4 border-t border-slate-200/80 flex flex-wrap gap-2">
                                <button 
                                    onClick={() => setDraftingEmailJob(app.job)}
                                    className="text-sm font-semibold text-primary hover:text-primary-dark bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md transition-colors"
                                >
                                    Draft Follow-up
                                </button>
                                {app.status === 'Interviewing' && !app.videoInterviewUrl && (
                                        <button 
                                        onClick={() => setInterviewingApp(app)}
                                        className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md transition-colors flex items-center space-x-2 animate-pulse"
                                    >
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 001.553.832l3-2a1 1 0 000-1.664l-3-2z"></path></svg>
                                        <span>Start Live AI Interview</span>
                                    </button>
                                )}
                                {app.videoInterviewUrl && (
                                    <span className="text-sm font-semibold text-indigo-800 bg-indigo-100 px-3 py-1.5 rounded-md flex items-center space-x-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                        <span>Interview Completed</span>
                                    </span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
};

export default MyApplications;
