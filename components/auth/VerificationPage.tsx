
import React from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import type { User } from '../../types';

interface VerificationPageProps {
    currentUser: User;
}

const VerificationPage = ({ currentUser }: VerificationPageProps) => {
    // FIX: Removed `verifyHrUser` as it no longer exists in the context.
    const { logout } = useSmartHire();

    const handleVerify = () => {
        // This feature has been removed as per comments in `useSmartHire.ts` and `App.tsx`.
        // The button click will now log a warning instead of calling a non-existent function.
        console.warn("HR verification is no longer required.");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-lg text-center">
                 <div className="flex items-center justify-center space-x-3 mb-8">
                    <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    <h1 className="text-4xl font-bold text-slate-900">Verify Your Account</h1>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-2xl shadow-slate-200 border border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Almost there, {currentUser.name}!</h2>
                    <p className="text-slate-600 mb-6">
                        To ensure the integrity of our platform, we require HR professionals to verify their company email address. A verification link has been sent to <span className="font-semibold text-primary">{currentUser.email}</span>.
                    </p>
                     <p className="text-sm text-slate-500 mb-6">
                        (For this demo, simply click the button below to simulate verifying your email.)
                    </p>
                    <button
                        onClick={handleVerify}
                        className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-dark transition-colors mb-4"
                    >
                        Click here to verify your email
                    </button>
                    <button onClick={logout} className="text-sm text-slate-500 hover:underline">
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VerificationPage;