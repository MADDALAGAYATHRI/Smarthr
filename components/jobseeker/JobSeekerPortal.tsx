
import React, { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import type { Job, JobMatchScore, JobRecommendation, Question, ConversationHistory, ChatMessage } from '../../types';
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
const SELF_VIDEO_QUESTION = 'Please introduce yourself and explain why you are a great fit for this role.';

const Tooltip = ({ text, children, className }: { text: string; children: React.ReactNode; className?: string; }) => (
    <div className={`relative group ${className || ''}`}>
        {children}
        <div className="absolute bottom-full mb-2 w-max max-w-xs px-3 py-1.5 text-xs text-white bg-slate-900 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" role="tooltip">
            {text}
            <svg className="absolute text-slate-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
                <polygon className="fill-current" points="0,0 127.5,127.5 255,0"></polygon>
            </svg>
        </div>
    </div>
);

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
                <circle className="stroke-slate-200" strokeWidth="5" fill="transparent" r={radius} cx={size / 2} cy={size / 2}></circle>
                <circle
                    className={`${getStrokeColor()} transition-all duration-1000 ease-out`}
                    strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round" fill="transparent"
                    r={radius} cx={size / 2} cy={size / 2}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                ></circle>
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

interface VideoRecorderModalProps {
    question: string;
    onClose: () => void;
    onRecordingComplete: (blob: Blob) => void;
}

const VideoRecorderModal = ({ question, onClose, onRecordingComplete }: VideoRecorderModalProps) => {
    const [status, setStatus] = useState<'idle' | 'recording' | 'preview' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const previewVideoRef = useRef<HTMLVideoElement>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    
    useEffect(() => {
        const setupMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                mediaStreamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Media device error:", err);
                setError("Could not access camera/microphone. Please check permissions.");
                setStatus('error');
            }
        };
        setupMedia();
        
        return () => {
            mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        };
    }, []);
    
    const startRecording = () => {
        if (!mediaStreamRef.current) return;
        recordedChunksRef.current = [];
        mediaRecorderRef.current = new MediaRecorder(mediaStreamRef.current, { mimeType: 'video/webm' });
        mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunksRef.current.push(e.data);
            }
        };
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            if (previewVideoRef.current) {
                previewVideoRef.current.src = URL.createObjectURL(blob);
            }
            setStatus('preview');
        };
        mediaRecorderRef.current.start();
        setStatus('recording');
    };
    
    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
    };

    const handleUseVideo = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        onRecordingComplete(blob);
    };

    const handleRerecord = () => {
        recordedChunksRef.current = [];
        if (previewVideoRef.current && previewVideoRef.current.src) {
            URL.revokeObjectURL(previewVideoRef.current.src);
            previewVideoRef.current.src = "";
        }
        setStatus('idle');
    };

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Video Introduction</h3>
                <p className="text-slate-600 mb-4 p-3 bg-slate-50 rounded-lg border">Question: <span className="font-semibold">{question}</span></p>

                <div className="relative w-full aspect-video bg-slate-900 rounded-lg overflow-hidden mb-4 border-4 border-slate-200 shadow-lg">
                    {status !== 'preview' && (
                        <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]"></video>
                    )}
                    {status === 'preview' && (
                        <video ref={previewVideoRef} controls className="w-full h-full object-contain"></video>
                    )}
                    {status === 'recording' && (
                        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-full animate-pulse"><div className="w-2.5 h-2.5 bg-white rounded-full"></div><span>REC</span></div>
                    )}
                </div>

                {status === 'error' && <p className="text-red-500 text-center">{error}</p>}

                <div className="flex justify-center items-center space-x-4">
                    {status === 'idle' && (
                        <button onClick={startRecording} className="bg-red-600 text-white font-bold py-3 px-8 rounded-full hover:bg-red-700 flex items-center space-x-2">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                            <span>Start Recording</span>
                        </button>
                    )}
                    {status === 'recording' && (
                        <button onClick={stopRecording} className="bg-slate-700 text-white font-bold py-3 px-8 rounded-full hover:bg-slate-800 flex items-center space-x-2">
                             <div className="w-3 h-3 bg-white rounded-sm"></div>
                            <span>Stop Recording</span>
                        </button>
                    )}
                    {status === 'preview' && (
                        <>
                            <button onClick={handleRerecord} className={buttonSecondary}>Re-record</button>
                            <button onClick={handleUseVideo} className={buttonPrimary}>Use This Video</button>
                        </>
                    )}
                </div>
                 <button onClick={onClose} className="absolute top-4 right-4 text-3xl font-light text-slate-500 hover:text-slate-800">&times;</button>
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
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [isRecording, setIsRecording] = useState(false);
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
        if (!resumeFile && !userProfile) { // require resume only if no profile exists
            setApplyError("Please select a resume file to apply.");
            return;
        }
        if (job.isVideoIntroRequired && !videoBlob) {
            setApplyError("A video introduction is required for this application.");
            return;
        }
        setIsApplying(true);
        setApplyError(null);
        try {
            await uploadResume(job.id, resumeFile!, videoBlob); // resumeFile will be present or we use existing from profile
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
         if (job.isVideoIntroRequired && !videoBlob) {
            setOptimizerError("Please record your video introduction before applying with an optimized resume.");
            // We don't close the optimizer modal, so the user can see the error
            return;
        }
        setIsApplying(true);
        setApplyError(null);
        try {
            await uploadResume(job.id, optimizedFile, videoBlob);
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
                    <p className="text-slate-800">Analyzing your resume & video with Gemini...</p>
                </div>
            )
        }
        if (!userProfile) {
            return (
                 <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                    <h4 className="font-bold text-slate-800 mb-1">Apply for this Job</h4>
                    <p className="text-sm text-slate-600 -mt-3 mb-3">Your profile will be automatically created from your resume upon your first application.</p>
                    
                    <div>
                        <label htmlFor="resume-upload-no-profile" className="block text-sm font-semibold text-slate-700 mb-2">1. Upload Your Resume</label>
                        <input id="resume-upload-no-profile" type="file" onChange={handleFileChange} accept=".txt,.pdf,.md,.docx" required className={`${inputStyle} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30`} />
                        {resumeFile && <p className="text-xs text-slate-600 mt-1">Selected: {resumeFile.name}</p>}
                    </div>

                    {job.isVideoIntroRequired && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">2. Record Video Introduction</label>
                            <p className="text-xs text-slate-500 mb-2">{SELF_VIDEO_QUESTION}</p>
                            {videoBlob ? (
                                <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200">
                                    <p className="font-semibold text-green-800">Video recorded!</p>
                                    <button type="button" onClick={() => setIsRecording(true)} className="text-sm font-semibold text-primary hover:underline">Re-record</button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => setIsRecording(true)} className="w-full font-semibold py-2 px-4 rounded-lg transition-all duration-300 bg-gradient-accent text-white hover:brightness-110 shadow-sm">Record Answer</button>
                            )}
                        </div>
                    )}

                    <div className="pt-2">
                        <button type="submit" disabled={!resumeFile || (job.isVideoIntroRequired && !videoBlob)} className="w-full bg-gradient-primary text-white font-bold py-2.5 px-6 rounded-lg hover:brightness-110 shadow-md">
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
                    
                     <div>
                        <label htmlFor="resume-upload-profile" className="block text-sm font-semibold text-slate-700 mb-2">1. Upload or Update Resume</label>
                        <input id="resume-upload-profile" type="file" onChange={handleFileChange} accept=".txt,.pdf,.md,.docx" className={`${inputStyle} file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30`} />
                        {resumeFile ? <p className="text-xs text-slate-600 mt-1">New resume selected: {resumeFile.name}</p> : <p className="text-xs text-slate-600 mt-1">If no file is selected, your existing resume will be used.</p>}
                    </div>

                    {job.isVideoIntroRequired && (
                        <div className="mt-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">2. Record Video Introduction</label>
                            <p className="text-xs text-slate-500 mb-2">{SELF_VIDEO_QUESTION}</p>
                            {videoBlob ? (
                                <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg border border-green-200">
                                    <p className="font-semibold text-green-800">Video recorded!</p>
                                    <button type="button" onClick={() => setIsRecording(true)} className="text-sm font-semibold text-primary hover:underline">Re-record</button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => setIsRecording(true)} className="w-full font-semibold py-2 px-4 rounded-lg transition-all duration-300 bg-gradient-accent text-white hover:brightness-110 shadow-sm">Record Answer</button>
                            )}
                        </div>
                    )}
                    
                     <div className="pt-4">
                        <button type="submit" disabled={job.isVideoIntroRequired && !videoBlob} className="w-full bg-gradient-primary text-white font-bold py-2.5 px-6 rounded-lg hover:brightness-110 shadow-md">
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
        {isRecording && (
            <VideoRecorderModal
                question={SELF_VIDEO_QUESTION}
                onClose={() => setIsRecording(false)}
                onRecordingComplete={(blob) => {
                    setVideoBlob(blob);
                    setIsRecording(false);
                    setApplyError(null);
                }}
            />
        )}
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
                    <img src={job.companyLogo} alt={`${job.companyName} Logo`} className="w-10 h-10 rounded-md mt-1" />
                    <div>
                        <h4 className="font-bold text-lg text-slate-900 group-hover:text-primary transition-colors">{job.title}</h4>
                        <p className="text-sm text-slate-500">{job.companyName}</p>
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
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
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
                     <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
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
    const { emailAgentMessages, runEmailAgentStream, loading, emailAgentHistory, clearEmailAgentHistory } = useSmartHire();
    const [prompt, setPrompt] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (emailAgentMessages.length === 1 && emailAgentMessages[0].role === 'user') {
            setPrompt(emailAgentMessages[0].parts[0].text);
        }
    }, [emailAgentMessages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [emailAgentMessages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || loading) return;
        await runEmailAgentStream(prompt);
        setPrompt('');
    };

    if (!isOpen) {
        return null;
    }

    const renderMessageContent = (message: ChatMessage) => {
        // Simple markdown for bold text **text**
        const parts = message.parts[0].text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            return part;
        });
        return <p>{parts}</p>;
    };

    return (
        <div className="fixed bottom-4 right-4 sm:right-8 w-[calc(100%-2rem)] sm:w-96 h-[70vh] max-h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 animate-fade-in-up border border-slate-200">
            <header className="p-4 border-b flex justify-between items-center flex-shrink-0">
                <div>
                    <h3 className="font-bold text-lg text-slate-900">AI Career Assistant</h3>
                    <p className="text-xs text-slate-500">Your personal job application helper.</p>
                </div>
                <div className="flex items-center space-x-2">
                    {emailAgentHistory.length > 0 && (
                        <button onClick={clearEmailAgentHistory} className="text-slate-500 hover:text-slate-800 p-1 rounded-full text-xs" title="Clear History">Clear</button>
                    )}
                    <button onClick={onClose} className="text-3xl font-light leading-none text-slate-500 hover:text-slate-800">&times;</button>
                </div>
            </header>
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {emailAgentMessages.length === 0 && (
                    <div className="text-center text-slate-500 h-full flex flex-col justify-center">
                        <p>I can help you draft professional emails, like follow-ups or thank you notes.</p>
                        <p className="mt-2 text-xs">Example: "Draft a follow up for the Frontend Developer job."</p>
                    </div>
                )}
                {emailAgentMessages.map((msg, i) => (
                     <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-sm font-bold">AI</div>}
                        <div className={`p-3 rounded-xl max-w-xs text-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-800'}`}>
                            {renderMessageContent(msg)}
                        </div>
                    </div>
                ))}
                 {loading && <div className="text-center text-slate-500 text-sm">Thinking...</div>}
                <div ref={messagesEndRef} />
            </div>
            <footer className="p-4 border-t flex-shrink-0">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ask to draft an email..." className={inputStyle} disabled={loading} />
                    <button type="submit" className="bg-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-dark disabled:bg-slate-300" disabled={loading || !prompt.trim()}>Send</button>
                </form>
            </footer>
        </div>
    );
};


type Tab = 'available' | 'saved' | 'applications' | 'profile' | 'alerts' | 'notifications' | 'calendar';

const JobSeekerPortal = () => {
    const [activeTab, setActiveTab] = useState<Tab>('available');
    const [filters, setFilters] = useState({ searchTerm: '', workModel: 'All', location: 'All', datePosted: 'Any Time' });
    const [sortBy, setSortBy] = useState<'relevance' | 'date'>('relevance');
    const { jobs, savedJobs, getEmailsForCurrentUser, isEmailAgentOpen, closeEmailAgent, openEmailAgent } = useSmartHire();
    
    const notificationsCount = getEmailsForCurrentUser().filter(e => !e.read).length;

    const getTabClass = (tabId: Tab) => `relative px-3 py-2 rounded-md font-semibold transition-colors text-sm flex items-center space-x-2 ${activeTab === tabId ? 'text-primary' : 'text-slate-600 hover:text-primary'}`;
    
    const handleProfileCreated = () => {
        alert("Profile successfully created from your resume! You can now manage your job alerts and view AI-powered recommendations.");
        setActiveTab('available');
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'available':
                return <AvailableJobs filters={filters} sortBy={sortBy} onNavigateToApplications={() => setActiveTab('applications')} onNavigateToProfile={() => setActiveTab('profile')} />;
            case 'saved':
                return <SavedJobs onNavigateToApplications={() => setActiveTab('applications')} onNavigateToProfile={() => setActiveTab('profile')} />;
            case 'applications':
                return <MyApplications />;
            case 'profile':
                return <UserProfile onProfileCreated={handleProfileCreated} />;
            case 'alerts':
                return <JobAlertManager />;
            case 'notifications':
                return <NotificationsLog />;
            case 'calendar':
                return <JobSeekerCalendarView />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <EmailAgentWidget isOpen={isEmailAgentOpen} onClose={closeEmailAgent} />
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-3xl font-bold text-slate-900">Job Seeker Portal</h2>
                 <button onClick={() => openEmailAgent()} className="bg-gradient-accent text-white font-bold py-2 px-4 rounded-lg hover:brightness-110 flex items-center space-x-2 shadow-sm whitespace-nowrap">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    <span>AI Assistant</span>
                </button>
            </div>
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
                    <button onClick={() => setActiveTab('available')} className={getTabClass('available')}><span>Available Jobs</span>{activeTab === 'available' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}</button>
                    <button onClick={() => setActiveTab('saved')} className={getTabClass('saved')}><span>Saved Jobs ({savedJobs.size})</span>{activeTab === 'saved' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}</button>
                    <button onClick={() => setActiveTab('applications')} className={getTabClass('applications')}><span>My Applications</span>{activeTab === 'applications' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}</button>
                    <button onClick={() => setActiveTab('profile')} className={getTabClass('profile')}><span>My Profile</span>{activeTab === 'profile' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}</button>
                    <button onClick={() => setActiveTab('alerts')} className={getTabClass('alerts')}><span>Job Alerts</span>{activeTab === 'alerts' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}</button>
                    <button onClick={() => setActiveTab('notifications')} className={getTabClass('notifications')}><span>Notifications {notificationsCount > 0 && <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{notificationsCount}</span>}</span>{activeTab === 'notifications' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}</button>
                    <button onClick={() => setActiveTab('calendar')} className={getTabClass('calendar')}><span>Calendar</span>{activeTab === 'calendar' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}</button>
                </nav>
            </div>
            <div className="animate-fade-in-up">
                {renderContent()}
            </div>
        </div>
    );
};

export default JobSeekerPortal;