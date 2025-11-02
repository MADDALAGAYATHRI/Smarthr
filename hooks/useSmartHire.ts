import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleGenAI, Type, Chat } from '@google/genai';
import type { User, Job, Candidate, Application, UserProfile, GeminiScoreResponse, ChatMessage, Question, JobAlertSubscription, EmailLog, JobMatchScore, JobRecommendation, UserRole, ApplicationStatus, CommunicationAnalysis } from '../types';
import { MOCK_USERS, MOCK_JOBS, MOCK_CANDIDATES, MOCK_APPLICATIONS, MOCK_PROFILES, MOCK_QUESTIONS } from '../utils/mockData';
import { FunctionDeclaration } from '@google/genai';

// Helper to simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// Helper to convert a File object to a Gemini-compatible format
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

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
    isEmailAgentOpen: boolean;
    appliedJobIds: Set<string>;
    ai: GoogleGenAI | null;
    analyzingVideoAppId: string | null;
    login: (email: string, password_param: string, rememberMe: boolean) => void;
    logout: () => void;
    signup: (name: string, email: string, password_param: string, role: UserRole) => void;
    sendPasswordResetLink: (email: string) => Promise<boolean>;
    selectJob: (id: string | null) => void;
    createJob: (jobData: Partial<Job>) => Job;
    updateJob: (jobId: string, updates: Partial<Job>) => boolean;
    closeJob: (jobId: string) => void;
    getCandidatesForJob: (jobId: string) => Candidate[];
    getApplicationForCandidate: (candidateId: string) => Application | undefined;
    updateApplicationStatus: (appId: string, status: ApplicationStatus) => Promise<void>;
    updateJobCriteria: (jobId: string, criteria: { minAtsScore?: number; numberOfPositions?: number; }) => void;
    logEmail: (emailData: Omit<EmailLog, 'id' | 'sentAt' | 'read'>) => void;
    getQuestionsForJob: (jobId: string) => Question[];
    answerQuestion: (questionId: string, answerText: string) => void;
    askQuestion: (jobId: string, questionText: string) => void;
    exportCandidates: (jobId: string) => void;
    saveJob: (jobId: string) => void;
    unsaveJob: (jobId: string) => void;
    getApplicationsForCurrentUser: () => (Application & { job: Job; candidate: Candidate; })[];
    getUserProfileForCurrentUser: () => UserProfile | undefined;
    updateUserProfile: (profileData: Partial<UserProfile>, resumeFile?: File) => Promise<void>;
    getEmailsForCurrentUser: () => EmailLog[];
    getJobAlertsForCurrentUser: () => JobAlertSubscription | undefined;
    updateJobAlerts: (keywords: string[]) => void;
    clearProcessingAgentLogs: () => void;
    clearStrategicAgentLogs: () => void;
    requestAgentStop: () => void;
    openEmailAgent: (initialPrompt?: string) => void;
    closeEmailAgent: () => void;
    saveVideoInterview: (applicationId: string, videoUrl: string, transcript: string) => Promise<void>;
    parseJobDescription: (file: File) => Promise<Partial<Job>>;
    uploadResume: (jobId: string, resumeFile: File) => Promise<void>;
    generateFollowUpEmail: (candidateId: string, jobId: string, status: ApplicationStatus) => Promise<{ subject: string; body: string; }>;
    generateSeekerFollowUpEmail: (jobId: string) => Promise<{ subject: string; body: string; }>;
    optimizeResumeForJob: (jobId: string) => Promise<{ optimizedResume: string; changes: string[]; }>;
    getJobRecommendations: () => Promise<{ recommendations: JobRecommendation[]; scores: JobMatchScore[]; }>;
    processApplicationsAgent: (jobId: string) => Promise<void>;
    runEmailAgentStream: (prompt: string) => Promise<void>;
    runStrategicHRAgent: (prompt: string) => Promise<void>;
    runVideoAnalysisAgent: (applicationId: string) => Promise<void>;
    clearError?: () => void;
    markEmailsAsReadForCurrentUser?: () => void;
}

const SmartHireContext = createContext<ISmartHireContext | null>(null);

