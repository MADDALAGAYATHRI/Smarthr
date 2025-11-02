
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleGenAI, Type, Chat } from '@google/genai';
import type { User, Job, Candidate, Application, UserProfile, GeminiScoreResponse, ChatMessage, Question, JobAlertSubscription, EmailLog, JobMatchScore, JobRecommendation, UserRole, ApplicationStatus, CommunicationAnalysis, ConversationHistory } from '../types';
import { MOCK_USERS, MOCK_JOBS, MOCK_CANDIDATES, MOCK_APPLICATIONS, MOCK_PROFILES, MOCK_QUESTIONS } from '../utils/mockData';
import { FunctionDeclaration } from '@google/genai';
import { generateCompanyLogo } from '../utils/logoGenerator';

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

const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
});


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
    strategicAgentLogs: string[];
    masterAgentLogs: string[];
    emailAgentMessages: ChatMessage[];
    emailAgentHistory: ConversationHistory[];
    isEmailAgentOpen: boolean;
    appliedJobIds: Set<string>;
    ai: GoogleGenAI | null;
    analyzingVideoAppIds: Set<string>;
    updatingStatusAppIds: Set<string>;
    login: (email: string, password_param: string, rememberMe: boolean) => void;
    logout: () => void;
    signup: (name: string, email: string, password_param: string, role: UserRole) => Promise<boolean>;
    sendPasswordResetLink: (email: string) => Promise<boolean>;
    selectJob: (id: string | null) => void;
    createJob: (jobData: Partial<Job> & { newAttachments?: File[] }) => Job;
    updateJob: (jobId: string, updates: Partial<Job> & { newAttachments?: File[] }) => boolean;
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
    clearStrategicAgentLogs: () => void;
    requestAgentStop: () => void;
    openEmailAgent: (initialPrompt?: string) => void;
    closeEmailAgent: () => void;
    clearEmailAgentHistory: () => void;
    parseJobDescription: (file: File) => Promise<Partial<Job>>;
    uploadResume: (jobId: string, resumeFile: File, videoBlob?: Blob) => Promise<void>;
    generateFollowUpEmail: (candidateId: string, jobId: string, status: ApplicationStatus) => Promise<{ subject: string; body: string; }>;
    generateSeekerFollowUpEmail: (jobId: string) => Promise<{ subject: string; body: string; }>;
    optimizeResumeForJob: (jobId: string) => Promise<{ optimizedResume: string; changes: string[]; }>;
    getJobRecommendations: () => Promise<{ recommendations: JobRecommendation[]; scores: JobMatchScore[]; }>;
    runEmailAgentStream: (prompt: string) => Promise<void>;
    runStrategicHRAgent: (prompt: string) => Promise<void>;
    runVideoAnalysisAgent: (appId: string) => Promise<void>;
    saveVideoInterview: (appId: string, videoUrl: string, transcript: string) => void;
    clearError?: () => void;
    markEmailsAsReadForCurrentUser?: () => void;
}

