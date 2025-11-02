

import React, { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import type { Job, JobMatchScore, JobRecommendation, Question } from '../../types';
import MyApplications from './MyApplications';
import NotificationsLog from './NotificationsLog';
import JobAlertManager from './JobAlertManager';
import UserProfile from './UserProfile';
import JobSeekerCalendarView from './JobSeekerCalendarView';

const timeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)} years ago`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)} months ago`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)} days ago`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)} hours ago`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)} minutes ago`;
    return `${Math.floor(seconds)} seconds ago`;
};

const inputStyle = "w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow";
const buttonPrimary = "bg-gradient-primary text-white font-bold py-2.5 px-6 rounded-lg hover:brightness-110 transition-all duration-300 shadow-md hover:shadow-lg disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed";
const buttonSecondary = "bg-slate-100 text-slate-800 font-bold py-2.5 px-6 rounded-lg hover:bg-slate-200 transition-colors";

const ScoreDonut = ({ score, size = 56 }: { score?: number; size?: number; }) => {
    if (score === undefined || score === null) return null;
    const radius = size / 2 - 5;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const getStrokeColor = () => {
        if (score >= 75) return 'stroke-primary';
        if (score >= 50) return 'stroke-accent-dark';
        return 'stroke-red-500';
    };
    const getTextColor = () => {
        if (score >= 75) return 'text-primary-dark';
        if (score >= 50) return 'text-accent-dark';
        return 'text-red-600';
    };
    
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="absolute" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle className="stroke-slate-200" strokeWidth="5" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
                <circle
                    className={`${getStrokeColor()} transition-all duration-1000 ease-out`}
                    strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round" fill="transparent"
                    r={radius} cx={size / 2} cy={size / 2}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </svg>
            <span className={`text-base font-bold ${getTextColor()}`}>{score}</span>
        </div>
    );
};


const JobDetailSection = ({title, content}: {title: string; content?: string}) => {
    if(!content) return null;
    return (
         <div className="mb-4">
            <h4 className="font-bold text-slate-800 text-base">{title}</h4>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{content}</p>
        </div>
    )
}

interface ResumeOptimizerModalProps {
    result: { optimizedResume: string; changes: string[] };
    jobTitle: string;
    onApply: (optimizedText: string) => void;
    onClose: () => void;
    isApplying: boolean;
}

const ResumeOptimizerModal = ({ result, jobTitle, onApply, onClose, isApplying }: ResumeOptimizerModalProps) => {
    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-4xl border-2 border-primary/20 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                 <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900">Resume Optimizer</h3>
                        <p className="text-slate-600">AI-powered suggestions for the <span className="font-semibold">{jobTitle}</span> role.</p>
                    </div>
                    <button onClick={onClose} className="text-3xl font-light text-slate-500 hover:text-slate-800">&times;</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow min-h-0">
                    <div className="bg-slate-50 p-4 rounded-lg border flex flex-col">
                         <h4 className="font-bold text-slate-800 mb-2">Key Changes & Rationale</h4>
                         <ul className="list-disc list-inside space-y-2 text-sm text-slate-700 overflow-y-auto">
                            {result.changes.map((change, i) => <li key={i}>{change}</li>)}
                         </ul>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border flex flex-col">
                        <h4 className="font-bold text-slate-800 mb-2">Optimized Resume Draft</h4>
                        <textarea 
                            readOnly 
                            value={result.optimizedResume} 
                            className="w-full h-full flex-grow bg-white rounded p-2 border border-slate-200 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                </div>

                <div className="flex justify-end items-center space-x-4 pt-6 mt-auto">
                    <button onClick={onClose} className={buttonSecondary}>Back to Job</button>
                    <button onClick={() => onApply(result.optimizedResume)} className={buttonPrimary} disabled={isApplying}>
                        {isApplying ? 'Submitting...' : 'Apply with Optimized Resume'}
                    </button>
                </div>
            </div>
        </div>
    )
};

const JobQnAView = ({ job }: { job: Job }) => {
    const { getQuestionsForJob, askQuestion } = useSmartHire();
    const questions = getQuestionsForJob(job.id);
    const [questionText, setQuestionText] = useState('');

    const handleAskQuestion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!questionText.trim()) return;
        askQuestion(job.id, questionText);
        setQuestionText('');
    };

    return (
        <div className="mb-4">
            <h4 className="font-bold text-slate-800 text-base mb-2">Community Q&A</h4>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <form onSubmit={handleAskQuestion} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={questionText}
                        onChange={(e) => setQuestionText(e.target.value)}
                        placeholder="Ask a question about the role or company..."
                        className={inputStyle + " text-sm"}
                    />
                    <button type="submit" className="bg-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors text-sm flex-shrink-0">Ask</button>
                </form>

                {questions.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {questions.map(q => (
                            <div key={q.id} className="text-sm">
                                <p className="font-semibold text-slate-800">Q: {q.questionText}</p>
                                {q.answer ? (
                                    <p className="mt-1 text-slate-600 pl-4 border-l-2 border-primary">
                                        <span className="font-semibold text-primary">A:</span> {q.answer.answerText}
                                    </p>
                                ) : (
                                    <p className="mt-1 text-slate-500 text-xs pl-4">Awaiting answer from the hiring team...</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-500 text-center py-2">No questions yet. Be the first to ask!</p>
                )}
            </div>
        </div>
    );
};

interface JobDetailModalProps {
    job: Job;
    hasApplied: boolean;
    onClose: () => void;
    onNavigateToApplications: () => void;
    onNavigateToProfile: () => void;
}
const JobDetailModal = ({ job, hasApplied, onClose, onNavigateToApplications, onNavigateToProfile }: JobDetailModalProps) => {
    const { uploadResume, loading, error: contextError, getUserProfileForCurrentUser, optimizeResumeForJob } = useSmartHire();
    const userProfile = getUserProfileForCurrentUser();

    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [isApplying, setIsApplying] = useState(false);
    const [applyError, setApplyError] = useState<string | null>(null);

    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizationResult, setOptimizationResult] = useState<{ optimizedResume: string; changes: string[] } | null>(null);
    const [optimizerError, setOptimizerError] = useState<string|null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setResumeFile(e.target.files[0]);
            setApplyError(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resumeFile) {
            setApplyError("Please select a resume file to apply.");
            return;
        }
        setIsApplying(true);
        setApplyError(null);
        try {
            await uploadResume(job.id, resumeFile);
            alert('Application submitted successfully! You can track its status in the "My Applications" tab.');
            onClose();
        } catch (err) {
            console.error("Application error:", err);
            setApplyError(err instanceof Error ? err.message : 'Failed to submit application. Please try again.');
        } finally {
            setIsApplying(false);
        }
    };

    const handleOptimize = async () => {
        setIsOptimizing(true);
        setOptimizerError(null);
        try {
            const res = await optimizeResumeForJob(job.id);
            setOptimizationResult(res);
        } catch(err) {
            setOptimizerError(err instanceof Error ? err.message : 'Failed to optimize resume.');
        } finally {
            setIsOptimizing(false);
        }
    };
    
    const handleApplyWithOptimized = async (optimizedText: string) => {
        const optimizedFile = new File([optimizedText], 'Optimized_Resume.txt', { type: 'text/plain' });
        setIsApplying(true);
        setApplyError(null);
        try {
            await uploadResume(job.id, optimizedFile);
            alert('Optimized application submitted successfully!');
            setOptimizationResult(null);
            onClose();
        } catch (err) {
            console.error("Optimized application error:", err);
            setApplyError(err instanceof Error ? err.message : 'Failed to submit application. Please try again.');
        } finally {
            setIsApplying(false);
        }
    };

    const renderApplicationArea = () => {
        if (isApplying || loading) {
             return (
                <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-slate-800">Analyzing your resume with Gemini...</p>
                </div>
            )
        }
        if (!userProfile) {
            return (
                 <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                    <h4 className="font-bold text-slate-800 mb-1">Apply for this Job</h4>
                    <p className="text-sm text-slate-600 -mt-3 mb-3">Your profile will be automatically created from your resume upon your first application.</p>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-grow w-full">
                            <label htmlFor="resume-upload" className="sr-only">Upload Resume</label>
                            <input id="resume-upload" type="file" onChange={handleFileChange} accept=".txt,.pdf,.md,.docx" required className={`${inputStyle} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30`} />
                            {resumeFile && <p className="text-xs text-slate-600 mt-1">Selected: {resumeFile.name}</p>}
                        </div>
                        <button type="submit" className="w-full sm:w-auto flex-shrink-0 bg-gradient-primary text-white font-bold py-2.5 px-6 rounded-lg hover:brightness-110 shadow-md">
                            Submit Application
                        </button>
                    </div>
                     {(applyError || contextError) && <p className="text-red-500 text-sm mt-2 text-center">{applyError || contextError}</p>}
                </form>
            )
        }
        return (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                <form onSubmit={handleSubmit}>
                    <h4 className="font-bold text-slate-800 mb-3">Apply with your current resume</h4>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-grow w-full">
                            <label htmlFor="resume-upload" className="sr-only">Upload Resume</label>
                            <input id="resume-upload" type="file" onChange={handleFileChange} accept=".txt,.pdf,.md,.docx" className={`${inputStyle} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30`} />
                            {resumeFile && <p className="text-xs text-slate-600 mt-1">Selected: {resumeFile.name}</p>}
                        </div>
                        <button type="submit" className="w-full sm:w-auto flex-shrink-0 bg-gradient-primary text-white font-bold py-2.5 px-6 rounded-lg hover:brightness-110 shadow-md">
                            Submit Application
                        </button>
                    </div>
                     {(applyError || contextError) && <p className="text-red-500 text-sm mt-2 text-center">{applyError || contextError}</p>}
                </form>

                <div className="border-t border-slate-200 my-4"></div>

                <div>
                     <h4 className="font-bold text-slate-800 mb-1">Or, get an edge with AI</h4>
                     <p className="text-sm text-slate-600 mb-3">Let Gemini rewrite your resume to perfectly match this job's requirements and boost your ATS score.</p>
                     {isOptimizing ? (
                          <div className="text-center py-2">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                                <p className="text-slate-600 text-sm">Optimizing your resume...</p>
                            </div>
                     ) : (
                         <button onClick={handleOptimize} className="w-full font-semibold py-2.5 px-4 rounded-lg transition-all duration-300 bg-gradient-accent text-white hover:brightness-110 shadow-md hover:shadow-lg transform hover:scale-105">
                           ✨ Optimize Resume with AI
                         </button>
                     )}
                     {optimizerError && <p className="text-red-500 text-sm mt-2 text-center">{optimizerError}</p>}
                </div>
            </div>
        )
    };

    return (
        <>
        {optimizationResult && (
            <ResumeOptimizerModal 
                result={optimizationResult}
                jobTitle={job.title}
                onClose={() => setOptimizationResult(null)}
                onApply={handleApplyWithOptimized}
                isApplying={isApplying}
            />
        )}
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-3xl border-2 border-primary/20 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                         <h3 className="text-2xl font-bold text-slate-900">{job.title}</h3>
                         <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500 mt-2">
                             {job.location && <span className="flex items-center"><svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>{job.location}</span>}
                             {job.salary && <span className="flex items-center"><svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01"></path></svg>{job.salary}</span>}
                             {job.workModel && <span className="flex items-center"><svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>{job.workModel}</span>}
                             {job.applicationDeadline && <span className="flex items-center"><svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>Deadline: {new Date(job.applicationDeadline).toLocaleDateString()}</span>}
                             <span className="flex items-center"><svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>Posted: {timeAgo(job.createdAt)}</span>
                         </div>
                    </div>
                    <button onClick={onClose} className="text-3xl font-light text-slate-500 hover:text-slate-800">&times;</button>
                </div>

                <div className="space-y-4 mb-6">
                    <JobDetailSection title="Job Description" content={job.description} />
                    <JobDetailSection title="Role & Responsibilities" content={job.roleAndResponsibilities} />
                    <JobDetailSection title="Required Skills & Qualifications" content={job.requirements} />
                    <JobDetailSection title="Company Culture" content={job.companyCulture} />
                    <JobQnAView job={job} />
                </div>
                
                {hasApplied ? (
                     <div className="bg-sky-50 p-4 rounded-lg border border-sky-200 text-center">
                        <h4 className="font-bold text-sky-800 mb-2">Application Submitted</h4>
                        <p className="text-sm text-sky-700 mb-3">You have already applied for this position. You can track your progress in the "My Applications" tab.</p>
                        <button onClick={onNavigateToApplications} className="bg-sky-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-sky-700 transition-colors text-sm">
                            View My Application
                        </button>
                    </div>
                ) : (
                    renderApplicationArea()
                )}
            </div>
        </div>
        </>
    );
};

interface JobCardProps {
    job: Job;
    score?: number;
    reason?: string;
    hasApplied: boolean;
    isSaved: boolean;
    onSelect: () => void;
    onSaveToggle: () => void;
}
const JobCard = ({ job, score, reason, hasApplied, isSaved, onSelect, onSaveToggle }: JobCardProps) => (
     <div className={`relative p-5 rounded-xl border flex flex-col group transition-all duration-300 shadow-card hover:shadow-card-hover hover:-translate-y-1 ${reason ? 'bg-primary/5 border-primary/30' : 'bg-white border-slate-200'}`}>
        <div className="flex-grow">
            <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                    <img src={`https://picsum.photos/seed/${job.id}/40/40`} alt="Company Logo" className="w-10 h-10 rounded-md mt-1" />
                    <div>
                        <h4 className="font-bold text-lg text-slate-900 group-hover:text-primary transition-colors">{job.title}</h4>
                        <p className="text-sm text-slate-500">A Great Company Inc.</p>
                    </div>
                </div>
                {score !== undefined && (
                    <div className="text-center">
                        <ScoreDonut score={score} />
                        <p className="text-xs text-slate-500 font-semibold mt-1">Match</p>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 my-4">
                <span className="flex items-center bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs font-semibold"><svg className="w-4 h-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>{job.location || 'Remote'}</span>
                <span className="flex items-center bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs font-semibold"><svg className="w-4 h-4 mr-1.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>{job.workModel}</span>
            </div>

            {reason && (
                 <div className="my-2 p-3 bg-primary/10 rounded-lg text-sm text-primary-dark flex items-start space-x-2">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                     <span><span className="font-bold">AI Insight:</span> {reason}</span>
                 </div>
            )}
            <p className="text-sm text-slate-600 line-clamp-2 mt-1">{job.description}</p>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200/80 flex items-center justify-between">
            <span className="text-xs text-slate-500">Posted {timeAgo(job.createdAt)}</span>
             <button 
                onClick={onSelect} 
                className={`font-semibold py-2 px-5 rounded-lg transition-all duration-300 text-sm shadow-sm ${hasApplied ? 'bg-slate-100 text-slate-800 hover:bg-slate-200' : 'text-white bg-gradient-primary hover:brightness-110 transform hover:scale-105'}`}
            >
                {hasApplied ? 'View Details' : 'View & Apply'}
            </button>
        </div>

        {hasApplied && <div className="absolute top-4 right-4 text-xs font-bold bg-sky-100 text-sky-800 px-2 py-1 rounded-full">Applied</div>}
        {isSaved && <div className="absolute top-4 right-4 text-xs font-bold bg-amber-100 text-amber-800 px-2 py-1 rounded-full">Saved</div>}
        {reason && <div className="absolute top-4 right-4 text-xs font-bold bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">Recommended</div>}
         
        <button onClick={(e) => { e.stopPropagation(); onSaveToggle(); }} className={`absolute top-4 left-4 text-slate-400 hover:text-primary transition-colors p-1.5 rounded-full ${isSaved ? 'bg-amber-100/80' : 'bg-slate-100/80'}`} aria-label={isSaved ? 'Unsave job' : 'Save job'}>
            <svg className={`w-5 h-5 ${isSaved ? 'text-amber-500' : ''}`} fill={isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
        </button>

    </div>
);


interface JobGridProps {
    jobs: Job[];
    onNavigateToApplications: () => void;
    onNavigateToProfile: () => void;
    recommendations?: JobRecommendation[];
    scores?: JobMatchScore[];
    emptyStateTitle: string;
    emptyStateMessage: string;
}
const JobGrid = ({ jobs, onNavigateToApplications, onNavigateToProfile, recommendations = [], scores = [], emptyStateTitle, emptyStateMessage }: JobGridProps) => {
    const { appliedJobIds, savedJobs, saveJob, unsaveJob } = useSmartHire();
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    return (
         <Fragment>
            {selectedJob && 
                <JobDetailModal 
                    job={selectedJob} 
                    hasApplied={appliedJobIds.has(selectedJob.id)}
                    onClose={() => setSelectedJob(null)} 
                    onNavigateToApplications={() => {
                        setSelectedJob(null);
                        onNavigateToApplications();
                    }}
                    onNavigateToProfile={() => {
                        setSelectedJob(null);
                        onNavigateToProfile();
                    }}
                />
            }
            
            {jobs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jobs.map(job => (
                        // FIX: Wrap JobCard in a Fragment with a key to resolve the TypeScript error about the key prop.
                         <Fragment key={job.id}>
                            <JobCard 
                                job={job}
                                score={scores.find(s => s.jobId === job.id)?.matchScore}
                                reason={recommendations.find(r => r.jobId === job.id)?.reason}
                                hasApplied={appliedJobIds.has(job.id)}
                                isSaved={savedJobs.has(job.id)}
                                onSelect={() => setSelectedJob(job)}
                                onSaveToggle={() => savedJobs.has(job.id) ? unsaveJob(job.id) : saveJob(job.id)}
                            />
                        </Fragment>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-300">
                     <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <h3 className="text-xl font-bold text-slate-800">{emptyStateTitle}</h3>
                    <p className="text-slate-500">{emptyStateMessage}</p>
                </div>
            )}
        </Fragment>
    );
};

interface AvailableJobsProps {
    filters: { searchTerm: string; workModel: string; location: string; datePosted: string; };
    sortBy: 'relevance' | 'date';
    onNavigateToApplications: () => void;
    onNavigateToProfile: () => void;
}
const AvailableJobs = ({ filters, sortBy, onNavigateToApplications, onNavigateToProfile }: AvailableJobsProps) => {
    const { jobs, getUserProfileForCurrentUser, getJobRecommendations } = useSmartHire();
    const [recommendations, setRecommendations] = useState<JobRecommendation[]>([]);
    const [scores, setScores] = useState<JobMatchScore[]>([]);
    const [isLoadingRecs, setIsLoadingRecs] = useState(true);

    const userProfile = getUserProfileForCurrentUser();

    useEffect(() => {
        if (userProfile) {
            setIsLoadingRecs(true);
            getJobRecommendations()
                .then(data => {
                    setRecommendations(data.recommendations);
                    setScores(data.scores);
                })
                .catch(console.error)
                .finally(() => setIsLoadingRecs(false));
        } else {
            setIsLoadingRecs(false);
        }
    }, [userProfile, getJobRecommendations]);


    const filteredAndSortedJobs = useMemo(() => {
        const openJobs = jobs.filter(job => job.status === 'Open');

        const filtered = openJobs.filter(job => {
            const { searchTerm, workModel, location, datePosted } = filters;
            const jobText = `${job.title} ${job.description} ${job.requirements}`.toLowerCase();
            if (searchTerm && !jobText.includes(searchTerm.toLowerCase())) return false;
            if (workModel !== 'All' && job.workModel !== workModel) return false;
            if (location !== 'All' && job.location !== location) return false;
            if (datePosted !== 'Any Time') {
                const now = new Date();
                const jobDate = new Date(job.createdAt);
                let hours = 0;
                if (datePosted === 'Past 24 hours') hours = 24;
                if (datePosted === 'Past week') hours = 24 * 7;
                if (datePosted === 'Past month') hours = 24 * 30;
                if (hours > 0 && now.getTime() - jobDate.getTime() > hours * 60 * 60 * 1000) {
                    return false;
                }
            }
            return true;
        });

        if (sortBy === 'date') {
            return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        // Default to relevance: show recommended jobs first
        return filtered.sort((a, b) => {
            const scoreA = scores.find(s => s.jobId === a.id)?.matchScore ?? -1;
            const scoreB = scores.find(s => s.jobId === b.id)?.matchScore ?? -1;
            if (scoreA !== scoreB) return scoreB - scoreA;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [jobs, filters, sortBy, scores]);
    
    if (isLoadingRecs) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-6 rounded-xl bg-white border border-slate-200 animate-pulse">
                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-4"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2 mb-6"></div>
                        <div className="space-y-2">
                            <div className="h-3 bg-slate-200 rounded"></div>
                            <div className="h-3 bg-slate-200 rounded"></div>
                            <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                        </div>
                        <div className="h-10 bg-slate-200 rounded-lg mt-6"></div>
                    </div>
                ))}
            </div>
        );
    }
            
    return (
        <JobGrid
            jobs={filteredAndSortedJobs}
            recommendations={recommendations}
            scores={scores}
            onNavigateToApplications={onNavigateToApplications}
            onNavigateToProfile={onNavigateToProfile}
            emptyStateTitle="No Jobs Found"
            emptyStateMessage="Your search and filter criteria did not match any open positions. Try broadening your search."
        />
    );
};

interface SavedJobsProps {
    onNavigateToApplications: () => void;
    onNavigateToProfile: () => void;
}
const SavedJobs = ({ onNavigateToApplications, onNavigateToProfile }: SavedJobsProps) => {
    const { jobs, savedJobs } = useSmartHire();
    
    const savedJobsList = useMemo(() => {
        return jobs.filter(job => savedJobs.has(job.id));
    }, [jobs, savedJobs]);

    return (
        <JobGrid
            jobs={savedJobsList}
            onNavigateToApplications={onNavigateToApplications}
            onNavigateToProfile={onNavigateToProfile}
            emptyStateTitle="No Saved Jobs"
            emptyStateMessage="You haven't saved any jobs yet. Click the bookmark icon on a job to save it for later."
        />
    );
};


interface EmailAgentWidgetProps {
    isOpen: boolean;
    onClose: () => void;
}
const EmailAgentWidget = ({ isOpen, onClose }: EmailAgentWidgetProps) => {
    const { emailAgentMessages, runEmailAgentStream, loading, requestAgentStop, openEmailAgent } = useSmartHire();
    const [prompt, setPrompt] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [emailAgentMessages]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!prompt.trim() || loading) return;
        runEmailAgentStream(prompt);
        setPrompt('');
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => openEmailAgent()}
                className="fixed bottom-6 right-6 bg-primary text-white rounded-full p-4 shadow-lg hover:bg-primary-dark transition-transform hover:scale-110 z-50"
                aria-label="Open Email Assistant"
            >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            </button>
        );
    }
    
    return (
        <div className="fixed bottom-6 right-6 w-full max-w-sm h-[500px] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                <div className="flex items-center space-x-2">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    <h3 className="text-lg font-bold text-slate-900">Email Assistant</h3>
                </div>
                <button onClick={onClose} className="text-2xl font-light text-slate-500 hover:text-slate-800">&times;</button>
            </div>
            
             <div className="flex-grow p-4 overflow-y-auto flex flex-col space-y-4">
                {emailAgentMessages.length === 0 && (
                    <div className="m-auto text-center text-slate-500 px-4">
                        <p className="font-semibold">Need help drafting an email?</p>
                        <p className="text-sm">Try asking: "Help me write a follow-up email for my application to the Frontend Engineer role."</p>
                    </div>
                )}
                {emailAgentMessages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                        {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 font-bold text-sm">AI</div>}
                        <div className={`max-w-xs p-3 rounded-lg ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-slate-200 text-slate-800'}`}>
                           <pre className="whitespace-pre-wrap font-sans text-sm">{msg.parts.map(p => p.text).join('')}</pre>
                        </div>
                    </div>
                ))}
                 {loading && emailAgentMessages.some(m => m.role === 'user') && (
                     <div className="flex items-start gap-3 self-start">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 font-bold text-sm">AI</div>
                        <div className="max-w-xs p-3 rounded-lg bg-slate-200 text-slate-800">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:-.3s]"></div>
                                <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse [animation-delay:-.15s]"></div>
                                <div className="w-2 h-2 bg-slate-500 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    </div>
                 )}
                <div ref={messagesEndRef} />
            </div>

             <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200">
                 <div className="flex gap-2">
                    <input type="text" placeholder="Ask your assistant..." value={prompt} onChange={e => setPrompt(e.target.value)} className={inputStyle} disabled={loading} />
                    {loading ? (
                         <button type="button" onClick={requestAgentStop} className="bg-red-500 text-white font-bold py-2 px-3 rounded-lg hover:bg-red-600 transition-colors">
                            Stop
                        </button>
                    ) : (
                        <button type="submit" className="bg-primary text-white font-bold py-2 px-3 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed" disabled={!prompt.trim()}>
                            Send
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

const JobSeekerPortal = () => {
    type Tab = 'available' | 'saved' | 'applications' | 'notifications' | 'alerts' | 'calendar' | 'profile';
    const [activeTab, setActiveTab] = useState<Tab>('available');
    
    const { jobs, currentUser, isEmailAgentOpen, closeEmailAgent } = useSmartHire();
    // FIX: Use a type predicate in the filter to ensure TypeScript correctly infers
    // that `uniqueLocations` is an array of strings, not `(string | undefined)[]`.
    // This resolves the error where an undefined value could be used as a React key.
    const uniqueLocations = useMemo(() => [...new Set(jobs.map(j => j.location).filter((l): l is string => !!l))], [jobs]);

    // Filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [workModel, setWorkModel] = useState('All');
    const [location, setLocation] = useState('All');
    const [datePosted, setDatePosted] = useState('Any Time');
    const [sortBy, setSortBy] = useState<'relevance' | 'date'>('relevance');

    const handleClearFilters = () => {
        setSearchTerm('');
        setWorkModel('All');
        setLocation('All');
        setDatePosted('Any Time');
        setSortBy('relevance');
    };

    const tabs: { id: Tab; label: string; icon: React.ReactElement }[] = [
        { id: 'available', label: 'Available Jobs', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> },
        { id: 'saved', label: 'Saved Jobs', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg> },
        { id: 'applications', label: 'My Applications', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
        { id: 'notifications', label: 'Notifications', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
        { id: 'alerts', label: 'Job Alerts', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg> },
        { id: 'calendar', label: 'My Calendar', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> },
        { id: 'profile', label: 'My Profile', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    ];

    const getTabClass = (tabId: Tab) => `relative flex items-center space-x-2 px-3 sm:px-4 py-2.5 rounded-lg font-semibold transition-colors text-sm whitespace-nowrap ${activeTab === tabId ? 'text-primary' : 'text-slate-600 hover:text-primary'}`;

    const renderContent = () => {
        const navProps = { 
            onNavigateToApplications: () => setActiveTab('applications'),
            onNavigateToProfile: () => setActiveTab('profile')
        };
        switch (activeTab) {
            case 'available': return <AvailableJobs filters={{ searchTerm, workModel, location, datePosted }} sortBy={sortBy} {...navProps} />;
            case 'saved': return <SavedJobs {...navProps} />;
            case 'applications': return <MyApplications />;
            case 'notifications': return <NotificationsLog />;
            case 'alerts': return <JobAlertManager />;
            case 'calendar': return <JobSeekerCalendarView />;
            case 'profile': return <UserProfile onProfileCreated={() => setActiveTab('available')} />;
            default: return null;
        }
    };

    return (
        <div className="relative">
            <h2 className="text-3xl font-bold text-slate-900">Job Seeker Dashboard</h2>
            <p className="text-slate-600 mt-1 mb-6">Welcome back, {currentUser?.name}. Let's find your next opportunity.</p>

            <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={getTabClass(tab.id)} aria-current={activeTab === tab.id}>
                            {tab.icon}
                            <span className="hidden md:inline">{tab.label}</span>
                             {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'available' && (
                <div className="bg-white p-4 rounded-xl shadow-card border border-slate-200 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-end">
                    <div className="xl:col-span-2">
                        <label htmlFor="search-term" className="text-sm font-bold text-slate-800 mb-1 block">Search</label>
                        <div className="relative">
                            <input id="search-term" type="text" placeholder="Job title, keyword..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={inputStyle}/>
                            <svg className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="location" className="text-sm font-bold text-slate-800 mb-1 block">Location</label>
                        <select id="location" value={location} onChange={e => setLocation(e.target.value)} className={inputStyle}>
                            <option>All</option>
                            {uniqueLocations.map(loc => <option key={loc}>{loc}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="work-model" className="text-sm font-bold text-slate-800 mb-1 block">Work Model</label>
                        <select id="work-model" value={workModel} onChange={e => setWorkModel(e.target.value)} className={inputStyle}>
                            <option>All</option>
                            <option>On-site</option>
                            <option>Remote</option>
                            <option>Hybrid</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="date-posted" className="text-sm font-bold text-slate-800 mb-1 block">Date Posted</label>
                        <select id="date-posted" value={datePosted} onChange={e => setDatePosted(e.target.value)} className={inputStyle}>
                            <option>Any Time</option>
                            <option>Past 24 hours</option>
                            <option>Past week</option>
                            <option>Past month</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="sort-by" className="text-sm font-bold text-slate-800 mb-1 block">Sort By</label>
                        <select id="sort-by" value={sortBy} onChange={e => setSortBy(e.target.value as 'relevance' | 'date')} className={inputStyle}>
                            <option value="relevance">Relevance</option>
                            <option value="date">Newest</option>
                        </select>
                    </div>
                     <div>
                         <button
                            type="button"
                            onClick={handleClearFilters}
                            className="w-full bg-slate-100 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}


            <div className="mt-6 animate-fade-in-up">
                {renderContent()}
            </div>
            
            <EmailAgentWidget isOpen={isEmailAgentOpen} onClose={closeEmailAgent} />
        </div>
    );
};

export default JobSeekerPortal;