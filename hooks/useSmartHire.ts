
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleGenAI, Type, Chat } from '@google/genai';
import type { User, Job, Candidate, Application, UserProfile, GeminiScoreResponse, ChatMessage, Question, JobAlertSubscription, EmailLog, JobMatchScore, JobRecommendation, UserRole, ApplicationStatus } from '../types';
import { MOCK_USERS, MOCK_JOBS, MOCK_CANDIDATES, MOCK_APPLICATIONS, MOCK_PROFILES, MOCK_QUESTIONS } from '../utils/mockData';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// FIX: Defined a strong type for the context value to avoid `any` and enable proper type inference throughout the app.
interface ISmartHireContext {
    currentUser: User | null;
    users: User[];
    jobs: Job[];
    candidates: Candidate[];
    applications: Application[];
    userProfiles: UserProfile[];
    questions: Question[];
    emailLogs: EmailLog[];
    jobAlerts: JobAlertSubscription[];
    savedJobs: Set<string>;
    selectedJob: Job | undefined;
    loading: boolean;
    error: string | null;
    processingAgentLogs: string[];
    strategicAgentLogs: string[];
    masterAgentLogs: string[];
    emailAgentMessages: ChatMessage[];
    appliedJobIds: Set<string>;
    login: (email: string, password_param: string) => void;
    logout: () => void;
    signup: (name: string, email: string, password_param: string, role: UserRole) => void;
    sendPasswordResetLink: (email: string) => Promise<boolean>;
    selectJob: (id: string | null) => void;
    createJob: (jobData: Partial<Job>) => Job;
    updateJob: (targetTitle: string, updates: Partial<Job>) => boolean;
    getCandidatesForJob: (jobId: string) => Candidate[];
    getApplicationForCandidate: (candidateId: string) => Application | undefined;
    updateApplicationStatus: (appId: string, status: ApplicationStatus) => void;
    updateJobCriteria: (jobId: string, criteria: { minAtsScore?: number; numberOfPositions?: number; }) => void;
    logEmail: (emailData: Omit<EmailLog, 'id' | 'sentAt'>) => void;
    getQuestionsForJob: (jobId: string) => Question[];
    answerQuestion: (questionId: string, answerText: string) => void;
    askQuestion: (jobId: string, questionText: string) => void;
    exportCandidates: (jobId: string) => void;
    saveJob: (jobId: string) => void;
    unsaveJob: (jobId: string) => void;
    getApplicationsForCurrentUser: () => (Application & { job: Job; candidate: Candidate; })[];
    getUserProfileForCurrentUser: () => UserProfile | undefined;
    updateUserProfile: (profileData: Partial<UserProfile>) => Promise<void>;
    getEmailsForCurrentUser: () => EmailLog[];
    getJobAlertsForCurrentUser: () => JobAlertSubscription | undefined;
    updateJobAlerts: (keywords: string[]) => void;
    clearProcessingAgentLogs: () => void;
    clearStrategicAgentLogs: () => void;
    requestAgentStop: () => void;
    parseJobDescription: (file: File) => Promise<Partial<Job>>;
    uploadResume: (jobId: string, resumeFile: File) => Promise<void>;
    generateFollowUpEmail: (candidateId: string, jobId: string, status: ApplicationStatus) => Promise<{ subject: string; body: string; }>;
    optimizeResumeForJob: (jobId: string) => Promise<{ optimizedResume: string; changes: string[]; }>;
    getJobRecommendations: () => Promise<{ recommendations: JobRecommendation[]; scores: JobMatchScore[]; }>;
    processApplicationsAgent: (jobId: string) => Promise<void>;
    runEmailAgentStream: (prompt: string) => Promise<void>;
    runStrategicHRAgent: (prompt: string) => Promise<void>;
}

const SmartHireContext = createContext<ISmartHireContext | null>(null);

