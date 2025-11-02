
import React, { useMemo } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import type { Application, Job, Candidate } from '../../types';

type ApplicationWithDetails = Application & { job: Job; candidate: Candidate; };

const InterviewRow = ({ app, isPending }: { app: ApplicationWithDetails, isPending: boolean }) => {
    const { analyzingVideoAppIds } = useSmartHire();
    const isAnalyzing = analyzingVideoAppIds.has(app.id);

    return (
        <div className={`p-4 border border-slate-200 rounded-lg flex justify-between items-center transition-all ${isAnalyzing ? 'animate-pulse bg-primary/5' : ''}`}>
            <div>
                <p className="font-bold text-slate-800">{app.candidate.name}</p>
                <p className="text-sm text-slate-500">Job: {app.job.title}</p>
                <p className="text-xs text-slate-400 mt-1">Submitted on: {new Date(app.candidate.appliedAt).toLocaleDateString()}</p>
            </div>
            {isPending ? (
                <div className="text-center">
                    {isAnalyzing ? (
                         <div className="flex items-center justify-center text-sm font-semibold text-primary">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"></div>
                            <span>Analyzing...</span>
                        </div>
                    ) : (
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">In Queue</span>
                    )}
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Video Score</p>
                    <p className="font-bold text-2xl text-primary">{app.interviewScore}</p>
                </div>
            )}
        </div>
    );
};


const VideoAnalysisAgentView = () => {
    const { applications, jobs, candidates, currentUser } = useSmartHire();

    const [pendingInterviews, completedInterviews] = useMemo(() => {
        if (!currentUser) return [[], []];
        
        const hrJobIds = new Set(jobs.filter(j => j.hrId === currentUser.id).map(j => j.id));
        
        const allInterviews = applications
            .filter(app => hrJobIds.has(app.jobId) && app.selfIntroVideoUrl)
            .map(app => {
                const job = jobs.find(j => j.id === app.jobId);
                const candidate = candidates.find(c => c.id === app.candidateId);
                return (job && candidate) ? { ...app, job, candidate } : null;
            })
            .filter((app): app is ApplicationWithDetails => app !== null)
            .sort((a,b) => new Date(b.candidate.appliedAt).getTime() - new Date(a.candidate.appliedAt).getTime());

        const pending = allInterviews.filter(app => app.interviewScore === undefined);
        const completed = allInterviews.filter(app => app.interviewScore !== undefined);

        return [pending, completed];
    }, [applications, jobs, candidates, currentUser]);
    
    return (
        <div className="bg-white p-6 rounded-xl shadow-card border border-slate-200">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-3">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                    <h3 className="text-xl font-bold text-slate-900">Video Scoring Agent</h3>
                </div>
             </div>
             <p className="text-sm text-slate-600 mb-6 p-4 bg-sky-50 border border-sky-200 rounded-lg">
                The agent automatically analyzes candidate videos after a job posting is closed. This dashboard provides a log of pending and completed analyses.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                <div>
                    <h4 className="text-lg font-bold text-slate-800 mb-3 border-b-2 border-primary/50 pb-2">Pending Analysis ({pendingInterviews.length})</h4>
                    {pendingInterviews.length > 0 ? (
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 -mr-2">
                            {pendingInterviews.map(app => <React.Fragment key={app.id}><InterviewRow app={app} isPending={true} /></React.Fragment>)}
                        </div>
                    ) : (
                        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg h-full flex flex-col justify-center bg-slate-50/50">
                             <svg className="w-12 h-12 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <h5 className="text-md font-bold text-slate-700">Queue is clear!</h5>
                            <p className="text-xs text-slate-500">No videos are currently pending analysis.</p>
                        </div>
                    )}
                </div>
                 <div>
                    <h4 className="text-lg font-bold text-slate-800 mb-3 border-b-2 border-slate-200 pb-2">Completed Analysis ({completedInterviews.length})</h4>
                    {completedInterviews.length > 0 ? (
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 -mr-2">
                             {completedInterviews.map(app => <React.Fragment key={app.id}><InterviewRow app={app} isPending={false} /></React.Fragment>)}
                        </div>
                    ) : (
                         <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg h-full flex flex-col justify-center bg-slate-50/50">
                             <svg className="w-12 h-12 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <h5 className="text-md font-bold text-slate-700">No Analyses Complete</h5>
                            <p className="text-xs text-slate-500">Completed video analyses will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoAnalysisAgentView;
