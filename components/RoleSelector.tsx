
import React from 'react';
import type { UserRole } from '../types';

interface RoleSelectorProps {
    onSelectRole: (role: UserRole) => void;
}

interface RoleCardProps {
    role: UserRole;
    title: string;
    description: string;
    icon: React.ReactElement;
    onSelect: () => void;
}

const RoleCard = ({ role, title, description, icon, onSelect }: RoleCardProps) => (
    <div
        onClick={onSelect}
        className="bg-white p-8 rounded-xl shadow-lg hover:shadow-primary/20 border-2 border-slate-200 hover:border-primary hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col items-center text-center"
        role="button"
        tabIndex={0}
        aria-label={`Select role: ${title}`}
    >
        <div className="text-primary mb-5">{icon}</div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
);


const RoleSelector = ({ onSelectRole }: RoleSelectorProps) => {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4 text-center">Welcome to SmartHire</h2>
            <p className="text-lg text-slate-600 mb-12 text-center max-w-2xl">The AI-powered platform to connect talented professionals with innovative companies. Please select your role to get started.</p>
            <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
                <RoleCard
                    role="HR"
                    title="HR / Recruiter"
                    description="Post jobs, manage candidates, and leverage AI to find the perfect fit for your team."
                    icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" /></svg>}
                    onSelect={() => onSelectRole('HR')}
                />
                <RoleCard
                    role="Job Seeker"
                    title="Job Seeker"
                    description="Discover opportunities, apply with ease, and track your application status all in one place."
                    icon={<svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                    onSelect={() => onSelectRole('Job Seeker')}
                />
            </div>
        </div>
    );
};

export default RoleSelector;