export const SmartHireProvider = ({ children }: { children: React.ReactNode }) => {
    const [ai, setAi] = useState<GoogleGenAI | null>(null);
    const [emailAgentChat, setEmailAgentChat] = useState<Chat | null>(null);

    // --- STATE MANAGEMENT ---
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>(MOCK_USERS);
    const [jobs, setJobs] = useState<Job[]>(MOCK_JOBS);
    const [candidates, setCandidates] = useState<Candidate[]>(MOCK_CANDIDATES);
    const [applications, setApplications] = useState<Application[]>(MOCK_APPLICATIONS);
    const [userProfiles, setUserProfiles] = useState<UserProfile[]>(MOCK_PROFILES);
    const [questions, setQuestions] = useState<Question[]>(MOCK_QUESTIONS);
    const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
    const [jobAlerts, setJobAlerts] = useState<JobAlertSubscription[]>([]);
    const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
    
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
    
    // --- UI & ASYNC STATE ---
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stopAgent, setStopAgent] = useState(false);

    // --- AGENT LOGS ---
    const [processingAgentLogs, setProcessingAgentLogs] = useState<string[]>([]);
    const [strategicAgentLogs, setStrategicAgentLogs] = useState<string[]>([]);
    const [masterAgentLogs, setMasterAgentLogs] = useState<string[]>([]);
    const [emailAgentMessages, setEmailAgentMessages] = useState<ChatMessage[]>([]);
    
    useEffect(() => {
        if (process.env.API_KEY) {
            const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
            setAi(genAI);
            // Initialize the stateful chat session for the email agent with a system prompt
            const chat = genAI.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: "You are a friendly and professional career assistant for a platform called SmartHire. Your role is to help job seekers draft emails related to their job applications. This could include follow-up emails, thank you notes, or questions to the hiring manager. Be encouraging and provide clear, well-written email drafts.",
                }
            });
            setEmailAgentChat(chat);
        } else {
            console.error("API_KEY environment variable not set.");
        }
    }, []);

    // --- AUTH FUNCTIONS ---
    const login = (email: string, password_param: string) => {
        setError(null);
        const user = users.find(u => u.email === email && u.password === password_param);
        if (user) {
            setCurrentUser(user);
        } else {
            setError('Invalid email or password.');
        }
    };

    const logout = () => setCurrentUser(null);

    const signup = (name: string, email: string, password_param: string, role: UserRole) => {
        setError(null);
        if (users.some(u => u.email === email)) {
            setError('An account with this email already exists.');
            return;
        }
        const newUser: User = {
            id: `user-${Date.now()}`,
            name,
            email,
            password: password_param,
            role,
            status: 'active'
        };
        setUsers(prev => [...prev, newUser]);
        setCurrentUser(newUser); // Auto-login after signup
    };
    
    const sendPasswordResetLink = async (email: string) => {
        await delay(1000);
        return users.some(u => u.email === email);
    };

    // --- DATA GETTERS (MEMOIZED) ---
    const selectedJob = useMemo(() => jobs.find(j => j.id === selectedJobId), [jobs, selectedJobId]);
    const getCandidatesForJob = useCallback((jobId: string) => candidates.filter(c => c.jobId === jobId), [candidates]);
    const getApplicationForCandidate = useCallback((candidateId: string) => applications.find(a => a.candidateId === candidateId), [applications]);
    const getQuestionsForJob = useCallback((jobId: string) => questions.filter(q => q.jobId === jobId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [questions]);
    const getApplicationsForCurrentUser = useCallback(() => {
        if (!currentUser) return [];
        return applications
            .filter(app => app.userId === currentUser.id)
            .map(app => ({
                ...app,
                job: jobs.find(j => j.id === app.jobId)!,
                candidate: candidates.find(c => c.id === app.candidateId)!,
            }))
            .filter(app => app.job && app.candidate)
            .sort((a,b) => new Date(b.candidate.appliedAt).getTime() - new Date(a.candidate.appliedAt).getTime());
    }, [applications, jobs, candidates, currentUser]);
    const getUserProfileForCurrentUser = useCallback(() => userProfiles.find(p => p.userId === currentUser?.id), [userProfiles, currentUser]);
    const getEmailsForCurrentUser = useCallback(() => emailLogs.filter(e => e.userId === currentUser?.id).sort((a,b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()), [emailLogs, currentUser]);
    const getJobAlertsForCurrentUser = useCallback(() => jobAlerts.find(sub => sub.userId === currentUser?.id), [jobAlerts, currentUser]);
    const appliedJobIds = useMemo(() => new Set(applications.filter(a => a.userId === currentUser?.id).map(a => a.jobId)), [applications, currentUser]);

    // --- DATA MUTATIONS ---
    const selectJob = (id: string | null) => setSelectedJobId(id);
    const createJob = (jobData: Partial<Job>): Job => {
        const newJob: Job = {
            id: `job-${Date.now()}`,
            hrId: currentUser!.id,
            title: jobData.title || 'Untitled Job',
            description: jobData.description || 'No description provided.',
            requirements: jobData.requirements || 'No requirements specified.',
            location: jobData.location,
            salary: jobData.salary,
            workModel: jobData.workModel,
            applicationDeadline: jobData.applicationDeadline,
            status: 'Open',
            createdAt: new Date().toISOString(),
            processingStatus: 'Pending',
        };
        setJobs(prev => [newJob, ...prev]);
        return newJob;
    };

    const updateJob = (targetTitle: string, updates: Partial<Job>): boolean => {
        let success = false;
        setJobs(prev => {
            const jobIndex = prev.findIndex(j => j.title.toLowerCase() === targetTitle.toLowerCase() && j.hrId === currentUser?.id);
            if (jobIndex !== -1) {
                success = true;
                const newJobs = [...prev];
                const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
                    if (value !== undefined) {
                        (acc as any)[key as keyof Job] = value;
                    }
                    return acc;
                }, {} as Partial<Job>);
                newJobs[jobIndex] = { ...newJobs[jobIndex], ...cleanUpdates };
                return newJobs;
            }
            return prev;
        });
        return success;
    };
    
    const updateApplicationStatus = (appId: string, status: ApplicationStatus) => {
        setApplications(prev => prev.map(app => app.id === appId ? { ...app, status } : app));
    };

    const updateJobCriteria = (jobId: string, criteria: { minAtsScore?: number, numberOfPositions?: number }) => {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...criteria } : j));
    };
    
    const logEmail = (emailData: Omit<EmailLog, 'id' | 'sentAt'>) => {
        const newLog: EmailLog = { ...emailData, id: `log-${Date.now()}`, sentAt: new Date().toISOString() };
        setEmailLogs(prev => [newLog, ...prev]);
    };
    
    const answerQuestion = (questionId: string, answerText: string) => {
        setQuestions(prev => prev.map(q => q.id === questionId ? {
            ...q,
            answer: {
                hrId: currentUser!.id,
                hrName: currentUser!.name,
                answerText,
                answeredAt: new Date().toISOString()
            }
        } : q));
    };

    const askQuestion = (jobId: string, questionText: string) => {
        const newQuestion: Question = {
            id: `q-${Date.now()}`,
            jobId,
            userId: currentUser!.id,
            userName: currentUser!.name,
            questionText,
            createdAt: new Date().toISOString()
        };
        setQuestions(prev => [newQuestion, ...prev]);
    };

    const saveJob = (jobId: string) => setSavedJobs(prev => new Set(prev).add(jobId));
    const unsaveJob = (jobId: string) => {
        const newSet = new Set(savedJobs);
        newSet.delete(jobId);
        setSavedJobs(newSet);
    };

    const updateJobAlerts = (keywords: string[]) => {
        if(!currentUser) return;
        const sub: JobAlertSubscription = { userId: currentUser.id, keywords };
        setJobAlerts(prev => {
            const existing = prev.find(s => s.userId === currentUser.id);
            if (existing) {
                return prev.map(s => s.userId === currentUser.id ? sub : s);
            }
            return [...prev, sub];
        });
    };

    const updateUserProfile = async (profileData: Partial<UserProfile>) => {
        if (!currentUser) return;
        setLoading(true);
        await delay(1000);
        setUserProfiles(prev => {
            const existing = prev.find(p => p.userId === currentUser.id);
            if (existing) {
                return prev.map(p => p.userId === currentUser.id ? { ...existing, ...profileData } : p);
            }
            return [...prev, { userId: currentUser.id, summary: '', skills: [], resumeText: '', ...profileData }];
        });
        setLoading(false);
    };

    const exportCandidates = (jobId: string) => {
        const jobCandidates = getCandidatesForJob(jobId);
        if (jobCandidates.length === 0) {
            alert("No candidates to export for this job.");
            return;
        }
        let csvContent = "data:text/csv;charset=utf-8,Name,Email,Score,Summary,Strengths,Weaknesses\n";
        jobCandidates.forEach(c => {
            const row = [c.name, c.email, c.score, `"${c.summary}"`, `"${c.strengths.join(', ')}"`, `"${c.weaknesses.join(', ')}"`].join(',');
            csvContent += row + "\n";
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `candidates_${jobId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- GEMINI API FUNCTIONS ---
    const parseJobDescription = async (file: File): Promise<Partial<Job>> => {
        if (!ai) throw new Error("GenAI not initialized");
        const text = await file.text();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Parse the following job description and extract the job title, a brief description, and a list of key requirements. \n\n${text}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        requirements: { type: Type.STRING },
                    }
                }
            }
        });
        return JSON.parse(response.text);
    };
    
    const uploadResume = async (jobId: string, resumeFile: File) => {
        if(!ai || !currentUser) throw new Error("Not logged in or AI not initialized");
        setLoading(true);
        setError(null);
        try {
            await delay(1500); // Simulate upload
            const resumeText = await resumeFile.text();
            const job = jobs.find(j => j.id === jobId);
            if(!job) throw new Error("Job not found");

            const prompt = `Analyze this resume against the following job description and provide a score from 0-100, a brief summary, and lists of strengths and weaknesses.
            Job: ${job.title} - ${job.requirements}
            Resume: ${resumeText}`;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            email: { type: Type.STRING },
                            score: { type: Type.INTEGER },
                            summary: { type: Type.STRING },
                            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                        }
                    }
                }
            });
            const result: GeminiScoreResponse = JSON.parse(response.text);

            const newCandidate: Candidate = {
                id: `cand-${Date.now()}`,
                jobId,
                userId: currentUser.id,
                name: currentUser.name,
                email: currentUser.email,
                score: result.score,
                summary: result.summary,
                strengths: result.strengths,
                weaknesses: result.weaknesses,
                resumeText: resumeText,
                appliedAt: new Date().toISOString(),
            };
            const newApplication: Application = {
                id: `app-${Date.now()}`,
                jobId,
                userId: currentUser.id,
                candidateId: newCandidate.id,
                status: 'Under Review',
            };
            setCandidates(prev => [...prev, newCandidate]);
            setApplications(prev => [...prev, newApplication]);
        } catch (e) {
            console.error(e);
            setError("Failed to process resume with AI. Please check the file and try again.");
            throw e;
        } finally {
            setLoading(false);
        }
    };
    
    const generateFollowUpEmail = async (candidateId: string, jobId: string, status: ApplicationStatus): Promise<{subject: string, body: string}> => {
        if(!ai) throw new Error("AI not initialized");
        const candidate = candidates.find(c => c.id === candidateId);
        const job = jobs.find(j => j.id === jobId);
        if(!candidate || !job) throw new Error("Candidate or job not found");
        
        const prompt = `Draft a professional email to a job candidate named ${candidate.name} for the ${job.title} position. The email should inform them that their application status has been updated to "${status}". Keep it concise and professional.`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        subject: { type: Type.STRING },
                        body: { type: Type.STRING },
                    }
                }
            }
        });
        return JSON.parse(response.text);
    };

    const optimizeResumeForJob = async (jobId: string): Promise<{ optimizedResume: string; changes: string[] }> => {
        if(!ai) throw new Error("AI not initialized");
        setLoading(true);
        await delay(2000);
        const job = jobs.find(j => j.id === jobId);
        const profile = getUserProfileForCurrentUser();
        if(!job || !profile) throw new Error("Job or user profile not found");
        
        const prompt = `Rewrite the following resume to better match the requirements of this job description. Also provide a list of the key changes you made.
        Job: ${job.title} - ${job.requirements}
        Resume: ${profile.resumeText}`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        optimizedResume: { type: Type.STRING },
                        changes: { type: Type.ARRAY, items: { type: Type.STRING } },
                    }
                }
            }
        });
        setLoading(false);
        return JSON.parse(response.text);
    };

    const getJobRecommendations = async (): Promise<{ recommendations: JobRecommendation[], scores: JobMatchScore[] }> => {
        if (!ai) throw new Error("AI not initialized");
        const profile = getUserProfileForCurrentUser();
        if(!profile) return { recommendations: [], scores: [] };
        
        const openJobs = jobs.filter(j => j.status === 'Open' && !appliedJobIds.has(j.id));
        const prompt = `Based on the user's profile summary and skills, recommend up to 5 jobs from the list and provide a match score (0-100) for all jobs listed.
        Profile: ${profile.summary} Skills: ${profile.skills.join(', ')}
        Jobs: ${JSON.stringify(openJobs.map(j => ({id: j.id, title: j.title, requirements: j.requirements})))}`;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        recommendations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    jobId: { type: Type.STRING },
                                    reason: { type: Type.STRING }
                                }
                            }
                        },
                        scores: {
                             type: Type.ARRAY,
                             items: {
                                type: Type.OBJECT,
                                properties: {
                                    jobId: { type: Type.STRING },
                                    matchScore: { type: Type.INTEGER }
                                }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text);
    };

    // --- AGENT FUNCTIONS ---
    const clearProcessingAgentLogs = () => setProcessingAgentLogs([]);
    const clearStrategicAgentLogs = () => setStrategicAgentLogs([]);
    const requestAgentStop = () => setStopAgent(true);

    const processApplicationsAgent = async (jobId: string) => {
        setLoading(true);
        setProcessingAgentLogs(prev => [...prev, "Agent activated. Analyzing job and candidates..."]);
        await delay(1000);
        const job = jobs.find(j => j.id === jobId);
        const jobCandidates = getCandidatesForJob(jobId);
        
        if (!job || jobCandidates.length === 0) {
            setProcessingAgentLogs(prev => [...prev, "No candidates found for this job. Agent shutting down."]);
            setLoading(false);
            return;
        }

        const minScore = job.minAtsScore || 70;
        const numPositions = job.numberOfPositions || 1;
        
        setProcessingAgentLogs(prev => [...prev, `Found ${jobCandidates.length} candidates. Minimum score set to ${minScore}. Number of positions: ${numPositions}.`]);
        await delay(1000);

        const sortedCandidates = [...jobCandidates].sort((a,b) => b.score - a.score);
        const topCandidates = sortedCandidates.slice(0, numPositions);
        const rejectedCandidates = sortedCandidates.slice(numPositions);
        
        setProcessingAgentLogs(prev => [...prev, `Identified ${topCandidates.length} top candidates to move to 'Interviewing'.`]);
        await delay(1000);
        
        setApplications(prevApps => {
            const newApps = [...prevApps];
            topCandidates.forEach(c => {
                const appIndex = newApps.findIndex(a => a.candidateId === c.id);
                if (appIndex > -1) newApps[appIndex].status = 'Interviewing';
            });
            rejectedCandidates.forEach(c => {
                 const appIndex = newApps.findIndex(a => a.candidateId === c.id);
                 if (appIndex > -1) newApps[appIndex].status = 'Rejected';
            });
            return newApps;
        });

        setProcessingAgentLogs(prev => [...prev, `Identified ${rejectedCandidates.length} candidates to be rejected based on score and position availability.`]);
        await delay(1500);
        setProcessingAgentLogs(prev => [...prev, "Agent has finished processing applications. Statuses have been updated."]);

        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, processingStatus: 'Completed' } : j));
        setLoading(false);
    };

    const runEmailAgentStream = async (prompt: string) => {
        if (!emailAgentChat) {
            console.error("Email agent chat not initialized.");
            return;
        }
        setLoading(true);
        const newUserMessage: ChatMessage = { role: 'user', parts: [{ text: prompt }] };
        const modelPlaceholder: ChatMessage = { role: 'model', parts: [{ text: '' }] };
    
        setEmailAgentMessages(prev => [...prev, newUserMessage, modelPlaceholder]);
    
        try {
            const result = await emailAgentChat.sendMessageStream({ message: prompt });
            
            let accumulatedText = '';
            for await (const chunk of result) {
                accumulatedText += chunk.text;
                setEmailAgentMessages(prev => {
                    const newMsgs = [...prev];
                    // Always update the last message, which we know is the model's placeholder
                    newMsgs[newMsgs.length - 1] = { role: 'model', parts: [{ text: accumulatedText }] };
                    return newMsgs;
                });
            }
        } catch (e) {
            console.error("Email agent stream error:", e);
            const errorMsg = "Sorry, I encountered an error. Please try again.";
            setEmailAgentMessages(prev => {
                const newMsgs = [...prev];
                if (newMsgs.length > 0 && newMsgs[newMsgs.length - 1].role === 'model') {
                    newMsgs[newMsgs.length - 1] = { role: 'model', parts: [{ text: errorMsg }] };
                    return newMsgs;
                }
                // Fallback if something went wrong
                return [...prev, { role: 'model', parts: [{ text: errorMsg }] }];
            });
        } finally {
            setLoading(false);
        }
    };

    const runStrategicHRAgent = async (prompt: string) => {
        if (!ai || !currentUser) return;
        setLoading(true);
        setError(null);
        setStrategicAgentLogs(prev => [...prev, `User: ${prompt}`]);
    
        try {
            setStrategicAgentLogs(prev => [...prev, "Agent: Analyzing request..."]);
    
            const jobContext = jobs
                .filter(j => j.hrId === currentUser.id)
                .map(({ title, description, requirements }) => ({ title, description, requirements }))
                .slice(0, 5);
    
            const promptWithContext = `
User Command: "${prompt}"

Existing Jobs Context:
${jobContext.length > 0 ? JSON.stringify(jobContext, null, 2) : "No existing jobs."}

Current Date: ${new Date().toISOString().split('T')[0]}
`;
    
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: promptWithContext,
                config: {
                    systemInstruction: `You are an advanced Strategic HR Agent for a platform called SmartHire. Your goal is to understand user commands and translate them into specific actions by responding with a JSON object.
- When asked to create a job, use the 'create_job' action. You can base the new job on an existing job from the context. Generate a suitable description and requirements if not fully specified.
- You must calculate dates. If the user says "in 3 weeks", calculate the ISO date string (YYYY-MM-DD) based on the current date provided.
- When asked to update a job, use the 'update_job' action. You MUST specify which job to target using 'targetJobTitle'. Include ONLY the fields that need updating in 'jobDetails'.
- When asked to close a job posting, use the 'close_job' action and specify the 'targetJobTitle'.
- If the user asks a general question (e.g., "how many candidates applied for X?"), use the 'answer_question' action and provide the answer in the 'answer' field. For this, you need to be creative as you don't have candidate data.
- Always explain your plan in the 'thought' field.`,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            thought: { type: Type.STRING, description: "Your reasoning and plan." },
                            action: { type: Type.STRING, enum: ["create_job", "update_job", "close_job", "answer_question"] },
                            jobDetails: {
                                type: Type.OBJECT,
                                properties: {
                                    targetJobTitle: { type: Type.STRING, description: "The title of the job to update or close." },
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    requirements: { type: Type.STRING },
                                    location: { type: Type.STRING },
                                    salary: { type: Type.STRING },
                                    workModel: { type: Type.STRING, enum: ["On-site", "Remote", "Hybrid"] },
                                    applicationDeadline: { type: Type.STRING, description: "The deadline in YYYY-MM-DD format." },
                                }
                            },
                            answer: { type: Type.STRING, description: "The answer to a user's question." }
                        },
                        required: ["thought", "action"]
                    }
                }
            });
    
            const result = JSON.parse(response.text);
    
            if (result.thought) {
                setStrategicAgentLogs(prev => [...prev, `Agent: ${result.thought}`]);
            }
    
            switch (result.action) {
                case 'create_job':
                    if (result.jobDetails) {
                        const newJob = createJob(result.jobDetails);
                        setStrategicAgentLogs(prev => [...prev, `Agent: I have created the new job posting for "${newJob.title}". It is now live.`]);
                    } else {
                         throw new Error("Action 'create_job' was specified, but no job details were provided.");
                    }
                    break;
                case 'update_job':
                    if (result.jobDetails && result.jobDetails.targetJobTitle) {
                        const { targetJobTitle, ...updates } = result.jobDetails;
                        const success = updateJob(targetJobTitle, updates);
                        if (success) {
                            setStrategicAgentLogs(prev => [...prev, `Agent: I have updated the job posting for "${targetJobTitle}".`]);
                        } else {
                            setStrategicAgentLogs(prev => [...prev, `Agent: I couldn't find a job titled "${targetJobTitle}" to update.`]);
                        }
                    } else {
                         throw new Error("Action 'update_job' requires 'targetJobTitle' and details to update.");
                    }
                    break;
                case 'close_job':
                     if (result.jobDetails && result.jobDetails.targetJobTitle) {
                        const success = updateJob(result.jobDetails.targetJobTitle, { status: 'Closed' });
                        if (success) {
                            setStrategicAgentLogs(prev => [...prev, `Agent: I have closed the job posting for "${result.jobDetails.targetJobTitle}".`]);
                        } else {
                            setStrategicAgentLogs(prev => [...prev, `Agent: I couldn't find a job titled "${result.jobDetails.targetJobTitle}" to close.`]);
                        }
                    } else {
                         throw new Error("Action 'close_job' requires 'targetJobTitle'.");
                    }
                    break;
                case 'answer_question':
                     if (result.answer) {
                        setStrategicAgentLogs(prev => [...prev, `Agent: ${result.answer}`]);
                    } else {
                        throw new Error("Action 'answer_question' was specified, but no answer was provided.");
                    }
                    break;
                default:
                    setStrategicAgentLogs(prev => [...prev, `Agent: I understood the request, but I couldn't map it to a specific action. Please try rephrasing.`]);
                    break;
            }
    
        } catch (e) {
            console.error("Strategic HR Agent error:", e);
            const errorMessage = e instanceof Error ? e.message : "Sorry, I encountered an error. The AI may have returned an unexpected format. Please try again.";
            setStrategicAgentLogs(prev => [...prev, `Agent: Error - ${errorMessage}`]);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }
    
    // Master agent simulation
    useEffect(() => {
        const interval = setInterval(() => {
            const overdueJobs = jobs.filter(j => j.status === 'Open' && j.processingStatus !== 'Completed' && j.applicationDeadline && new Date(j.applicationDeadline) < new Date(Date.now() - 2 * 24 * 60 * 60 * 1000));
            if(overdueJobs.length > 0) {
                const jobToProcess = overdueJobs[0];
                 setMasterAgentLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Detected overdue job: "${jobToProcess.title}". Initiating automatic processing.`]);
                 processApplicationsAgent(jobToProcess.id);
            }
        }, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, [jobs]);


    const value: ISmartHireContext = {
        currentUser,
        users,
        jobs,
        candidates,
        applications,
        userProfiles,
        questions,
        emailLogs,
        jobAlerts,
        savedJobs,
        selectedJob,
        loading,
        error,
        processingAgentLogs,
        strategicAgentLogs,
        masterAgentLogs,
        emailAgentMessages,
        appliedJobIds,
        login,
        logout,
        signup,
        sendPasswordResetLink,
        selectJob,
        createJob,
        updateJob,
        getCandidatesForJob,
        getApplicationForCandidate,
        updateApplicationStatus,
        updateJobCriteria,
        logEmail,
        getQuestionsForJob,
        answerQuestion,
        askQuestion,
        exportCandidates,
        saveJob,
        unsaveJob,
        getApplicationsForCurrentUser,
        getUserProfileForCurrentUser,
        updateUserProfile,
        getEmailsForCurrentUser,
        getJobAlertsForCurrentUser,
        updateJobAlerts,
        clearProcessingAgentLogs,
        clearStrategicAgentLogs,
        requestAgentStop,
        parseJobDescription,
        uploadResume,
        generateFollowUpEmail,
        optimizeResumeForJob,
        getJobRecommendations,
        processApplicationsAgent,
        runEmailAgentStream,
        runStrategicHRAgent,
    };

    return React.createElement(SmartHireContext.Provider, { value }, children);
};

export const useSmartHire = (): ISmartHireContext => {
    const context = useContext(SmartHireContext);
    if (!context) {
        throw new Error('useSmartHire must be used within a SmartHireProvider');
    }
    return context;
};
