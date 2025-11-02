
import React, { useState, useMemo, useCallback, Fragment, useEffect, useRef } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import type { Job, Candidate, ApplicationStatus, Question, Application, CommunicationAnalysis } from '../../types';
import EmailComposeModal from './EmailComposeModal';
import CalendarView from './CalendarView';
import HRNotificationsLog from './HRNotificationsLog';
import VideoAnalysisAgentView from './VideoAnalysisAgentView';

// --- STYLE CONSTANTS ---
const inputStyle = "w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow";
const buttonPrimary = "bg-gradient-primary text-white font-bold py-2 px-4 rounded-lg hover:brightness-110 transition-all duration-300 shadow-md hover:shadow-lg disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed";
const buttonSecondary = "bg-slate-100 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-200 transition-colors";

// --- HELPER COMPONENTS ---

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

const getStatusStyles = (status?: ApplicationStatus) => {
    switch (status) {
        case 'Interviewing': return 'bg-blue-100 text-blue-800';
        case 'Hired': return 'bg-indigo-100 text-indigo-800';
        case 'Rejected': return 'bg-red-100 text-red-800';
        case 'Under Review':
        default: return 'bg-sky-100 text-sky-800';
    }
};

const JobEditorModal = ({ onClose, jobToEdit }: { onClose: () => void, jobToEdit?: Job }) => {
    const { createJob, parseJobDescription, updateJob } = useSmartHire();
    const [isParsing, setIsParsing] = useState(false);
    
    const isEditMode = !!jobToEdit;

    const [jobData, setJobData] = useState({
        title: jobToEdit?.title || '',
        companyName: jobToEdit?.companyName || '',
        description: jobToEdit?.description || '',
        requirements: jobToEdit?.requirements || '',
        location: jobToEdit?.location || '',
        salary: jobToEdit?.salary || '',
        workModel: jobToEdit?.workModel || 'On-site',
        applicationDeadline: jobToEdit?.applicationDeadline ? new Date(jobToEdit.applicationDeadline).toISOString().split('T')[0] : '',
        isVideoIntroRequired: jobToEdit?.isVideoIntroRequired ?? true,
    });

    const [attachments, setAttachments] = useState<{name: string, url: string}[]>(jobToEdit?.attachments || []);
    const [newAttachments, setNewAttachments] = useState<File[]>([]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setJobData(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
    };
    
    const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setNewAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
        }
        e.target.value = ''; // Reset file input
    };
    
    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };
    
    const removeNewAttachment = (index: number) => {
        setNewAttachments(prev => prev.filter((_, i) => i !== index));
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
            alert("Could not parse the job description file. Please ensure the file is not corrupted and try again.");
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
             if (selectedDate < today && !isEditMode) { // Allow past dates in edit mode
                alert("Application deadline cannot be in the past.");
                return;
            }
        }
        
        if (isEditMode) {
            updateJob(jobToEdit.id, { ...jobData, attachments, newAttachments });
        } else {
            createJob({ ...jobData, newAttachments });
        }
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
                <h3 className="text-2xl font-bold text-slate-900 mb-6">{isEditMode ? 'Edit Job Posting' : 'Create New Job Posting'}</h3>
                
                <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <label htmlFor="jd-upload" className="block text-sm font-bold text-slate-700">Auto-fill with AI</label>
                    <p className="text-xs text-slate-500 mb-2">Upload a job description file (.pdf, .txt, .md) to let Gemini parse it for you.</p>
                    <input id="jd-upload" type="file" onChange={handleJdUpload} accept=".pdf,.txt,.md" className={`${inputStyle} file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 cursor-pointer`} />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-slate-700">Job Title</label>
                            <input type="text" name="title" id="title" value={jobData.title} onChange={handleChange} className={inputStyle} required />
                        </div>
                         <div>
                            <label htmlFor="companyName" className="block text-sm font-medium text-slate-700">Company Name</label>
                            <input type="text" name="companyName" id="companyName" value={jobData.companyName} onChange={handleChange} className={inputStyle} />
                        </div>
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
                            <select name="workModel" id="workModel" value={jobData.workModel as string} onChange={handleChange} className={inputStyle}>
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
                     <div>
                        <label className="block text-sm font-medium text-slate-700">Attachments</label>
                        <p className="text-xs text-slate-500 mb-2">Upload any relevant documents (e.g., detailed JD, company benefits PDF).</p>
                        <div className="mt-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            {attachments.length === 0 && newAttachments.length === 0 && <p className="text-xs text-slate-500">No documents attached.</p>}
                            <ul className="space-y-2">
                                {attachments.map((file, index) => (
                                    <li key={index} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{file.name}</a>
                                        <button type="button" onClick={() => removeAttachment(index)} className="text-red-500 hover:text-red-700 font-bold ml-2 text-lg leading-none">&times;</button>
                                    </li>
                                ))}
                                {newAttachments.map((file, index) => (
                                     <li key={index} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                                        <span className="truncate">{file.name}</span>
                                        <button type="button" onClick={() => removeNewAttachment(index)} className="text-red-500 hover:text-red-700 font-bold ml-2 text-lg leading-none">&times;</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="mt-2">
                            <label htmlFor="attachment-upload" className={`${inputStyle} file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 cursor-pointer flex items-center`}>
                                 <svg className="w-4 h-4 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                                Add Files...
                            </label>
                             <input id="attachment-upload" type="file" multiple onChange={handleAttachmentUpload} className="hidden" />
                        </div>
                    </div>
                     <div className="p-4 mt-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="flex items-center">
                           <input
                                type="checkbox"
                                name="isVideoIntroRequired"
                                id="isVideoIntroRequired"
                                checked={jobData.isVideoIntroRequired}
                                onChange={handleChange}
                                className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
                            />
                            <label htmlFor="isVideoIntroRequired" className="ml-3 block text-sm font-medium text-slate-700">
                                Require self-introduction video from candidates
                            </label>
                        </div>
                         <p className="text-xs text-slate-500 mt-2 ml-7">If checked, AI video analysis will run automatically after the job is closed.</p>
                    </div>

                    <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className={buttonSecondary}>Cancel</button>
                        <button type="submit" className={buttonPrimary}>{isEditMode ? 'Save Changes' : 'Create Job'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface ResumeDetailModalProps {
    candidate: Candidate;
    onClose: () => void;
}
const ResumeDetailModal = ({ candidate, onClose }: ResumeDetailModalProps) => {
    const [isRawVisible, setIsRawVisible] = useState(false);

    const Section = ({ title, children, defaultOpen = true }: { title: string, children: React.ReactNode, defaultOpen?: boolean}) => {
        const [isOpen, setIsOpen] = useState(defaultOpen);
        if (!children) return null;
        return (
            <div className="mb-2">
                <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left flex justify-between items-center py-3 px-4 bg-slate-100 hover:bg-slate-200 rounded-lg">
                    <h4 className="text-lg font-bold text-slate-800">{title}</h4>
                    <svg className={`w-5 h-5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                {isOpen && <div className="p-4 animate-fade-in-down">{children}</div>}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-[60] p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex-shrink-0">
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Resume: {candidate.name}</h3>
                </div>
                <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                    <Section title="Professional Summary">
                        <p className="text-slate-700 leading-relaxed">{candidate.summary}</p>
                    </Section>
                    
                    <Section title="Skills">
                        <div className="flex flex-wrap gap-2">
                            {(candidate.skills || []).map(skill => <span key={skill} className="px-3 py-1 rounded-full text-sm font-semibold bg-primary/10 text-primary-dark">{skill}</span>)}
                        </div>
                    </Section>
                    
                    {(candidate.projects || []).length > 0 && (
                        <Section title="Key Projects">
                            <ul className="list-disc list-inside space-y-2 text-slate-700">
                                {candidate.projects!.map((p, i) => <li key={i}>{p}</li>)}
                            </ul>
                        </Section>
                    )}

                    {(candidate.publications || []).length > 0 && (
                        <Section title="Publications">
                            <ul className="list-disc list-inside space-y-2 text-slate-700">
                                {candidate.publications!.map((p, i) => <li key={i}>{p}</li>)}
                            </ul>
                        </Section>
                    )}

                    {(candidate.certifications || []).length > 0 && (
                        <Section title="Certifications">
                            <ul className="list-disc list-inside space-y-2 text-slate-700">
                                {candidate.certifications!.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                        </Section>
                    )}
                    
                     <Section title="Full Resume Text" defaultOpen={false}>
                        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border">{candidate.resumeText}</pre>
                    </Section>
                </div>

                <div className="text-right mt-6 flex-shrink-0">
                    <button onClick={onClose} className={buttonSecondary}>Close</button>
                </div>
            </div>
        </div>
    )
}

interface CandidateRowProps {
    job: Job;
    candidate: Candidate;
    application: Application;
}

const CandidateRow = ({ job, candidate, application }: CandidateRowProps) => {
    const { runVideoAnalysisAgent, analyzingVideoAppIds, updateApplicationStatus, updatingStatusAppIds } = useSmartHire();
    const [isExpanded, setIsExpanded] = useState(false);
    const [showResume, setShowResume] = useState(false);
    const [showSelfIntro, setShowSelfIntro] = useState(false);
    const applicationDate = new Date(candidate.appliedAt).toLocaleDateString();
    const isAnalyzing = analyzingVideoAppIds.has(application.id);
    const isUpdating = updatingStatusAppIds.has(application.id);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-primary';
        if (score >= 60) return 'text-slate-700';
        return 'text-slate-500';
    }

    const SkillBreakdownDisplay = ({ skills, title }: { skills: {skill:string, score:number, rationale:string}[], title: string }) => (
        <div className="my-4">
            <p className="font-semibold text-indigo-900 mb-2">{title}:</p>
            <div className="space-y-3">
                {skills.map(skill => (
                    <div key={skill.skill}>
                        <div className="flex justify-between items-center text-sm mb-1">
                            <p className="font-medium text-slate-700">{skill.skill}</p>
                            <p className={`font-bold ${getScoreColor(skill.score)}`}>{skill.score}/100</p>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${skill.score}%` }}></div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 italic">{skill.rationale}</p>
                    </div>
                ))}
            </div>
        </div>
    );
    
    const CommunicationAnalysisDisplay = ({ analysis }: { analysis: CommunicationAnalysis }) => {
        const metrics = [
            { name: 'Clarity', ...analysis.clarity },
            { name: 'Confidence', ...analysis.confidence },
            { name: 'Articulation', ...analysis.articulation },
            { name: 'Overall Fit', ...analysis.overallFit },
        ];
        return (
            <div className="my-4">
                <p className="font-semibold text-indigo-900 mb-2">Communication & Fit Analysis:</p>
                <div className="space-y-3">
                    {metrics.map(metric => (
                        <div key={metric.name}>
                            <div className="flex justify-between items-center text-sm mb-1">
                                <p className="font-medium text-slate-700">{metric.name}</p>
                                <p className={`font-bold ${getScoreColor(metric.score)}`}>{metric.score}/100</p>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                                <div className="bg-primary h-2 rounded-full" style={{ width: `${metric.score}%` }}></div>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 italic">{metric.rationale}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };


    return (
        <>
            {showResume && (
                <ResumeDetailModal candidate={candidate} onClose={() => setShowResume(false)} />
            )}
            
            {showSelfIntro && application.selfIntroVideoUrl && (
                 <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-[60] p-4" onClick={() => setShowSelfIntro(false)}>
                    <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-3xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">Self-Introduction: {candidate.name}</h3>
                        <video src={application.selfIntroVideoUrl} controls autoPlay className="w-full rounded-lg bg-slate-900"></video>
                        <div className="text-right mt-6">
                            <button onClick={() => setShowSelfIntro(false)} className={buttonSecondary}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        
            <div className="bg-white rounded-lg border border-slate-200 transition-shadow hover:shadow-card">
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
                            <p className="text-xs text-slate-500 font-semibold uppercase mb-1">ATS Score</p>
                            <ScoreDonut score={candidate.score} />
                        </div>
                        {application.interviewScore !== undefined && (
                            <div className="text-center">
                                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Video Score</p>
                                <ScoreDonut score={application.interviewScore} />
                            </div>
                        )}
                        <div className="w-32 text-center hidden sm:block">
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusStyles(application.status)}`}>
                                {application.status}
                            </span>
                        </div>
                        <svg className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                </div>

                {isExpanded && (
                    <div className="p-4 border-t border-slate-200 animate-fade-in-down space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 bg-slate-50 rounded-lg border">
                                 <h4 className="font-bold text-slate-800 mb-2">ATS Evaluation</h4>
                                 <p className="text-sm text-slate-600 my-2 italic">"{candidate.summary}"</p>
                                 <div className="text-sm my-4">
                                    <p className="font-semibold text-slate-700 mb-2">Strengths</p>
                                    <div className="flex flex-wrap gap-2">
                                        {candidate.strengths.map(s => <span key={s} className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">{s}</span>)}
                                    </div>
                                </div>
                                <div className="text-sm my-4">
                                    <p className="font-semibold text-slate-700 mb-2">Weaknesses</p>
                                    <div className="flex flex-wrap gap-2">
                                        {candidate.weaknesses.map(w => <span key={w} className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">{w}</span>)}
                                    </div>
                                </div>
                            </div>

                            {application.interviewScore !== undefined ? (
                                <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                                    <h4 className="font-bold text-indigo-900 mb-2">AI Video Analysis</h4>
                                    <p className="text-sm text-indigo-800 my-2 italic">"{application.aiEvaluationSummary}"</p>
                                    
                                    {application.skillBreakdown && <SkillBreakdownDisplay skills={application.skillBreakdown} title="Technical Skill Breakdown" />}
                                    {application.communicationAnalysis && <CommunicationAnalysisDisplay analysis={application.communicationAnalysis} />}

                                    <div className="mt-4 pt-3 border-t border-indigo-200 text-center">
                                         <p className="text-sm font-medium text-indigo-900">AI Recommendation: <span className="font-bold">{application.recommendation}</span></p>
                                    </div>
                                </div>
                            ) : application.selfIntroVideoUrl ? (
                                <div className="p-4 bg-slate-50 rounded-lg border flex items-center justify-center text-center">
                                    <div>
                                        <h4 className="font-bold text-slate-800 mb-2">Video Analysis Pending</h4>
                                        <p className="text-sm text-slate-600">
                                            {isAnalyzing 
                                                ? 'AI analysis is in progress...' 
                                                : 'AI analysis will run automatically when this job posting is closed.'
                                            }
                                        </p>
                                        {isAnalyzing && <div className="mt-4 animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>}
                                    </div>
                                </div>
                            ) : null}
                        </div>

                         <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex flex-wrap gap-2">
                                <button onClick={() => setShowResume(true)} className={buttonSecondary}>View Full Resume</button>
                                {application.selfIntroVideoUrl && (
                                    <button onClick={() => setShowSelfIntro(true)} className="bg-amber-100 text-amber-800 font-bold py-2 px-4 rounded-lg hover:bg-amber-200 transition-colors flex items-center space-x-2">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.25 12.25a.75.75 0 101.5 0v-4.5a.75.75 0 10-1.5 0v4.5zM10 6a.75.75 0 110-1.5.75.75 0 010 1.5z" clipRule="evenodd"></path></svg>
                                        <span>Watch Self-Intro</span>
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center space-x-2">
                                {isUpdating && <div title="Updating status..." className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>}
                                <label htmlFor={`status-${candidate.id}`} className="text-sm font-medium text-slate-700">Update Status:</label>
                                <select
                                    id={`status-${candidate.id}`}
                                    value={application.status}
                                    onChange={(e) => {
                                        const newStatus = e.target.value as ApplicationStatus;
                                        if (application.status !== newStatus) {
                                            updateApplicationStatus(application.id, newStatus);
                                        }
                                    }}
                                    disabled={isUpdating}
                                    className="px-2 py-1 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-white cursor-pointer disabled:bg-slate-100"
                                    title="Change candidate status and send email notification."
                                >
                                    <option>Under Review</option>
                                    <option>Interviewing</option>
                                    <option>Hired</option>
                                    <option>Rejected</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
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
        <div className="bg-white p-6 rounded-xl shadow-card border border-slate-200">
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
    const { getCandidatesForJob, getApplicationForCandidate, exportCandidates, updateJobCriteria, closeJob } = useSmartHire();
    const candidates = getCandidatesForJob(job.id);
    
    const [isEditing, setIsEditing] = useState(false);
    const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);
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

    const handleCloseJob = () => {
        setIsCloseConfirmOpen(true);
    };

    return (
        <Fragment>
            {isEditing && <JobEditorModal jobToEdit={job} onClose={() => setIsEditing(false)} />}
            {isCloseConfirmOpen && (
                <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setIsCloseConfirmOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Are you sure?</h3>
                        <p className="text-slate-600 mb-6">Closing "{job.title}" will prevent new applications and automatically trigger AI video analysis for submitted videos. This cannot be undone.</p>
                        <div className="flex justify-center space-x-4">
                            <button onClick={() => setIsCloseConfirmOpen(false)} className={buttonSecondary}>
                                Cancel
                            </button>
                            <button 
                                onClick={() => {
                                    closeJob(job.id);
                                    setIsCloseConfirmOpen(false);
                                }} 
                                className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Confirm & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="mb-6">
                <button onClick={onBack} className="flex items-center text-lg font-semibold text-primary hover:text-primary-dark transition-colors">
                     <svg className="w-6 h-6 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                    Back to All Jobs
                </button>
                <div className="flex justify-between items-start mt-2">
                    <div>
                        <h3 className="text-2xl font-bold text-slate-900">{job.title}</h3>
                        <p className="text-slate-600 font-semibold">{job.companyName}</p>
                        <p className={`text-sm font-bold mt-1 ${job.status === 'Open' ? 'text-primary' : 'text-slate-500'}`}>{job.status}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setIsEditing(true)} className={buttonSecondary}>Edit Job</button>
                        {job.status === 'Open' && (
                            <button 
                                onClick={handleCloseJob} 
                                className="bg-red-100 text-red-800 font-bold py-2 px-4 rounded-lg hover:bg-red-200 transition-colors"
                            >
                                Close Job
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                     <div className="bg-white p-6 rounded-xl shadow-card border border-slate-200">
                        <h4 className="text-xl font-bold text-slate-900 mb-4">Candidates ({sortedAndFilteredCandidates.length})</h4>
                        
                        <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex-grow relative">
                                <label htmlFor="candidate-search" className="sr-only">Search Candidates</label>
                                <input id="candidate-search" type="text" placeholder="Search by name..." value={candidateSearch} onChange={e => setCandidateSearch(e.target.value)} className={inputStyle} />
                                <svg className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
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
                                    if (!app) return null;
                                    return <Fragment key={candidate.id}>
                                        <CandidateRow
                                        job={job}
                                        candidate={candidate}
                                        application={app}
                                    />
                                    </Fragment>;
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
                    <div className="bg-white p-6 rounded-xl shadow-card border border-slate-200">
                        <h4 className="text-xl font-bold text-slate-900 mb-4">Job Details & Attachments</h4>
                        {job.attachments && job.attachments.length > 0 && (
                            <div className="mb-6">
                                <h5 className="text-sm font-medium text-slate-700 mb-2">Attachments</h5>
                                <ul className="space-y-2">
                                    {job.attachments.map((file, index) => (
                                        <li key={index}>
                                            <a 
                                                href={file.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="flex items-center text-sm p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200"
                                            >
                                                <svg className="w-5 h-5 text-slate-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                                                <span className="text-primary hover:underline truncate">{file.name}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                                <div className="border-t border-slate-200 my-6"></div>
                            </div>
                        )}
                        <h5 className="text-sm font-medium text-slate-700 mb-2">Automation & Export</h5>
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

    return (
        <div onClick={onSelect} className="p-4 border border-slate-200 rounded-lg flex justify-between items-center cursor-pointer hover:bg-slate-50 hover:shadow-sm transition-all">
            <div>
                <p className="font-bold text-primary">{job.title}</p>
                <p className="text-sm text-slate-600 font-semibold">{job.companyName}</p>
                <p className="text-sm text-slate-500 mt-1">{job.location || 'Remote'}</p>
            </div>
            <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                    <p className="font-semibold text-slate-700">{candidateCount}</p>
                    <p className="text-slate-500">Candidates</p>
                </div>
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
    const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Closed'>('All');
    const { currentUser } = useSmartHire();

    const myJobs = useMemo(() => {
        if (!currentUser) return [];
        return jobs
            .filter(job => job.hrId === currentUser.id)
            .filter(job => {
                if (statusFilter === 'All') return true;
                return job.status === statusFilter;
            })
            .filter(job => job.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [jobs, currentUser, searchTerm, statusFilter]);
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-card border border-slate-200">
             <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-slate-900">My Job Postings ({myJobs.length})</h3>
                <button onClick={onCreateJob} className={buttonPrimary}>
                    + Create New Job
                </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-grow">
                    <input type="text" placeholder="Search jobs by title..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={inputStyle} />
                    <svg className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <div className="flex-shrink-0">
                    <label htmlFor="hr-status-filter" className="sr-only">Filter by Status</label>
                    <select
                        id="hr-status-filter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'All' | 'Open' | 'Closed')}
                        className={inputStyle}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Open">Open</option>
                        <option value="Closed">Closed</option>
                    </select>
                </div>
            </div>

            <div className="space-y-4">
                {myJobs.length > 0 ? (
                    myJobs.map(job => <Fragment key={job.id}><JobRow job={job} onSelect={() => onSelectJob(job.id)} /></Fragment>)
                ) : (
                     <div className="text-center py-10">
                        <p className="text-slate-500">No job postings found for the selected criteria.</p>
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
         <div className="bg-white p-6 rounded-xl shadow-card border border-slate-200">
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
         <div className="bg-white p-6 rounded-xl shadow-card border border-slate-200">
             <div className="flex items-center space-x-3 mb-4">
                 <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 01.517 3.86l-.477 2.387a2 2 0 00.547 1.806a2 2 0 001.806.547l2.387-.477a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l2.387.477a2 2 0 001.806-.547a2 2 0 00.547-1.806l-.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 01-.517-3.86l.477-2.387a2 2 0 00-.547-1.806zM12 15a3 3 0 100-6 3 3 0 000 6z" transform="translate(-2 -3)"></path></svg>
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
    type Tab = 'postings' | 'calendar' | 'notifications' | 'video_agent' | 'strategic_agent' | 'master_agent';
    const { jobs, selectedJob, selectJob, getEmailsForCurrentUser } = useSmartHire();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('postings');

    const notificationsCount = getEmailsForCurrentUser().filter(e => !e.read).length;

    if (selectedJob) {
        return <JobDetail job={selectedJob} onBack={() => selectJob(null)} />;
    }

    const getTabClass = (tabId: Tab) => `relative px-3 py-2 rounded-md font-semibold transition-colors text-sm flex items-center space-x-2 ${activeTab === tabId ? 'text-primary' : 'text-slate-600 hover:text-primary'}`;

    return (
        <div>
            {isCreateModalOpen && <JobEditorModal onClose={() => setIsCreateModalOpen(false)} />}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900">HR Dashboard</h2>
            </div>
             <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
                        <button onClick={() => setActiveTab('postings')} className={getTabClass('postings')}>
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                             <span>Postings</span>
                             {activeTab === 'postings' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
                        </button>
                        <button onClick={() => setActiveTab('calendar')} className={getTabClass('calendar')}>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                           <span>Calendar</span>
                            {activeTab === 'calendar' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
                        </button>
                         <button onClick={() => setActiveTab('notifications')} className={getTabClass('notifications')}>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                           <span>Notifications</span>
                           {notificationsCount > 0 && (
                               <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{notificationsCount}</span>
                           )}
                           {activeTab === 'notifications' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
                        </button>
                        <button onClick={() => setActiveTab('video_agent')} className={getTabClass('video_agent')}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                            <span>Video Agent</span>
                            {activeTab === 'video_agent' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
                        </button>
                         <button onClick={() => setActiveTab('strategic_agent')} className={getTabClass('strategic_agent')}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                            <span>Strategic Agent</span>
                            {activeTab === 'strategic_agent' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
                         </button>
                         <button onClick={() => setActiveTab('master_agent')} className={getTabClass('master_agent')}>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547a2 2 0 00-.547 1.806l.477 2.387a6 6 0 00.517 3.86l.158.318a6 6 0 01.517 3.86l-.477 2.387a2 2 0 00.547 1.806a2 2 0 001.806.547l2.387-.477a6 6 0 003.86-.517l.318-.158a6 6 0 013.86-.517l2.387.477a2 2 0 001.806-.547a2 2 0 00.547-1.806l-.477-2.387a6 6 0 00-.517-3.86l-.158-.318a6 6 0 01-.517-3.86l.477-2.387a2 2 0 00-.547-1.806zM12 15a3 3 0 100-6 3 3 0 000 6z" transform="translate(-2 -3)"></path></svg>
                           <span>Master Agent</span>
                           {activeTab === 'master_agent' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
                         </button>
                </nav>
            </div>

            <div className="animate-fade-in-up">
                {activeTab === 'postings' && <JobList jobs={jobs} onSelectJob={(id) => selectJob(id)} onCreateJob={() => setIsCreateModalOpen(true)} />}
                {activeTab === 'calendar' && <CalendarView />}
                {activeTab === 'notifications' && <HRNotificationsLog />}
                {activeTab === 'video_agent' && <VideoAnalysisAgentView />}
                {activeTab === 'strategic_agent' && <StrategicAgentView />}
                {activeTab === 'master_agent' && <MasterAgentView />}
            </div>
        </div>
    );
};

export default HRDashboard;
