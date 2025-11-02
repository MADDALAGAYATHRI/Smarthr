import React from 'react';

interface SignupSuccessProps {
    onLoginClick: () => void;
}

const SignupSuccess = ({ onLoginClick }: SignupSuccessProps) => {
    return (
        <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Created!</h2>
            <p className="text-slate-600 mb-6">Your account has been successfully created. You can now log in to access the platform.</p>
            <button
                onClick={onLoginClick}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
                Proceed to Login
            </button>
        </div>
    );
};

export default SignupSuccess;