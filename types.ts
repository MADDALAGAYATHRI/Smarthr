export type UserRole = 'HR' | 'Job Seeker';
export type UserStatus = 'active' | 'pending_verification';
export type AuthProvider = 'email' | 'google' | 'microsoft';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional for social logins
  role: UserRole;
  status?: UserStatus; // Mainly for HR verification
  provider?: AuthProvider;
}

export interface Job {
  id: string;
  hrId: string; // The ID of the HR user who created the job
  title: string;
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
  processingStatus?: 'Pending' | 'Completed';
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
}

export type ApplicationStatus = 'Under Review' | 'Interviewing' | 'Rejected' | 'Hired';

export interface Application {
    id:string;
    jobId: string;
    userId: string;
    candidateId: string;
    status: ApplicationStatus;
}

export interface GeminiScoreResponse {
  name: string;
  email: string;
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

export interface EmailLog {
  id: string;
  userId: string;
  candidateId?: string;
  jobTitle: string;
  subject: string;
  body: string;
  sentAt: string;
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