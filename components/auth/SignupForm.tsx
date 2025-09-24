
import React, { useState } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import type { UserRole } from '../../types';

interface RoleCardProps {
    title: string;
    description: string;
    icon: React.ReactElement;
    selected: boolean;
    onSelect: () => void;
}
const RoleCard = ({ title, description, icon, selected, onSelect }: RoleCardProps) => (
    <div
        onClick={onSelect}
        className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 text-center ${
            selected ? 'border-primary bg-primary/10 shadow-lg' : 'border-slate-300 bg-white hover:border-primary'
        }`}
    >
        <div className={`mx-auto w-12 h-12 flex items-center justify-center rounded-full mb-2 ${selected ? 'bg-primary text-white' : 'bg-slate-100 text-primary'}`}>{icon}</div>
        <h3 className="font-bold text-slate-800">{title}</h3>
    </div>
);

const PasswordStrengthMeter = ({ password }: { password?: string }) => {
    const checkPasswordStrength = () => {
        let score = 0;
        if (!password) return 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    };
    
    const strength = checkPasswordStrength();
    const strengthText = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][strength];
    const colorClass = ['text-red-500', 'text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500', 'text-green-500'][strength];
    const bgColorClass = ['bg-red-500', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-500'][strength];

    return (
        <div className="mt-2 h-4">
            {password && (
                <>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${bgColorClass} transition-all duration-300`} style={{ width: `${(strength / 5) * 100}%` }}></div>
                    </div>
                    <p className={`text-xs text-right mt-1 font-semibold ${colorClass}`}>
                        {strength > 0 && strengthText}
                    </p>
                </>
            )}
        </div>
    );
}


const SignupForm = () => {
    const { signup, error } = useSmartHire();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<UserRole>('Job Seeker');
    const [formError, setFormError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if(!name || !email || !password || !role) {
            setFormError("Please fill out all fields.");
            return;
        }
        signup(name, email, password, role);
    };

    const inputStyle = "mt-1 block w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow";


    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-slate-900">Create Your Account</h2>
            {(error || formError) && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error || formError}</p>}
            <div>
                <label htmlFor="signup-name" className="block text-sm font-medium text-slate-700">Full Name</label>
                <input
                    id="signup-name" type="text" value={name} onChange={e => setName(e.target.value)} required
                    className={inputStyle}
                />
            </div>
             <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700">Email Address</label>
                <input
                    id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className={inputStyle}
                />
            </div>
            <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700">Password</label>
                <input
                    id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required
                    className={inputStyle}
                />
                <PasswordStrengthMeter password={password} />
            </div>

            <div>
                 <label className="block text-sm font-medium text-slate-700 mb-2">I am a...</label>
                 <div className="grid grid-cols-2 gap-4">
                    <RoleCard
                        title="Job Seeker"
                        description=""
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                        selected={role === 'Job Seeker'}
                        onSelect={() => setRole('Job Seeker')}
                    />
                     <RoleCard
                        title="Recruiter"
                        description=""
                        icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" /></svg>}
                        selected={role === 'HR'}
                        onSelect={() => setRole('HR')}
                    />
                 </div>
            </div>

            <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
                Sign Up
            </button>
        </form>
    );
};

export default SignupForm;