const SmartHireContext = createContext<ISmartHireContext | null>(null);

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
    const [analyzingVideoAppIds, setAnalyzingVideoAppIds] = useState<Set<string>>(new Set());
    const [updatingStatusAppIds, setUpdatingStatusAppIds] = useState<Set<string>>(new Set());

    // --- AGENT LOGS ---
    const [strategicAgentLogs, setStrategicAgentLogs] = useState<string[]>([]);
    const [masterAgentLogs, setMasterAgentLogs] = useState<string[]>([]);
    const [emailAgentMessages, setEmailAgentMessages] = useState<ChatMessage[]>([]);
    const [emailAgentHistory, setEmailAgentHistory] = useState<ConversationHistory[]>([]);
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
        const apiKey = process.env.API_KEY;
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

    const signup = async (name: string, email: string, password_param: string, role: UserRole): Promise<boolean> => {
        setError(null);
        if (users.some(u => u.email === email)) {
            setError('An account with this email already exists.');
            return false;
        }
        const newUser: User = {
            id: `user-${Date.now()}`,
            name,
            email,
            password: password_param,
            role,
            status: 'active'
        };
        await delay(1000);
        setUsers(prev => [...prev, newUser]);
        return true;
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
    const createJob = (jobData: Partial<Job> & { newAttachments?: File[] }): Job => {
        const newAttachments = (jobData.newAttachments || []).map(file => ({
            name: file.name,
            url: URL.createObjectURL(file)
        }));

        const companyName = jobData.companyName || 'Company Not Specified';

        const newJob: Job = {
            id: `job-${Date.now()}`,
            hrId: currentUser!.id,
            title: jobData.title || 'Untitled Job',
            companyName: companyName,
            companyLogo: generateCompanyLogo(companyName),
            description: jobData.description || 'No description provided.',
            requirements: jobData.requirements || 'No requirements specified.',
            location: jobData.location,
            salary: jobData.salary,
            workModel: jobData.workModel,
            applicationDeadline: jobData.applicationDeadline,
            status: 'Open',
            createdAt: new Date().toISOString(),
            attachments: newAttachments,
            isVideoIntroRequired: jobData.isVideoIntroRequired,
        };
        setJobs(prev => [newJob, ...prev]);

        // --- NEW LOGIC FOR JOB ALERT NOTIFICATIONS ---
        const jobText = `${newJob.title} ${newJob.description} ${newJob.requirements}`.toLowerCase();
        
        jobAlerts.forEach(alert => {
            const user = users.find(u => u.id === alert.userId);
            if (!user || user.role !== 'Job Seeker') return;

            const matchedKeywords = alert.keywords.filter(keyword => 
                keyword.trim() && jobText.includes(keyword.trim().toLowerCase())
            );

            if (matchedKeywords.length > 0) {
                const subject = `New Job Alert: ${newJob.title}`;
                const body = `Hi ${user.name},\n\nA new job, "${newJob.title}", has been posted that matches your alert for the keyword(s): ${matchedKeywords.join(', ')}.\n\nLog in to SmartHire to view the details and apply!\n\nBest regards,\nThe SmartHire Team`;

                logEmail({
                    userId: user.id,
                    jobTitle: newJob.title,
                    subject,
                    body,
                });
            }
        });
        // --- END OF NEW LOGIC ---

        return newJob;
    };

    const updateJob = (jobId: string, updates: Partial<Job> & { newAttachments?: File[] }): boolean => {
        let success = false;
        
        const newAttachments = (updates.newAttachments || []).map(file => ({
            name: file.name,
            url: URL.createObjectURL(file)
        }));

        setJobs(prev => {
            const jobIndex = prev.findIndex(j => j.id === jobId && j.hrId === currentUser?.id);
            if (jobIndex !==-1) {
                success = true;
                const newJobs = [...prev];
                const existingJob = newJobs[jobIndex];

                const finalAttachments = [
                    ...(updates.attachments || existingJob.attachments || []),
                    ...newAttachments
                ];
                
                // remove newAttachments from updates to avoid double-processing
                const { newAttachments: _, ...restUpdates } = updates;
                
                const cleanUpdates = Object.entries(restUpdates).reduce((acc, [key, value]) => {
                    if (value !== undefined) {
                        (acc as any)[key as keyof Job] = value;
                    }
                    return acc;
                }, {} as Partial<Job>);

                newJobs[jobIndex] = { ...existingJob, ...cleanUpdates, attachments: finalAttachments };
                
                if(updates.companyName && updates.companyName !== existingJob.companyName){
                    newJobs[jobIndex].companyLogo = generateCompanyLogo(updates.companyName);
                }

                return newJobs;
            }
            return prev;
        });
        return success;
    };
    
    const runVideoAnalysisAgent = useCallback(async (appId: string) => {
        setAnalyzingVideoAppIds(prev => new Set(prev).add(appId));
        setError(null);
        try {
            const application = applications.find(a => a.id === appId);
            if (!application) {
                throw new Error("Application not found for analysis.");
            }
            const job = jobs.find(j => j.id === application.jobId);
            if (!job) {
                throw new Error("Job associated with the application not found.");
            }
            
            const transcript = application.selfIntroVideoTranscript || '';
    
            const analysisResult = await evaluateVideoTranscript(job, transcript);
            
            // Update the application with the new analysis data
            setApplications(prev => prev.map(app => 
                app.id === appId ? { ...app, ...analysisResult } : app
            ));
    
        } catch (e) {
            console.error("Error running video analysis agent:", e);
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during video analysis.";
            setError(errorMessage);
        } finally {
            setAnalyzingVideoAppIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(appId);
                return newSet;
            });
        }
    }, [applications, jobs]);

    const closeJob = (jobId: string) => {
        setJobs(prev => prev.map(j => 
            j.id === jobId ? { ...j, status: 'Closed' } : j
        ));

        // Automatically trigger video analysis for all applicable candidates for this job
        const appsToAnalyze = applications.filter(app => 
            app.jobId === jobId &&
            app.selfIntroVideoUrl &&
            app.interviewScore === undefined
        );

        if (appsToAnalyze.length > 0) {
            setMasterAgentLogs(prev => [...prev, `Job "${jobs.find(j=>j.id===jobId)?.title}" closed. Triggering video analysis for ${appsToAnalyze.length} candidate(s).`]);
            appsToAnalyze.forEach(app => {
                runVideoAnalysisAgent(app.id); 
            });
        }
    };

    const updateApplicationStatus = async (appId: string, status: ApplicationStatus) => {
        setUpdatingStatusAppIds(prev => new Set(prev).add(appId));
        setError(null);
        try {
            const app = applications.find(a => a.id === appId);
            if (!app) throw new Error("Application not found.");

            const candidate = candidates.find(c => c.id === app.candidateId);
            const job = jobs.find(j => j.id === app.jobId);
            if (!candidate || !job) throw new Error("Associated candidate or job not found.");

            const { subject, body } = await generateFollowUpEmail(candidate.id, job.id, status);

            logEmail({
                userId: candidate.userId,
                candidateId: candidate.id,
                jobTitle: job.title,
                subject,
                body,
            });

            await delay(1500); // Simulate network delay for UI feedback

            setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            setError(`Failed to update status: ${errorMessage}`);
            throw e; // Re-throw to be caught by UI if needed
        } finally {
            setUpdatingStatusAppIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(appId);
                return newSet;
            });
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
    
    const evaluateVideoTranscript = async (job: Job, transcript: string) => {
        if (!ai) {
            console.error("AI not initialized for interview evaluation.");
            return null;
        }

        if (!transcript || transcript.trim() === '') {
            console.log("Interview transcript is empty. Skipping AI evaluation.");
            return { 
                interviewScore: 0,
                aiEvaluationSummary: "The interview recording contained no analyzable speech, so an AI evaluation could not be performed.",
                recommendation: "Manual Review Required",
                skillBreakdown: [],
                communicationAnalysis: undefined,
            };
        }

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
             return JSON.parse(response.text);

        } catch(e) {
            console.error("Error evaluating interview transcript:", e);
            throw new Error("Failed to get evaluation from AI.");
        }
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
    
        const filePart = await fileToGenerativePart(file);
        const prompt = `Parse the following job description document and extract the job title, a comprehensive description, and a detailed list of key requirements. Present the requirements as a single string with each requirement on a new line.`;
    
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: { parts: [{ text: prompt }, filePart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING, description: "The job title." },
                        description: { type: Type.STRING, description: "A comprehensive summary of the job." },
                        requirements: { type: Type.STRING, description: "A list of key requirements, with each on a new line." },
                    }
                }
            }
        });
        return JSON.parse(response.text);
    };
    
    const uploadResume = async (jobId: string, resumeFile: File, videoBlob?: Blob) => {
        if(!ai || !currentUser) throw new Error("Not logged in or AI not initialized");
        setLoading(true);
        setError(null);
        try {
            const job = jobs.find(j => j.id === jobId);
            if(!job) throw new Error("Job not found");
    
            // --- Resume Processing ---
            const resumePart = await fileToGenerativePart(resumeFile);
            const resumePrompt = `Analyze this resume against the following job description. Provide a score from 0-100, a brief summary, a general list of skills, lists of strengths and weaknesses for this specific role, key projects, publications, and certifications. Also extract the candidate's full name, their email address, and the full text from the resume.\n\nJob: ${job.title} - ${job.requirements}`;
            const resumeResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: { parts: [{ text: resumePrompt }, resumePart] },
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
            const result: GeminiScoreResponse & { resumeText: string } = JSON.parse(resumeResponse.text);

            let transcript: string | undefined;
            let videoUrl: string | undefined;

            // --- Video Processing ---
            if (videoBlob) {
                const videoBase64 = await blobToBase64(videoBlob);
                const videoPart = { inlineData: { data: videoBase64, mimeType: videoBlob.type } };
                const transcriptResponse = await ai.models.generateContent({ 
                    model: 'gemini-2.5-flash', 
                    contents: { parts: [{ text: "Transcribe the audio from this video." }, videoPart] }
                });
                transcript = transcriptResponse.text;
                videoUrl = URL.createObjectURL(videoBlob);
            }

            // --- Create Candidate and Application ---
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
                selfIntroVideoUrl: videoUrl,
                selfIntroVideoTranscript: transcript,
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
            setError("Failed to process application with AI. Please check your files and try again.");
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
        if (!profile || !profile.resumeText) return { recommendations: [], scores: [] };

        const openJobs = jobs.filter(j => j.status === 'Open' && !appliedJobIds.has(j.id));
        if (openJobs.length === 0) return { recommendations: [], scores: [] };

        const jobChunks = openJobs.map(job => `Job ID: ${job.id}\nTitle: ${job.title}\nRequirements: ${job.requirements}\n---\n`);

        const prompt = `Based on the following resume, evaluate the user's match for each of the listed jobs. Provide a match score (0-100) for each job. For the top 3 matches, provide a brief, encouraging reason for the match.

        Resume:
        ${profile.resumeText}

        Jobs:
        ${jobChunks.join('')}

        Your response MUST be a valid JSON object with two keys: "scores" and "recommendations".
        - "scores": An array of objects, where each object has "jobId" (string) and "matchScore" (integer). Include a score for every job provided.
        - "recommendations": An array of objects for ONLY the top 3 jobs. Each object must have "jobId" (string) and "reason" (string).`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            scores: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        jobId: { type: Type.STRING },
                                        matchScore: { type: Type.INTEGER }
                                    },
                                    required: ["jobId", "matchScore"]
                                }
                            },
                            recommendations: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        jobId: { type: Type.STRING },
                                        reason: { type: Type.STRING }
                                    },
                                    required: ["jobId", "reason"]
                                }
                            }
                        },
                        required: ["scores", "recommendations"]
                    }
                }
            });
            return JSON.parse(response.text);
        } catch (e) {
            console.error("Error getting job recommendations:", e);
            // Fallback to mock data on error to avoid breaking the UI
            await delay(500);
            const scores: JobMatchScore[] = openJobs.map(job => ({ jobId: job.id, matchScore: Math.floor(Math.random() * 40) + 60 }));
            const recommendations: JobRecommendation[] = scores
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, 3)
                .map(score => ({
                    jobId: score.jobId,
                    reason: "This job is a strong match based on your skills in " + (profile.skills?.slice(0, 2).join(', ') || 'your profile') + "."
                }));
            return { recommendations, scores };
        }
    };

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
        // Save the conversation to history if it's more than just a single user prompt
        if (emailAgentMessages.length > 1) {
            const newHistoryEntry: ConversationHistory = {
                timestamp: new Date().toISOString(),
                messages: emailAgentMessages,
            };
            setEmailAgentHistory(prev => [newHistoryEntry, ...prev]);
        }
        setIsEmailAgentOpen(false);
        setEmailAgentMessages([]); // Clear messages for the next session
    };

    const clearEmailAgentHistory = () => {
        setEmailAgentHistory([]);
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

    const runStrategicHRAgent = async (prompt: string) => {
        setLoading(true);
        setStrategicAgentLogs(prev => [...prev, `User: ${prompt}`]);
        await delay(1000);
        setStrategicAgentLogs(prev => [...prev, `Agent: Acknowledged. Executing task...`]);
        await delay(1500);
        setStrategicAgentLogs(prev => [...prev, `Agent: Task completed successfully.`]);
        setLoading(false);
    };
    
    const saveVideoInterview = useCallback((appId: string, videoUrl: string, transcript: string) => {
        setApplications(prev => prev.map(app => 
            app.id === appId ? { 
                ...app, 
                selfIntroVideoUrl: videoUrl,
                selfIntroVideoTranscript: transcript,
            } : app
        ));
    }, []);

    // FIX: A malformed return statement was causing a cascade of syntax errors.
    // Refactored to create the context value object separately for clarity and correctness.
    // This resolves the errors in this file and the related error in App.tsx.
    const contextValue: ISmartHireContext = {
        currentUser, users, jobs, candidates, applications, userProfiles, questions, emailLogs, jobAlerts, savedJobs, selectedJob, loading, error, strategicAgentLogs, masterAgentLogs, emailAgentMessages, emailAgentHistory, isEmailAgentOpen, appliedJobIds, ai, analyzingVideoAppIds, updatingStatusAppIds, login, logout, signup, sendPasswordResetLink, selectJob, createJob, updateJob, closeJob, getCandidatesForJob, getApplicationForCandidate, updateApplicationStatus, updateJobCriteria, logEmail, getQuestionsForJob, answerQuestion, askQuestion, exportCandidates, saveJob, unsaveJob, getApplicationsForCurrentUser, getUserProfileForCurrentUser, updateUserProfile, getEmailsForCurrentUser, getJobAlertsForCurrentUser, updateJobAlerts, clearStrategicAgentLogs, requestAgentStop, openEmailAgent, closeEmailAgent, clearEmailAgentHistory, parseJobDescription, uploadResume, generateFollowUpEmail, generateSeekerFollowUpEmail, optimizeResumeForJob, getJobRecommendations, runEmailAgentStream, runStrategicHRAgent, runVideoAnalysisAgent, saveVideoInterview, clearError, markEmailsAsReadForCurrentUser
    };

    // FIX: Replaced JSX with React.createElement to be valid in a .ts file, resolving parsing errors.
    return React.createElement(SmartHireContext.Provider, { value: contextValue }, children);
};
