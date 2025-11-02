import React, { useState, Fragment } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import type { Application, ApplicationStatus, Job, Candidate } from '../../types';
import EmailDraftModal from './EmailDraftModal';

type ApplicationWithDetails = Application & { job: Job; candidate: Candidate; };

const ScoreDonut = ({ score, size = 48 }: { score: number; size?: number; }) => {
    if (score === undefined || score === null) return null;
    const radius = size / 2 - 4;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const getStrokeColor = () => {
        if (score >= 80) return 'stroke-primary';
        if (score >= 60) return 'stroke-accent-dark';
        return 'stroke-red-500';
    };
    const getTextColor = () => {
        if (score >= 80) return 'text-primary-dark';
        if (score >= 60) return 'text-accent-dark';
        return 'text-red-600';
    };
    
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="absolute" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle className="stroke-slate-200" strokeWidth="4" fill="transparent" r={radius} cx={size / 2} cy={size / 2}></circle>
                <circle
                    className={`${getStrokeColor()} transition-all duration-1000 ease-out`}
                    strokeWidth="4" strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round" fill="transparent"
                    r={radius} cx={size / 2} cy={size / 2}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                ></circle>
            </svg>
            <span className={`text-sm font-bold ${getTextColor()}`}>{score}</span>
        </div>
    );
};

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
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
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

const ApplicationItem = ({ app }: { app: ApplicationWithDetails }) => {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [draftingEmailJob, setDraftingEmailJob] = useState<Job | null>(null);
    const [viewingVideoUrl, setViewingVideoUrl] = useState<string | null>(null);
    const { logEmail } = useSmartHire();
    
    const handleSendEmail = (subject: string, body: string) => {
        if (!draftingEmailJob) return;
        
        // Log the email for the HR user to see in their notifications
        logEmail({
            userId: draftingEmailJob.hrId,
            candidateId: app.candidateId,
            jobTitle: draftingEmailJob.title,
            subject,
            body,
        });
        
        setDraftingEmailJob(null);
        alert('Your email has been sent to the hiring manager!');
    };

    return (
        <>
            {draftingEmailJob && (
                <EmailDraftModal 
                    job={draftingEmailJob} 
                    onClose={() => setDraftingEmailJob(null)}
                    onSend={handleSendEmail}
                />
            )}
            {viewingVideoUrl && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-[60] p-4" onClick={() => setViewingVideoUrl(null)}>
                    <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-3xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">Self-Introduction Video</h3>
                        <video src={viewingVideoUrl} controls autoPlay className="w-full rounded-lg bg-slate-900"></video>
                        <div className="text-right mt-6">
                            <button onClick={() => setViewingVideoUrl(null)} className="bg-slate-100 text-slate-800 font-bold py-2 px-5 rounded-lg hover:bg-slate-200">Close</button>
                        </div>
                    </div>
                </div>
            )}
             <li className="p-4 border border-slate-200 rounded-lg transition-shadow hover:shadow-md hover:border-slate-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                    <div>
                        <h4 className="font-bold text-lg text-slate-800">{app.job.title}</h4>
                        <p className="text-sm text-slate-500">Applied on: {new Date(app.candidate.appliedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-center flex-shrink-0 mt-2 sm:mt-0">
                        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">ATS Score</p>
                        <ScoreDonut score={app.candidate.score} />
                    </div>
                </div>

                <ProgressTracker status={app.status} />
                
                <div className="mt-4 pt-4 border-t border-slate-200/80 flex flex-wrap gap-2 items-center">
                    <button 
                        onClick={() => setDraftingEmailJob(app.job)}
                        className="text-sm font-semibold text-primary hover:text-primary-dark bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md transition-colors"
                    >
                        Draft Follow-up
                    </button>
                    {app.selfIntroVideoUrl && (
                            <button 
                            onClick={() => setViewingVideoUrl(app.selfIntroVideoUrl!)}
                            className="text-sm font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-md transition-colors"
                        >
                            Review My Video
                        </button>
                    )}
                    {app.interviewScore !== undefined && (
                        <button 
                            onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                            className="text-sm font-semibold text-indigo-800 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-md transition-colors flex items-center space-x-2"
                        >
                             <span>View AI Feedback</span>
                            <svg className={`w-4 h-4 transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                    )}
                </div>
                {isDetailsOpen && app.interviewScore !== undefined && (
                     <div className="mt-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200 animate-fade-in-down">
                        <div className="flex justify-between items-start">
                            <h5 className="font-bold text-indigo-900 mb-2">AI Video Analysis</h5>
                            <div className="text-right">
                                <p className="text-xs text-indigo-700 font-semibold uppercase">Overall Score</p>
                                <p className="font-bold text-xl text-indigo-900">{app.interviewScore}</p>
                            </div>
                        </div>
                        <p className="text-sm text-indigo-800 italic">"{app.aiEvaluationSummary}"</p>
                         <p className="text-xs text-indigo-600 mt-3">This feedback is generated by AI and is one of many factors considered by the hiring team.</p>
                    </div>
                )}
            </li>
        </>
    )
}

const MyApplications = () => {
    const { getApplicationsForCurrentUser } = useSmartHire();
    const applications = getApplicationsForCurrentUser();
    
    if (applications.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-300">
                 <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <h3 className="text-xl font-bold text-slate-800">No Applications Yet</h3>
                <p className="text-slate-500">You haven't applied to any jobs. Find your next opportunity in the "Available Jobs" tab!</p>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-4">My Applications</h3>
            <ul className="space-y-4">
                {applications.map((app) => (
                    <Fragment key={app.id}>
                        <ApplicationItem app={app} />
                    </Fragment>
                ))}
            </ul>
        </div>
    );
};

export default MyApplications;