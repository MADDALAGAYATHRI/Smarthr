
import React, { useState } from 'react';
import LoginForm from './auth/LoginForm';
import SignupForm from './auth/SignupForm';
import ForgotPasswordForm from './auth/ForgotPasswordForm';
import SignupSuccess from './auth/SignupSuccess';

const AuthPage = () => {
    type AuthView = 'login' | 'signup' | 'forgot_password' | 'signup_success';
    const [view, setView] = useState<AuthView>('login');
    const [lastRegisteredEmail, setLastRegisteredEmail] = useState<string>('');

    const handleSignupSuccess = (email: string) => {
        setLastRegisteredEmail(email);
        setView('signup_success');
    };

    const renderView = () => {
        switch (view) {
            case 'login':
                return <LoginForm onForgotPassword={() => setView('forgot_password')} emailFromSignup={lastRegisteredEmail} />;
            case 'signup':
                return <SignupForm onSignupSuccess={handleSignupSuccess} />;
            case 'forgot_password':
                return <ForgotPasswordForm onBackToLogin={() => setView('login')} />;
            case 'signup_success':
                 return <SignupSuccess onLoginClick={() => setView('login')} />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="bg-white p-8 rounded-2xl shadow-2xl shadow-slate-200 border border-slate-200">
                    {renderView()}
                    
                    { (view === 'login' || view === 'signup') && (
                        <p className="mt-6 text-center text-sm text-slate-600">
                            {view === 'login' ? "Don't have an account? " : "Already have an account? "}
                            <button
                                onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                                className="font-medium text-primary hover:text-primary-dark"
                            >
                                {view === 'login' ? 'Sign up' : 'Log in'}
                            </button>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthPage;