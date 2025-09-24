
import React, { useState, useMemo, useCallback, Fragment, useEffect, useRef } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import type { Job, Candidate, ApplicationStatus, Question } from '../../types';
import EmailComposeModal from './EmailComposeModal';
import CalendarView from './CalendarView';

// --- STYLE CONSTANTS ---
const inputStyle = "w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow";
const buttonPrimary = "bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed";
const buttonSecondary = "bg-slate-100 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors";

// --- HELPER COMPONENTS ---

const getStatusStyles = (status?: ApplicationStatus) => {
    switch (status) {
        case 'Interviewing': return 'bg-blue-100 text-blue-800';
        case 'Hired': return 'bg-indigo-100 text-indigo-800';
        case 'Rejected': return 'bg-slate-100 text-slate-800';
        case 'Under Review':
        default: return 'bg-sky-100 text-sky-800';
    }
};

const CreateJobModal = ({ onClose }: { onClose: () => void }) => {
    const { createJob, parseJobDescription } = useSmartHire();
    const [isParsing, setIsParsing] = useState(false);
    const [jobData, setJobData] = useState({
        title: '',
        description: '',
        requirements: '',
        location: '',
        salary: '',
        workModel: 'On-site' as 'On-site' | 'Remote' | 'Hybrid',
        applicationDeadline: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setJobData(prev => ({ ...prev, [name]: value }));
    };

    const handleJdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        try {
            const parsedData = await parseJobDescription(file);
            setJobData(prev => ({
                ...prev,
                title: parsedData.title || prev.title,
                description: parsedData.description || prev.description,
                requirements: parsedData.requirements || prev.requirements,
            }));
        } catch (err) {
            console.error("Failed to parse Job Description:", err);
            alert("Could not parse the job description file. Please ensure it's a text-based file and try again.");
        } finally {
            setIsParsing(false);
            e.target.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (jobData.applicationDeadline) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set to start of day for comparison
            const selectedDate = new Date(jobData.applicationDeadline);
             if (selectedDate < today) {
                alert("Application deadline cannot be in the past.");
                return;
            }
        }
        
        createJob(jobData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl border-2 border-primary/20 max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
                {isParsing && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <p className="text-slate-800 mt-4 font-semibold">Parsing Job Description...</p>
                    </div>
                )}
                <h3 className="text-2xl font-bold text-slate-900 mb-6">Create New Job Posting</h3>
                
                <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label htmlFor="jd-upload" className="block text-sm font-bold text-slate-700">Auto-fill with AI</label>
                    <p className="text-xs text-slate-500 mb-2">Upload a job description file (.txt, .md) to let Gemini parse it for you.</p>
                    <input id="jd-upload" type="file" onChange={handleJdUpload} accept=".txt,.md" className={`${inputStyle} file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 cursor-pointer`} />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-slate-700">Job Title</label>
                        <input type="text" name="title" id="title" value={jobData.title} onChange={handleChange} className={inputStyle} required />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
                        <textarea name="description" id="description" value={jobData.description} onChange={handleChange} rows={4} className={inputStyle} required />
                    </div>
                     <div>
                        <label htmlFor="requirements" className="block text-sm font-medium text-slate-700">Requirements</label>
                        <textarea name="requirements" id="requirements" value={jobData.requirements} onChange={handleChange} rows={4} className={inputStyle} required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-slate-700">Location</label>
                            <input type="text" name="location" id="location" value={jobData.location} onChange={handleChange} className={inputStyle} />
                        </div>
                        <div>
                            <label htmlFor="salary" className="block text-sm font-medium text-slate-700">Salary Range</label>
                            <input type="text" name="salary" id="salary" value={jobData.salary} onChange={handleChange} className={inputStyle} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="workModel" className="block text-sm font-medium text-slate-700">Work Model</label>
                            <select name="workModel" id="workModel" value={jobData.workModel} onChange={handleChange} className={inputStyle}>
                                <option>On-site</option>
                                <option>Remote</option>
                                <option>Hybrid</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="applicationDeadline" className="block text-sm font-medium text-slate-700">Application Deadline</label>
                            <input type="date" name="applicationDeadline" id="applicationDeadline" value={jobData.applicationDeadline} onChange={handleChange} className={inputStyle} />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className={buttonSecondary}>Cancel</button>
                        <button type="submit" className={buttonPrimary}>Create Job</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface CandidateRowProps {
    candidate: Candidate;
    onRequestStatusChange: (status: ApplicationStatus) => void;
    currentStatus?: ApplicationStatus;
}

const CandidateRow = ({ candidate, onRequestStatusChange, currentStatus }: CandidateRowProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showResume, setShowResume] = useState(false);
    const applicationDate = new Date(candidate.appliedAt).toLocaleDateString();

    return (
        <>
            {showResume && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-[60] p-4" onClick={() => setShowResume(false)}>
                    <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">Resume: {candidate.name}</h3>
                        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border">{candidate.resumeText}</pre>
                        <div className="text-right mt-6">
                            <button onClick={() => setShowResume(false)} className={buttonSecondary}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        
            <div className="bg-white rounded-lg border border-slate-200 transition-shadow hover:shadow-md">
                <div 
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                    role="button" tabIndex={0}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                >
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 truncate">{candidate.name}</p>
                        <p className="text-sm text-slate-500">Applied: {applicationDate}</p>
                    </div>
                    <div className="flex items-center space-x-4 sm:space-x-6 ml-4">
                        <div className="text-center">
                            <p className="text-xs text-slate-500 font-semibold uppercase">Score</p>
                            <p className={`font-bold text-xl ${candidate.score >= 70 ? 'text-primary' : candidate.score >= 50 ? 'text-slate-700' : 'text-slate-500'}`}>{candidate.score}</p>
                        </div>
                        <div className="w-32 text-center hidden sm:block">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusStyles(currentStatus)}`}>
                                {currentStatus || 'N/A'}
                            </span>
                        </div>
                        <svg className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>

                {isExpanded && (
                    <div className="p-4 border-t border-slate-200 animate-fade-in-down">
                        <p className="text-sm text-slate-600 my-2 bg-slate-50 p-3 rounded border border-slate-200">{candidate.summary}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm my-4">
                            <div>
                                <p className="font-semibold text-slate-700 mb-1">Strengths</p>
                                <ul className="list-disc list-inside space-y-1">
                                    {candidate.strengths.map(s => <li key={s} className="text-slate-600">{s}</li>)}
                                </ul>
                            </div>
                             <div>
                                <p className="font-semibold text-slate-700 mb-1">Weaknesses</p>
                                <ul className="list-disc list-inside space-y-1">
                                    {candidate.weaknesses.map(w => <li key={w} className="text-slate-600">{w}</li>)}
                                </ul>
                            </div>
                        </div>
                         <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <button onClick={() => setShowResume(true)} className={buttonSecondary}>View Full Resume</button>
                            <div className="flex items-center space-x-2">
                                <label htmlFor={`status-${candidate.id}`} className="text-sm font-medium text-slate-700">Update Status:</label>
                                <select
                                    id={`status-${candidate.id}`}
                                    value={currentStatus || 'Under Review'}
                                    onChange={(e) => onRequestStatusChange(e.target.value as ApplicationStatus)}
                                    className="px-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white cursor-pointer"
                                    title="Change candidate status and send email notification."
                                >
                                    <option>Under Review</option>
                                    <option>Interviewing</option>
                                    <option>Rejected</option>
                                    <option>Hired</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

interface AgentProcessingModalProps {
    jobTitle: string;
    onClose: () => void;
}
const AgentProcessingModal = ({ jobTitle, onClose }: AgentProcessingModalProps) => {
    const { processingAgentLogs, loading, error } = useSmartHire();
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [processingAgentLogs]);

    const isFinished = !loading;

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl border-2 border-primary/20" onClick={e => e.stopPropagation()}>
                <div className="flex items-center space-x-3 mb-4">
                    {!isFinished ? (
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    ) : (
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center ${error ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'}`}>
                            {error ? '❌' : '✅'}
                         </div>
                    )}
                    <div>
                         <h3 className="text-2xl font-bold text-slate-900">SmartHire Agent is Processing</h3>
                         <p className="text-slate-600">Job: {jobTitle}</p>
                    </div>
                </div>

                <div className="bg-slate-900 text-white font-mono text-xs rounded-lg p-4 h-64 overflow-y-auto my-6">
                    {processingAgentLogs.map((log, index) => (
                        <p key={index} className="whitespace-pre-wrap animate-fade-in-down" style={{animationDelay: `${index * 50}ms`}}>&gt; {log}</p>
                    ))}
                    <div ref={logsEndRef} />
                </div>
                
                {isFinished && (
                     <div className="text-center">
                        <p className={`font-semibold mb-4 ${error ? 'text-red-600' : 'text-slate-800'}`}>
                            {error ? `Agent stopped due to an error.` : `Agent has completed its task successfully.`}
                        </p>
                        <button onClick={onClose} className={buttonPrimary}>Close</button>
                    </div>
                )}
            </div>
        </div>
    );
};

