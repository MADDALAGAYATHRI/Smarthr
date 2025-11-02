export type UserRole = 'HR' | 'Job Seeker';
export type UserStatus = 'active' | 'pending_verification';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional for social logins
  role: UserRole;
  status?: UserStatus; // Mainly for HR verification
}

export interface Job {
  id: string;
  hrId: string; // The ID of the HR user who created the job
  title: string;
  companyName?: string;
  description: string;
  roleAndResponsibilities?: string;
  requirements: string;
  companyCulture?: string;
  location?: string;
  salary?: string;
  status: 'Open' | 'Closed';
  createdAt: string;
  applicationDeadline?: string;
  numberOfPositions?: number;
  minAtsScore?: number;
  workModel?: 'On-site' | 'Remote' | 'Hybrid';
  attachments?: { name: string; url: string; }[];
  isVideoIntroRequired?: boolean;
  processingStatus?: 'Pending' | 'Completed';
  companyLogo?: string;
}

export interface Candidate {
  id: string;
  jobId: string;
  userId: string; // The Job Seeker who applied
  name: string;
  email: string;
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  resumeText: string;
  appliedAt: string;
  skills?: string[];
  projects?: string[];
  publications?: string[];
  certifications?: string[];
}

export type ApplicationStatus = 'Under Review' | 'Interviewing' | 'Rejected' | 'Hired';

export interface CommunicationMetric {
  score: number;
  rationale: string;
}

export interface CommunicationAnalysis {
  clarity: CommunicationMetric;
  confidence: CommunicationMetric;
  articulation: CommunicationMetric;
  overallFit: CommunicationMetric;
}


export interface Application {
    id:string;
    jobId: string;
    userId: string;
    candidateId: string;
    status: ApplicationStatus;
    selfIntroVideoUrl?: string;
    selfIntroVideoTranscript?: string;
    interviewScore?: number;
    skillBreakdown?: { skill: string; score: number; rationale: string; }[];
    communicationAnalysis?: CommunicationAnalysis;
    aiEvaluationSummary?: string;
    recommendation?: string;
}

export interface GeminiScoreResponse {
  name: string;
  email: string;
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  projects?: string[];
  publications?: string[];
  certifications?: string[];
  skills?: string[];
}

export interface EmailLog {
  id: string;
  userId: string;
  candidateId?: string;
  jobTitle: string;
  subject: string;
  body: string;
  sentAt: string;
  read: boolean;
}

export interface JobAlertSubscription {
    userId: string;
    keywords: string[];
}

export interface UserProfile {
  userId: string;
  summary: string;
  skills: string[];
  resumeText: string;
}

export interface JobMatchScore {
    jobId: string;
    matchScore: number;
}

export interface JobRecommendation {
    jobId: string;
    reason: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface ConversationHistory {
  timestamp: string;
  messages: ChatMessage[];
}

export interface Question {
  id:string;
  jobId: string;
  userId: string; // Job Seeker's ID
  userName: string; // Job Seeker's name
  questionText: string;
  createdAt: string;
  answer?: {
    hrId: string;
    hrName: string;
    answerText: string;
    answeredAt: string;
  };
}