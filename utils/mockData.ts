import type { User, Job, Candidate, Application, UserProfile, Question } from '../types';

export const MOCK_USERS: User[] = [
  { id: 'hr-1', name: 'Alice HR', email: 'alice@example.com', password: 'password', role: 'HR', status: 'active' },
  { id: 'user-1', name: 'Bob Smith', email: 'bob@example.com', password: 'password', role: 'Job Seeker' },
  { id: 'user-2', name: 'Charlie Brown', email: 'charlie@example.com', password: 'password', role: 'Job Seeker' },
];

export const MOCK_JOBS: Job[] = [
  {
    id: 'job-1',
    hrId: 'hr-1',
    title: 'Frontend Developer',
    description: 'Join our team to build amazing user interfaces.',
    requirements: 'React, TypeScript, CSS',
    location: 'San Francisco, CA',
    salary: '$100,000 - $140,000',
    status: 'Open',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    applicationDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    workModel: 'Hybrid',
    minAtsScore: 75,
    numberOfPositions: 2,
    processingStatus: 'Pending',
    aiInterviewAfterScreening: true,
  },
  {
    id: 'job-2',
    hrId: 'hr-1',
    title: 'Backend Engineer',
    description: 'Work on our core infrastructure and services.',
    requirements: 'Node.js, Python, AWS',
    location: 'New York, NY',
    salary: '$120,000 - $160,000',
    status: 'Open',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    applicationDeadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Deadline passed
    workModel: 'Remote',
    minAtsScore: 80,
    numberOfPositions: 1,
    processingStatus: 'Pending',
    aiInterviewAfterScreening: true,
  },
  {
    id: 'job-3',
    hrId: 'hr-1',
    title: 'UX Designer',
    description: 'Design intuitive and beautiful user experiences.',
    requirements: 'Figma, Sketch, User Research',
    location: 'Remote',
    salary: '$90,000 - $130,000',
    status: 'Closed',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    applicationDeadline: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    workModel: 'Remote',
  }
];

export const MOCK_CANDIDATES: Candidate[] = [
    {
        id: 'cand-1',
        jobId: 'job-1',
        userId: 'user-1',
        name: 'Bob Smith',
        email: 'bob@example.com',
        score: 85,
        summary: 'Strong frontend developer with extensive React experience.',
        strengths: ['React', 'TypeScript', 'Redux'],
        weaknesses: ['Limited backend knowledge'],
        resumeText: 'Here is the resume text for Bob Smith...',
        appliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        skills: ['React', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3', 'Redux', 'Webpack'],
        projects: ['Developed a real-time chat application using Socket.IO and React.', 'Built a responsive e-commerce dashboard with data visualization.'],
        certifications: ['Certified React Developer'],
    },
    {
        id: 'cand-2',
        jobId: 'job-2',
        userId: 'user-1',
        name: 'Bob Smith',
        email: 'bob@example.com',
        score: 78,
        summary: 'Some backend experience, primarily with Express.js.',
        strengths: ['Node.js', 'Express'],
        weaknesses: ['No Python or AWS experience'],
        resumeText: 'Here is the resume text for Bob Smith...',
        appliedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        skills: ['Node.js', 'Express', 'MongoDB', 'REST APIs'],
        projects: ['Created a RESTful API for a mobile banking application.'],
    }
];

export const MOCK_APPLICATIONS: Application[] = [
    { id: 'app-1', jobId: 'job-1', userId: 'user-1', candidateId: 'cand-1', status: 'Under Review' },
    { 
      id: 'app-2', 
      jobId: 'job-2', 
      userId: 'user-1', 
      candidateId: 'cand-2', 
      status: 'Interviewing',
      interviewScore: 84,
      aiEvaluationSummary: "The candidate shows good foundational knowledge and communicates effectively. Their communication style is professional and well-suited for a collaborative engineering role.",
      recommendation: "Qualified for Next Round",
      skillBreakdown: [
        { skill: 'Node.js', score: 85, rationale: "Demonstrated solid understanding of asynchronous programming." },
        { skill: 'System Design', score: 70, rationale: "Provided a reasonable but basic approach to system architecture." },
      ],
      communicationAnalysis: {
          clarity: { score: 88, rationale: "Candidate uses clear and direct language to explain complex topics." },
          confidence: { score: 78, rationale: "Speaks decisively, though occasionally uses filler words when thinking." },
          articulation: { score: 85, rationale: "Well-structured responses that logically answer the questions." },
          overallFit: { score: 83, rationale: "Communication style is professional and suitable for a collaborative engineering role." },
      },
    },
];

export const MOCK_PROFILES: UserProfile[] = [
    {
        userId: 'user-1',
        summary: 'A skilled job seeker looking for new opportunities in tech.',
        skills: ['JavaScript', 'React', 'HTML', 'CSS'],
        resumeText: 'This is the master resume text for Bob Smith.'
    }
];

export const MOCK_QUESTIONS: Question[] = [
    {
        id: 'q-1',
        jobId: 'job-1',
        userId: 'user-2',
        userName: 'Charlie Brown',
        questionText: 'What is the team size for this role?',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        answer: {
            hrId: 'hr-1',
            hrName: 'Alice HR',
            answerText: 'You would be joining a team of 5 frontend developers.',
            answeredAt: new Date().toISOString()
        }
    },
    {
        id: 'q-2',
        jobId: 'job-1',
        userId: 'user-2',
        userName: 'Charlie Brown',
        questionText: 'Is there an on-call rotation?',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    }
];