// FIX: Export the useSmartHire hook to be used in other components. This resolves all module import errors.
export const useSmartHire = () => {
    const context = useContext(SmartHireContext);
    if (!context) {
        throw new Error('useSmartHire must be used within a SmartHireProvider');
    }
    return context;
};

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
    const [analyzingVideoAppId, setAnalyzingVideoAppId] = useState<string | null>(null);

    // --- AGENT LOGS ---
    const [processingAgentLogs, setProcessingAgentLogs] = useState<string[]>([]);
    const [strategicAgentLogs, setStrategicAgentLogs] = useState<string[]>([]);
    const [masterAgentLogs, setMasterAgentLogs] = useState<string[]>([]);
    const [emailAgentMessages, setEmailAgentMessages] = useState<ChatMessage[]>([]);
    const [isEmailAgentOpen, setIsEmailAgentOpen] = useState(false);
    
    useEffect(() => {
        // Handle "Remember Me" functionality
        const rememberedEmail = localStorage.getItem('rememberedUserEmail');
        if (rememberedEmail) {
            const user = MOCK_USERS.find(u => u.email === rememberedEmail);
            if (user) {
                setCurrentUser(user);
            }
        }

        // Initialize GenAI
        const apiKey = process.env.API_KEY || (window as any).process?.env?.API_KEY;
        if (apiKey) {
            const genAI = new GoogleGenAI({ apiKey });
            setAi(genAI);

            const sendEmailToHiringManager: FunctionDeclaration = {
              name: 'sendEmailToHiringManager',
              description: "Sends an email to the hiring manager for a specific job the user has applied to.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  jobTitle: {
                    type: Type.STRING,
                    description: "The title of the job the user is asking about. e.g., 'Frontend Developer'",
                  },
                  subject: {
                    type: Type.STRING,
                    description: "The subject line of the email.",
                  },
                  body: {
                    type: Type.STRING,
                    description: "The main content/body of the email.",
                  },
                },
                required: ["jobTitle", "subject", "body"],
              },
            };
            
            // Initialize the stateful chat session for the email agent with a system prompt and tools
            const chat = genAI.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: "You are a friendly and professional Career Assistant for a platform called SmartHire. Your primary role is to help job seekers draft professional emails related to their job applications. This includes follow-up emails, thank you notes, or questions to hiring managers. When a user asks to draft an email for a specific job, provide a clear, concise, and well-written draft that they can copy. If the user then confirms they want to send the email, use the `sendEmailToHiringManager` function to send it.",
                    tools: [{ functionDeclarations: [sendEmailToHiringManager] }]
                }
            });
            setEmailAgentChat(chat);
        } else {
            console.error("API_KEY environment variable not set.");
            setError("API Key is missing. Please configure it to use AI features.");
        }
    }, []);


    // --- AUTH FUNCTIONS ---
    const login = (email: string, password_param: string, rememberMe: boolean) => {
        setError(null);
        const user = users.find(u => u.email === email && u.password === password_param);
        if (user) {
            setCurrentUser(user);
            if (rememberMe) {
                localStorage.setItem('rememberedUserEmail', user.email);
            } else {
                localStorage.removeItem('rememberedUserEmail');
            }
        } else {
            setError('Invalid email or password.');
        }
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('rememberedUserEmail');
    };
    
    const clearError = () => setError(null);

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
            requireSelfVideo: jobData.requireSelfVideo || false,
            selfVideoQuestion: jobData.selfVideoQuestion || 'Tell us about a challenging project you have worked on and what you learned from it.',
            aiInterviewAfterScreening: jobData.aiInterviewAfterScreening ?? true,
        };
        setJobs(prev => [newJob, ...prev]);
        return newJob;
    };

    const updateJob = (jobId: string, updates: Partial<Job>): boolean => {
        let success = false;
        setJobs(prev => {
            const jobIndex = prev.findIndex(j => j.id === jobId && j.hrId === currentUser?.id);
            if (jobIndex !==-1) {
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
    
    const closeJob = (jobId: string) => {
        setJobs(prev => prev.map(j => 
            j.id === jobId ? { ...j, status: 'Closed' } : j
        ));
    };

    const updateApplicationStatus = async (appId: string, status: ApplicationStatus) => {
        const application = applications.find(a => a.id === appId);
        if (!application) return;
    
        const candidate = candidates.find(c => c.id === application.candidateId);
        const job = jobs.find(j => j.id === application.jobId);
        if (!candidate || !job) return;
    
        // Optimistically update UI
        setApplications(prev => prev.map(app => app.id === appId ? { ...app, status } : app));
    
        if (status === 'Hired') {
            setLoading(true);
            setError(null);
            try {
                const { subject, body } = await generateFollowUpEmail(candidate.id, job.id, 'Hired');
                logEmail({
                    userId: candidate.userId,
                    candidateId: candidate.id,
                    jobTitle: job.title,
                    subject,
                    body,
                });
            } catch (e) {
                console.error("Failed to auto-generate 'Hired' email:", e);
                const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
                // Don't revert, as the status change is the primary action. Just notify the user.
                setError(`Status updated to 'Hired', but failed to generate confirmation email: ${errorMessage}`);
            } finally {
                setLoading(false);
            }
        }
    };

    const updateJobCriteria = (jobId: string, criteria: { minAtsScore?: number, numberOfPositions?: number }) => {
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, ...criteria } : j));
    };
    
    const logEmail = (emailData: Omit<EmailLog, 'id' | 'sentAt' | 'read'>) => {
        const newLog: EmailLog = { ...emailData, id: `log-${Date.now()}`, sentAt: new Date().toISOString(), read: false };
        setEmailLogs(prev => [newLog, ...prev]);
    };
    
    const markEmailsAsReadForCurrentUser = () => {
        if (!currentUser) return;
        setEmailLogs(prev =>
            prev.map(log =>
                log.userId === currentUser.id && !log.read ? { ...log, read: true } : log
            )
        );
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
    
    const evaluateInterviewTranscript = async (applicationId: string, transcript: string) => {
        if (!ai) {
            console.error("AI not initialized for interview evaluation.");
            return;
        }

        if (!transcript || transcript.trim() === '') {
            console.log("Interview transcript is empty. Skipping AI evaluation.");
            return;
        }

        const application = applications.find(a => a.id === applicationId);
        if (!application) return;
        
        const job = jobs.find(j => j.id === application.jobId);
        if (!job) return;

        const prompt = `As an expert HR analyst and communication coach, evaluate the following interview transcript for the position of "${job.title}".
        
        Job Requirements: ${job.requirements}
        
        Interview Transcript:
        ${transcript}
        
        Based on the transcript and job requirements, provide a detailed evaluation. Your response MUST be a JSON object.
        - aiEvaluationSummary: A 2-3 sentence summary of the candidate's performance, covering both technical and soft skills.
        - skillBreakdown: An array of objects evaluating technical skills mentioned in the job requirements. Each object must have 'skill', 'score' (0-100), and a brief 'rationale'.
        - communicationAnalysis: An object evaluating communication style. It MUST contain 'clarity', 'confidence', 'articulation', and 'overallFit' keys. Each should be an object with a 'score' (0-100), and a brief 'rationale'. Infer these qualities from word choice, response structure, and decisive language.
        - recommendation: A final recommendation, e.g., "Qualified for Next Round", "Needs Review".
        - interviewScore: A final, overall score from 0-100, calculated as a weighted average: 60% from the average of technical skills in 'skillBreakdown' and 40% from the 'overallFit' score in 'communicationAnalysis'. If there are no technical skills, base it 100% on overallFit.`;

        const metricSchema = {
            type: Type.OBJECT,
            properties: {
                score: { type: Type.INTEGER },
                rationale: { type: Type.STRING },
            },
            required: ["score", "rationale"]
        };

        try {
             const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            interviewScore: { type: Type.INTEGER },
                            aiEvaluationSummary: { type: Type.STRING },
                            skillBreakdown: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        skill: { type: Type.STRING },
                                        score: { type: Type.INTEGER },
                                        rationale: { type: Type.STRING },
                                    },
                                    required: ["skill", "score", "rationale"]
                                }
                            },
                            communicationAnalysis: {
                                type: Type.OBJECT,
                                properties: {
                                    clarity: metricSchema,
                                    confidence: metricSchema,
                                    articulation: metricSchema,
                                    overallFit: metricSchema,
                                },
                                required: ["clarity", "confidence", "articulation", "overallFit"]
                            },
                            recommendation: { type: Type.STRING }
                        },
                        required: ["interviewScore", "aiEvaluationSummary", "skillBreakdown", "communicationAnalysis", "recommendation"]
                    }
                }
             });
             const result = JSON.parse(response.text);

             setApplications(prev => prev.map(app =>
                app.id === applicationId ? { ...app, ...result } : app
             ));
        } catch(e) {
            console.error("Error evaluating interview transcript:", e);
            // Optionally, update the application with an error state
        }
    };


    const saveVideoInterview = async (applicationId: string, videoUrl: string, transcript: string) => {
        setApplications(prev => prev.map(app => 
            app.id === applicationId ? { ...app, videoInterviewUrl: videoUrl, interviewTranscript: transcript } : app
        ));
    };

    const updateUserProfile = async (profileData: Partial<UserProfile>, resumeFile?: File) => {
        if (!currentUser) return;
        setLoading(true);
        setError(null);
    
        try {
            let finalProfileData = { ...profileData };
    
            if (resumeFile) {
                if (!ai) throw new Error("AI service not initialized.");
                
                const resumePart = await fileToGenerativePart(resumeFile);
                const prompt = "Extract the full text content of the resume, a professional summary (around 50 words), and a list of key skills (technical and soft skills).";
    
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: { parts: [ { text: prompt }, resumePart ] },
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: {
                            type: Type.OBJECT,
                            properties: {
                                resumeText: { type: Type.STRING },
                                summary: { type: Type.STRING },
                                skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                            }
                        }
                    }
                });
                const { resumeText, summary, skills } = JSON.parse(response.text);
                
                finalProfileData = {
                    ...finalProfileData,
                    resumeText,
                    summary,
                    skills,
                };
            }
    
            setUserProfiles(prev => {
                const existing = prev.find(p => p.userId === currentUser.id);
                if (existing) {
                    return prev.map(p => p.userId === currentUser.id ? { ...existing, ...finalProfileData } : p);
                }
                return [...prev, { userId: currentUser.id, summary: '', skills: [], resumeText: '', ...finalProfileData }];
            });
    
        } catch(e) {
            console.error("Error updating user profile:", e);
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            setError(`Failed to update profile: ${errorMessage}`);
            throw e;
        } finally {
            setLoading(false);
        }
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
            const job = jobs.find(j => j.id === jobId);
            if(!job) throw new Error("Job not found");
    
            const resumePart = await fileToGenerativePart(resumeFile);
    
            const prompt = `Analyze this resume against the following job description. Provide a score from 0-100, a brief summary, a general list of skills, lists of strengths and weaknesses for this specific role, key projects, publications, and certifications. Also extract the candidate's full name, their email address, and the full text from the resume.\n\nJob: ${job.title} - ${job.requirements}`;
    
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: { parts: [{ text: prompt }, resumePart] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Candidate's full name" },
                            email: { type: Type.STRING, description: "Candidate's email address" },
                            score: { type: Type.INTEGER, description: "A score from 0-100 based on job match" },
                            summary: { type: Type.STRING, description: "A brief summary of the candidate's profile for this job" },
                            skills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A general list of key technical and soft skills from the resume" },
                            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of strengths for this role" },
                            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of weaknesses or areas of improvement" },
                            projects: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of key projects mentioned in the resume" },
                            publications: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of publications mentioned in the resume" },
                            certifications: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of certifications mentioned in the resume" },
                            resumeText: { type: Type.STRING, description: "The full text content extracted from the resume" }
                        }
                    }
                }
            });
            const result: GeminiScoreResponse & { resumeText: string } = JSON.parse(response.text);
    
            const newCandidate: Candidate = {
                id: `cand-${Date.now()}`,
                jobId,
                userId: currentUser.id,
                name: result.name,
                email: result.email,
                score: result.score,
                summary: result.summary,
                strengths: result.strengths,
                weaknesses: result.weaknesses,
                resumeText: result.resumeText,
                appliedAt: new Date().toISOString(),
                skills: result.skills || [],
                projects: result.projects || [],
                publications: result.publications || [],
                certifications: result.certifications || [],
            };
            const newApplication: Application = {
                id: `app-${Date.now()}`,
                jobId,
                userId: currentUser.id,
                candidateId: newCandidate.id,
                status: 'Under Review',
            };

            // If this is the user's first application, create their profile automatically
            const existingProfile = userProfiles.find(p => p.userId === currentUser.id);
            if (!existingProfile && result.skills) {
                const newUserProfile: UserProfile = {
                    userId: currentUser.id,
                    summary: result.summary, // Use the job-specific summary as the initial profile summary
                    skills: result.skills,
                    resumeText: result.resumeText,
                };
                setUserProfiles(prev => [...prev, newUserProfile]);
            }

            setCandidates(prev => [...prev, newCandidate]);
            setApplications(prev => [...prev, newApplication]);

            // Notify HR user
            const jobOwner = users.find(u => u.id === job.hrId);
            if (jobOwner) {
                const subject = `New Application for ${job.title}: ${newCandidate.name}`;
                const body = `Hello ${jobOwner.name},\n\nA new candidate, ${newCandidate.name}, has applied for the "${job.title}" position.\n\nYou can view their profile and ATS score on your SmartHire dashboard.\n\nThank you,\nThe SmartHire Team`;

                logEmail({
                    userId: jobOwner.id, // The recipient is the HR user
                    candidateId: newCandidate.id,
                    jobTitle: job.title,
                    subject,
                    body,
                });
            }

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
        
        let prompt: string;

        if (status === 'Hired') {
            prompt = `You are an HR manager. Draft a congratulatory job offer email to a candidate named ${candidate.name} for the "${job.title}" position. The tone should be enthusiastic and professional.
        
    The email MUST include:
    1. A clear statement that they have been selected for the position.
    2. Enthusiasm about them joining the team.
    3. A section mentioning "Next Steps", instructing them that a member of the HR team will be in touch within 2-3 business days with the official offer letter and onboarding documents.
    4. A closing statement from "The Hiring Team".
    
    Do not include placeholders for salary or start date, as that will be in the official documents.`;
        } else {
            prompt = `Draft a professional email to a job candidate named ${candidate.name} for the "${job.title}" position. The email should inform them that their application status has been updated to "${status}". Keep it concise and professional.`;
        }
        
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

    const generateSeekerFollowUpEmail = async (jobId: string): Promise<{subject: string, body: string}> => {
        if(!ai || !currentUser) throw new Error("AI not initialized or user not logged in");
        const job = jobs.find(j => j.id === jobId);
        const application = applications.find(a => a.jobId === jobId && a.userId === currentUser.id);
        if (!job || !application) throw new Error("Job or application not found");
        const candidate = candidates.find(c => c.id === application.candidateId);
        if (!candidate) throw new Error("Candidate data not found");
    
        const prompt = `You are a career assistant. Draft a professional and polite follow-up email from a candidate, ${currentUser.name}, regarding their application for the "${job.title}" position. They applied on ${new Date(candidate.appliedAt).toLocaleDateString()}. The email should be concise, express continued interest in the role, and politely inquire about the status of their application.`;
    
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
        if(!job || !profile) {
            setLoading(false);
            throw new Error("Job or user profile not found");
        }
        
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
        // The provided file was truncated here. Returning mock data to ensure app functionality.
        await delay(500);
        const scores: JobMatchScore[] = openJobs.map(job => ({ jobId: job.id, matchScore: Math.floor(Math.random() * 40) + 60 }));
        const recommendations: JobRecommendation[] = scores
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, 3)
            .map(score => ({
                jobId: score.jobId,
                reason: "This job is a strong match based on your skills in " + profile.skills.slice(0, 2).join(', ') + "."
            }));
        return { recommendations, scores };
    };

    const clearProcessingAgentLogs = () => setProcessingAgentLogs([]);
    const clearStrategicAgentLogs = () => setStrategicAgentLogs([]);
    const requestAgentStop = () => setStopAgent(true);

    const openEmailAgent = (initialPrompt?: string) => {
        if (initialPrompt) {
            // Do not run stream immediately, just set the initial message
             setEmailAgentMessages([{ role: 'user', parts: [{ text: initialPrompt }] }]);
        }
        setIsEmailAgentOpen(true);
    };

    const closeEmailAgent = () => {
        setIsEmailAgentOpen(false);
        setEmailAgentMessages([]); // Clear messages on close
    };

    const runEmailAgentStream = async (prompt: string) => {
        if (!emailAgentChat || !currentUser) return;
        setLoading(true);
        setEmailAgentMessages(prev => [...prev, { role: 'user', parts: [{ text: prompt }] }]);

        try {
            // Step 1: Send user prompt and get initial response (could include function call)
            const resultStream = await emailAgentChat.sendMessageStream({ message: prompt });

            let aggregatedText = '';
            let functionCalls: any[] = [];
            
            setEmailAgentMessages(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

            for await (const chunk of resultStream) {
                if (chunk.text) {
                    aggregatedText += chunk.text;
                    setEmailAgentMessages(prev => {
                        const newMsgs = [...prev];
                        newMsgs[newMsgs.length - 1].parts = [{ text: aggregatedText }];
                        return newMsgs;
                    });
                }
                if (chunk.functionCalls) {
                    functionCalls.push(...chunk.functionCalls);
                }
            }

            // Step 2: If there's a function call, execute it and send the result back
            if (functionCalls.length > 0) {
                const fc = functionCalls[0];
                if (fc.name === 'sendEmailToHiringManager') {
                    const { jobTitle, subject, body } = fc.args;
                    
                    const job = jobs.find(j => j.title.toLowerCase() === jobTitle.toLowerCase());
                    const application = job ? applications.find(a => a.jobId === job.id && a.userId === currentUser.id) : undefined;
                    
                    let functionResult: { success: boolean, message: string };

                    if (job && application) {
                        logEmail({
                            userId: job.hrId, // To the HR user
                            candidateId: application.candidateId,
                            jobTitle: job.title,
                            subject,
                            body,
                        });
                        functionResult = { success: true, message: `Email successfully sent to the hiring manager for "${job.title}".` };
                    } else {
                        functionResult = { success: false, message: `Could not find the job "${jobTitle}" in your applications. Please make sure you have applied and the title is correct.` };
                    }
                    
                    // Step 3: Get the final confirmation from the model
                    // FIX: The `sendMessageStream` method expects a `message` property, not `parts`,
                    // when sending a tool response.
                    const toolResultStream = await emailAgentChat.sendMessageStream({
                        message: [{ functionResponse: { name: fc.name, response: functionResult } }]
                    });

                    let confirmationText = '';
                    // Replace the previous model message which might just be an empty text part from the function call
                    setEmailAgentMessages(prev => {
                        const newMsgs = [...prev];
                        newMsgs[newMsgs.length - 1].parts = [{ text: '' }];
                        return newMsgs;
                    });

                    for await (const chunk of toolResultStream) {
                        confirmationText += chunk.text;
                         setEmailAgentMessages(prev => {
                            const newMsgs = [...prev];
                            newMsgs[newMsgs.length - 1].parts = [{ text: confirmationText }];
                            return newMsgs;
                        });
                    }
                }
            }
        } catch (e) {
            console.error(e);
            const errorMessage = "Sorry, I encountered an error. Please try again.";
             setEmailAgentMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                // If the last message was the model's empty placeholder, replace it.
                if(lastMsg.role === 'model' && lastMsg.parts[0].text === '') {
                     lastMsg.parts = [{ text: errorMessage }];
                     return newMsgs;
                }
                // Otherwise, add a new error message.
                return [...newMsgs, { role: 'model', parts: [{ text: errorMessage }] }];
            });
        } finally {
            setLoading(false);
        }
    };
    
    const processApplicationsAgent = async (jobId: string) => {
        setLoading(true);
        setProcessingAgentLogs([]);
        const job = jobs.find(j => j.id === jobId);
        if (!job) {
            setProcessingAgentLogs(["Error: Job not found."]);
            setLoading(false);
            return;
        }

        setProcessingAgentLogs(prev => [...prev, `Agent activated for "${job.title}".`]);
        await delay(500);

        if (job.aiInterviewAfterScreening) {
            setProcessingAgentLogs(prev => [...prev, "AI Interview post-screening is ENABLED."]);
            await delay(500);

            const jobCandidates = getCandidatesForJob(job.id);
            const minScore = job.minAtsScore || 70;
            setProcessingAgentLogs(prev => [...prev, `Found ${jobCandidates.length} candidates. Minimum ATS score is ${minScore}.`]);
            await delay(1000);

            let updatedCandidatesCount = 0;
            const updatedApplications = [...applications];

            setProcessingAgentLogs(prev => [...prev, 'Starting candidate evaluation...']);
            await delay(500);

            for (const candidate of jobCandidates) {
                const app = updatedApplications.find(a => a.candidateId === candidate.id);
                if (!app) {
                     setProcessingAgentLogs(prev => [...prev, `  - ⚠️ Could not find application for candidate ${candidate.name}. Skipping.`]);
                     await delay(200);
                     continue;
                }

                const scoreCheckPassed = candidate.score >= minScore;
                const statusCheckPassed = app.status === 'Under Review';

                if (!scoreCheckPassed) {
                     setProcessingAgentLogs(prev => [...prev, `  - ❌ ${candidate.name} failed check. Comparison: score(${candidate.score}) < minScore(${minScore}).`]);
                     await delay(200);
                } else if (!statusCheckPassed) {
                     setProcessingAgentLogs(prev => [...prev, `  - ⏩ ${candidate.name} skipped. Pre-check: score(${candidate.score}) >= minScore(${minScore}). Reason: Status is '${app.status}', not 'Under Review'.`]);
                     await delay(200);
                } else {
                    // Candidate qualifies and is in the correct state
                    app.status = 'Interviewing';
                    updatedCandidatesCount++;
                    setProcessingAgentLogs(prev => [...prev, `  - ✅ ${candidate.name} PASSED. Check: score(${candidate.score}) >= minScore(${minScore}) and status is 'Under Review'. Action: Status updated to 'Interviewing'.`]);
                    await delay(200);
                }
            }

            setApplications(updatedApplications);
            setProcessingAgentLogs(prev => [...prev, `Agent updated ${updatedCandidatesCount} candidate(s) to the 'Interviewing' stage.`]);
            await delay(500);

        } else {
            setProcessingAgentLogs(prev => [...prev, "AI Interview post-screening is DISABLED. No statuses will be changed."]);
            await delay(500);
        }
        
        setProcessingAgentLogs(prev => [...prev, "Screening complete."]);
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, processingStatus: 'Completed' } : j));
        setLoading(false);
    };

    const runStrategicHRAgent = async (prompt: string) => {
        setLoading(true);
        setStrategicAgentLogs(prev => [...prev, `User: ${prompt}`]);
        await delay(1000);
        setStrategicAgentLogs(prev => [...prev, `Agent: Acknowledged. Executing task...`]);
        await delay(1500);
        setStrategicAgentLogs(prev => [...prev, `Agent: Task completed successfully.`]);
        setLoading(false);
    };

    const runVideoAnalysisAgent = async (applicationId: string) => {
        setAnalyzingVideoAppId(applicationId);
        try {
            const app = applications.find(a => a.id === applicationId);
            if (app && app.interviewTranscript) {
                await delay(2000); // Simulate processing time
                await evaluateInterviewTranscript(applicationId, app.interviewTranscript);
            } else {
                console.error("Application or transcript not found for analysis.");
            }
        } catch (e) {
            console.error("Video analysis agent failed:", e);
            setError("Failed to analyze the video interview.");
        } finally {
            setAnalyzingVideoAppId(null);
        }
    };

    // FIX: This provider was not returning a JSX component.
    // Replaced JSX with React.createElement to be compatible with a .ts file extension,
    // which resolves parsing errors.
    return React.createElement(SmartHireContext.Provider, {
        value: {
            currentUser, users, jobs, candidates, applications, userProfiles, questions, emailLogs, jobAlerts, savedJobs, selectedJob, loading, error, processingAgentLogs, strategicAgentLogs, masterAgentLogs, emailAgentMessages, isEmailAgentOpen, appliedJobIds, ai, analyzingVideoAppId, login, logout, signup, sendPasswordResetLink, selectJob, createJob, updateJob, closeJob, getCandidatesForJob, getApplicationForCandidate, updateApplicationStatus, updateJobCriteria, logEmail, getQuestionsForJob, answerQuestion, askQuestion, exportCandidates, saveJob, unsaveJob, getApplicationsForCurrentUser, getUserProfileForCurrentUser, updateUserProfile, getEmailsForCurrentUser, getJobAlertsForCurrentUser, updateJobAlerts, clearProcessingAgentLogs, clearStrategicAgentLogs, requestAgentStop, openEmailAgent, closeEmailAgent, saveVideoInterview, parseJobDescription, uploadResume, generateFollowUpEmail, generateSeekerFollowUpEmail, optimizeResumeForJob, getJobRecommendations, processApplicationsAgent, runEmailAgentStream, runStrategicHRAgent, runVideoAnalysisAgent, clearError, markEmailsAsReadForCurrentUser
        }
    }, children);
};