const JobQnA = ({ job }: { job: Job }) => {
    const { getQuestionsForJob, answerQuestion } = useSmartHire();
    const questions = getQuestionsForJob(job.id);
    const [answerText, setAnswerText] = useState('');
    const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);

    const handleAnswerSubmit = (e: React.FormEvent, questionId: string) => {
        e.preventDefault();
        if (!answerText.trim()) return;
        answerQuestion(questionId, answerText);
        setAnswerText('');
        setAnsweringQuestionId(null);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
            <h4 className="text-xl font-bold text-slate-900 mb-4">Candidate Q&A ({questions.length})</h4>
            {questions.length === 0 ? (
                <p className="text-slate-500 text-sm">No questions have been asked for this job yet.</p>
            ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {questions.map(q => (
                        <div key={q.id} className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                            <p className="text-sm text-slate-600">
                                <span className="font-bold text-slate-800">{q.userName}</span> asked on {new Date(q.createdAt).toLocaleDateString()}:
                            </p>
                            <p className="mt-1 text-slate-800">{q.questionText}</p>
                            {q.answer ? (
                                <div className="mt-3 pt-3 border-t border-slate-300">
                                    <p className="text-sm text-slate-600">
                                        <span className="font-bold text-primary">{q.answer.hrName}</span> replied on {new Date(q.answer.answeredAt).toLocaleDateString()}:
                                    </p>
                                    <p className="mt-1 text-slate-800 whitespace-pre-wrap">{q.answer.answerText}</p>
                                </div>
                            ) : (
                                <div className="mt-3">
                                    {answeringQuestionId === q.id ? (
                                        <form onSubmit={(e) => handleAnswerSubmit(e, q.id)}>
                                            <textarea
                                                value={answerText}
                                                onChange={(e) => setAnswerText(e.target.value)}
                                                className={inputStyle + " text-sm"}
                                                placeholder={`Answer ${q.userName}'s question...`}
                                                rows={3}
                                            />
                                            <div className="flex justify-end space-x-2 mt-2">
                                                <button type="button" onClick={() => setAnsweringQuestionId(null)} className={buttonSecondary + " py-1 px-3 text-sm"}>Cancel</button>
                                                <button type="submit" className={buttonPrimary + " py-1 px-3 text-sm"}>Submit Answer</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <button onClick={() => { setAnsweringQuestionId(q.id); setAnswerText(''); }} className={buttonPrimary + " py-1 px-3 text-sm"}>
                                            Answer
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};


const JobDetail = ({ job, onBack }: { job: Job; onBack: () => void }) => {
    type SortByType = 'score' | 'name' | 'date';
    const { getCandidatesForJob, getApplicationForCandidate, updateApplicationStatus, processApplicationsAgent, exportCandidates, loading, updateJobCriteria, clearProcessingAgentLogs, logEmail } = useSmartHire();
    const candidates = getCandidatesForJob(job.id);
    
    const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
    const [emailModalState, setEmailModalState] = useState<{ candidate: Candidate; job: Job; status: ApplicationStatus } | null>(null);
    const [candidateSearch, setCandidateSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState<SortByType>('score');
    
    const [criteria, setCriteria] = useState({
        minAtsScore: job.minAtsScore || 70,
        numberOfPositions: job.numberOfPositions || 1,
    });
    
    const sortedAndFilteredCandidates = useMemo(() => {
        const filtered = candidates.filter(c => {
            const app = getApplicationForCandidate(c.id);
            if (statusFilter !== 'All' && (!app || app.status !== statusFilter)) {
                return false;
            }
            if (candidateSearch && !c.name.toLowerCase().includes(candidateSearch.toLowerCase())) {
                return false;
            }
            return true;
        });

        return [...filtered].sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'date') return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
            return b.score - a.score;
        });
    }, [candidates, candidateSearch, statusFilter, getApplicationForCandidate, sortBy]);

    const handleCriteriaUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        updateJobCriteria(job.id, criteria);
        alert('Criteria updated!');
    };
    
    const handleProcessApplications = async () => {
        clearProcessingAgentLogs();
        setIsAgentModalOpen(true);
        await processApplicationsAgent(job.id);
    };

    const handleSendEmail = (subject: string, body: string) => {
        if (!emailModalState) return;
        const { candidate, status } = emailModalState;
        const app = getApplicationForCandidate(candidate.id);

        if (app) {
            updateApplicationStatus(app.id, status);
            logEmail({
                userId: candidate.userId,
                candidateId: candidate.id,
                jobTitle: job.title,
                subject,
                body,
            });
        }
        setEmailModalState(null);
    };

    const deadlinePassed = job.applicationDeadline && new Date(job.applicationDeadline) < new Date();
    let processButtonText = 'Processing enabled after deadline';
    let isProcessButtonDisabled = true;

    if (job.processingStatus === 'Completed') {
        processButtonText = 'Processing Complete';
        isProcessButtonDisabled = true;
    } else if (deadlinePassed) {
        processButtonText = 'Finalize & Send Emails';
        isProcessButtonDisabled = loading;
    }

    return (
        <Fragment>
            {emailModalState && (
                <EmailComposeModal
                    candidate={emailModalState.candidate}
                    job={emailModalState.job}
                    status={emailModalState.status}
                    onClose={() => setEmailModalState(null)}
                    onSend={handleSendEmail}
                />
            )}
            {isAgentModalOpen && (
                <AgentProcessingModal 
                    jobTitle={job.title}
                    onClose={() => setIsAgentModalOpen(false)}
                />
            )}
            <div className="mb-6">
                <button onClick={onBack} className="flex items-center text-sm font-semibold text-primary hover:underline">
                     <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    Back to All Jobs
                </button>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{job.title}</h3>
                <p className={`text-sm font-bold ${job.status === 'Open' ? 'text-primary' : 'text-slate-500'}`}>{job.status}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                        <h4 className="text-xl font-bold text-slate-900 mb-4">Candidates ({sortedAndFilteredCandidates.length})</h4>
                        
                        <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex-grow relative">
                                <label htmlFor="candidate-search" className="sr-only">Search Candidates</label>
                                <input id="candidate-search" type="text" placeholder="Search by name..." value={candidateSearch} onChange={e => setCandidateSearch(e.target.value)} className={inputStyle} />
                                <svg className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <div className="flex-shrink-0">
                                <label htmlFor="status-filter" className="sr-only">Filter by Status</label>
                                <select id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={inputStyle}>
                                    <option>All</option>
                                    <option>Under Review</option>
                                    <option>Interviewing</option>
                                    <option>Hired</option>
                                    <option>Rejected</option>
                                </select>
                            </div>
                            <div className="flex-shrink-0">
                                <label htmlFor="sort-by" className="sr-only">Sort by</label>
                                <select id="sort-by" value={sortBy} onChange={e => setSortBy(e.target.value as SortByType)} className={inputStyle}>
                                    <option value="score">Sort by Score</option>
                                    <option value="name">Sort by Name</option>
                                    <option value="date">Sort by Date</option>
                                </select>
                            </div>
                        </div>
                        {sortedAndFilteredCandidates.length > 0 ? (
                             <div className="space-y-4">
                                {sortedAndFilteredCandidates.map(candidate => {
                                    const app = getApplicationForCandidate(candidate.id);
                                    return <CandidateRow
                                        key={candidate.id}
                                        candidate={candidate}
                                        onRequestStatusChange={(newStatus) => {
                                            if (app && app.status !== newStatus) {
                                                setEmailModalState({ candidate, job, status: newStatus });
                                            }
                                        }}
                                        currentStatus={app?.status}
                                    />;
                                })}
                            </div>
                        ) : (
                             <div className="text-center py-10">
                                <p className="text-slate-500">No candidates match the current filters.</p>
                            </div>
                        )}
                    </div>
                    <JobQnA job={job} />
                </div>
                 <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
                        <h4 className="text-xl font-bold text-slate-900 mb-4">Automation & Export</h4>
                        <form onSubmit={handleCriteriaUpdate} className="space-y-4">
                            <div>
                                <label htmlFor="minAtsScore" className="block text-sm font-medium text-slate-700">Minimum ATS Score</label>
                                <input type="number" name="minAtsScore" id="minAtsScore" value={criteria.minAtsScore} onChange={(e) => setCriteria(p => ({...p, minAtsScore: parseInt(e.target.value, 10)}))} className={inputStyle} />
                            </div>
                            <div>
                                <label htmlFor="numberOfPositions" className="block text-sm font-medium text-slate-700">Number of Positions</label>
                                <input type="number" name="numberOfPositions" id="numberOfPositions" value={criteria.numberOfPositions} onChange={(e) => setCriteria(p => ({...p, numberOfPositions: parseInt(e.target.value, 10)}))} className={inputStyle} />
                            </div>
                            <button type="submit" className={buttonSecondary + " w-full"}>Update Criteria</button>
                        </form>
                        <div className="border-t border-slate-200 my-6"></div>
                        <button 
                            onClick={handleProcessApplications}
                            disabled={isProcessButtonDisabled}
                            className={buttonPrimary + " w-full mb-2"}
                        >
                            {loading && !isProcessButtonDisabled ? 'Agent is Working...' : processButtonText}
                        </button>
                        <button 
                            onClick={() => exportCandidates(job.id)}
                            className={buttonSecondary + " w-full"}
                        >
                            Export Candidates (CSV)
                        </button>
                    </div>
                </div>
            </div>
        </Fragment>
    );
};

const JobRow = ({ job, onSelect }: { job: Job; onSelect: () => void; }) => {
    const { getCandidatesForJob } = useSmartHire();
    const candidateCount = getCandidatesForJob(job.id).length;
    const deadlinePassed = job.applicationDeadline && new Date(job.applicationDeadline) < new Date();
    const actionRequired = deadlinePassed && job.processingStatus !== 'Completed' && job.status === 'Open';

    return (
        <div onClick={onSelect} className="p-4 border border-slate-200 rounded-lg flex justify-between items-center cursor-pointer hover:bg-slate-50 hover:shadow-sm transition-all">
            <div>
                <p className="font-bold text-primary">{job.title}</p>
                <p className="text-sm text-slate-500">{job.location || 'Remote'}</p>
            </div>
            <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                    <p className="font-semibold text-slate-700">{candidateCount}</p>
                    <p className="text-slate-500">Candidates</p>
                </div>
                 {actionRequired && (
                    <div className="text-center hidden md:block">
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 animate-pulse">
                            Action Required
                        </span>
                    </div>
                )}
                <div className="text-center">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${job.status === 'Open' ? 'bg-primary/20 text-primary-dark' : 'bg-slate-100 text-slate-600'}`}>
                        {job.status}
                    </span>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </div>
        </div>
    );
};

interface JobListProps {
    jobs: Job[];
    onSelectJob: (id: string) => void;
    onCreateJob: () => void;
}
const JobList = ({ jobs, onSelectJob, onCreateJob }: JobListProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const { currentUser } = useSmartHire();

    const myJobs = useMemo(() => {
        if (!currentUser) return [];
        return jobs
            .filter(job => job.hrId === currentUser.id)
            .filter(job => job.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [jobs, currentUser, searchTerm]);
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-900">My Job Postings ({myJobs.length})</h3>
                <button onClick={onCreateJob} className={buttonPrimary}>
                    + Create New Job
                </button>
            </div>
            <div className="relative mb-4">
                <input type="text" placeholder="Search jobs by title..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={inputStyle} />
                <svg className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            <div className="space-y-4">
                {myJobs.length > 0 ? (
                    myJobs.map(job => <JobRow key={job.id} job={job} onSelect={() => onSelectJob(job.id)} />)
                ) : (
                     <div className="text-center py-10">
                        <p className="text-slate-500">No job postings found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const StrategicAgentView = () => {
    const { strategicAgentLogs, runStrategicHRAgent, loading, clearStrategicAgentLogs, requestAgentStop } = useSmartHire();
    const [prompt, setPrompt] = useState('');
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [strategicAgentLogs]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || loading) return;
        runStrategicHRAgent(prompt);
        setPrompt('');
    };

    return (
         <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M12 6V3m0 18v-3M5.636 5.636l-1.414-1.414m15.556 15.556l-1.414-1.414M19.778 5.636l-1.414 1.414M4.222 19.778l1.414-1.414M12 12a6 6 0 110-12 6 6 0 010 12z"></path></svg>
                    <h3 className="text-xl font-bold text-slate-900">Strategic HR Agent</h3>
                </div>
                <button onClick={clearStrategicAgentLogs} className={buttonSecondary + " text-xs"} disabled={strategicAgentLogs.length === 0}>Clear Log</button>
             </div>
             <p className="text-sm text-slate-600 mb-4">
                Delegate tasks to your AI assistant. You can create, update, or close job postings. Examples:
                <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>"Create a job for a Data Analyst with 2 years experience and a salary of 8-12 LPA."</li>
                    <li>"Based on the 'Frontend Developer' role, create a new posting for a 'Senior Frontend Developer' and add 'Next.js' to the requirements."</li>
                    <li>"Update the location for the 'Backend Engineer' job to 'Austin, TX'."</li>
                    <li>"Close the 'UX Designer' position."</li>
                </ul>
            </p>

            <div className="bg-slate-900 text-white font-mono text-xs rounded-lg p-4 h-80 overflow-y-auto mb-4">
                {strategicAgentLogs.length === 0 && <p className="text-slate-400">&gt; Agent is standing by for instructions...</p>}
                {strategicAgentLogs.map((log, index) => (
                    <p key={index} className="whitespace-pre-wrap animate-fade-in-down" style={{animationDelay: `${index * 20}ms`}}>&gt; {log}</p>
                ))}
                {loading && <div className="animate-pulse">&gt; Agent is thinking...</div>}
                <div ref={logsEndRef} />
            </div>

            <form onSubmit={handleSubmit}>
                <div className="flex gap-4">
                    <input type="text" placeholder="Enter your command..." value={prompt} onChange={e => setPrompt(e.target.value)} className={inputStyle} disabled={loading} />
                    {loading ? (
                        <button type="button" onClick={requestAgentStop} className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600 transition-colors">
                            Stop Agent
                        </button>
                    ) : (
                        <button type="submit" className={buttonPrimary} disabled={!prompt.trim()}>
                            Send
                        </button>
                    )}
                </div>
            </form>
         </div>
    );
};

const MasterAgentView = () => {
    const { masterAgentLogs } = useSmartHire();
    const logsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [masterAgentLogs]);

    return (
         <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
             <div className="flex items-center space-x-3 mb-4">
                 <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 01.517 3.86l-.477 2.387a2 2 0 00.547 1.806a2 2 0 001.806.547l2.387-.477a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l2.387.477a2 2 0 001.806-.547a2 2 0 00.547-1.806l-.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 01-.517-3.86l.477-2.387a2 2 0 00-.547-1.806zM12 15a3 3 0 100-6 3 3 0 000 6z" transform="translate(-2 -3)" /></svg>
                 <h3 className="text-xl font-bold text-slate-900">Master Agent Log</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">The Master Agent is an autonomous supervisor that ensures critical tasks are completed. It periodically checks for jobs with deadlines that have passed by more than two days and automatically processes them if the HR manager hasn't. This log provides a transparent view of its background activities.</p>
            
            <div className="bg-slate-900 text-white font-mono text-xs rounded-lg p-4 h-80 overflow-y-auto">
                {masterAgentLogs.length === 0 && <p className="text-slate-400">&gt; Master Agent initializing... Standing by.</p>}
                {masterAgentLogs.map((log, index) => (
                    <p key={index} className="whitespace-pre-wrap animate-fade-in-down" style={{animationDelay: `${index * 20}ms`}}>&gt; {log}</p>
                ))}
                <div ref={logsEndRef} />
            </div>
         </div>
    );
};

const HRDashboard = () => {
    type Tab = 'postings' | 'calendar' | 'strategic_agent' | 'master_agent';
    const { jobs, selectedJob, selectJob } = useSmartHire();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('postings');

    if (selectedJob) {
        return <JobDetail job={selectedJob} onBack={() => selectJob(null)} />;
    }

    const getTabClass = (tabId: Tab) => `px-3 py-2 rounded-md font-semibold transition-colors text-sm flex items-center space-x-2 ${activeTab === tabId ? 'bg-primary text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`;

    return (
        <div>
            {isCreateModalOpen && <CreateJobModal onClose={() => setIsCreateModalOpen(false)} />}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900">HR Dashboard</h2>
                <div className="bg-white p-1.5 rounded-lg shadow-md border border-slate-200">
                    <div className="flex items-center space-x-1">
                        <button onClick={() => setActiveTab('postings')} className={getTabClass('postings')}>
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                             <span className="hidden sm:inline">Postings</span>
                        </button>
                        <button onClick={() => setActiveTab('calendar')} className={getTabClass('calendar')}>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                           <span className="hidden sm:inline">Calendar</span>
                        </button>
                         <button onClick={() => setActiveTab('strategic_agent')} className={getTabClass('strategic_agent')}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            <span className="hidden sm:inline">Strategic Agent</span>
                         </button>
                         <button onClick={() => setActiveTab('master_agent')} className={getTabClass('master_agent')}>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 01.517 3.86l-.477 2.387a2 2 0 00.547 1.806a2 2 0 001.806.547l2.387-.477a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l2.387.477a2 2 0 001.806-.547a2 2 0 00.547-1.806l-.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 01-.517-3.86l.477-2.387a2 2 0 00-.547-1.806zM12 15a3 3 0 100-6 3 3 0 000 6z" transform="translate(-2 -3)"/></svg>
                           <span className="hidden sm:inline">Master Agent</span>
                         </button>
                    </div>
                </div>
            </div>

            <div className="animate-fade-in-up">
                {activeTab === 'postings' && <JobList jobs={jobs} onSelectJob={(id) => selectJob(id)} onCreateJob={() => setIsCreateModalOpen(true)} />}
                {activeTab === 'calendar' && <CalendarView />}
                {activeTab === 'strategic_agent' && <StrategicAgentView />}
                {activeTab === 'master_agent' && <MasterAgentView />}
            </div>
        </div>
    );
};

export default HRDashboard;
