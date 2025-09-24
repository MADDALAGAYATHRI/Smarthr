
import React, { useState } from 'react';
import LoginForm from './auth/LoginForm';
import SignupForm from './auth/SignupForm';
import ForgotPasswordForm from './auth/ForgotPasswordForm';
import SignupSuccess from './auth/SignupSuccess';
import { GoogleIcon, MicrosoftIcon } from './auth/SocialIcons';

const AuthPage = () => {
    type AuthView = 'login' | 'signup' | 'forgot_password' | 'signup_success';
    const [view, setView] = useState<AuthView>('login');

    const renderView = () => {
        switch (view) {
            case 'login':
                return <LoginForm onForgotPassword={() => setView('forgot_password')} />;
            case 'signup':
                return <SignupForm />;
            case 'forgot_password':
                return <ForgotPasswordForm onBackToLogin={() => setView('login')} />;
            case 'signup_success':
                 return <SignupSuccess onLoginClick={() => setView('login')} />;
            default:
                return null;
        }
    };

    const SocialButton = ({ icon, provider }: { icon: React.ReactElement; provider: string }) => (
        <button className="flex-1 flex items-center justify-center py-2.5 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors">
            {icon}
            <span className="sr-only">Sign in with {provider}</span>
        </button>
    );

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="bg-white p-8 rounded-2xl shadow-2xl shadow-slate-200 border border-slate-200">
                    {renderView()}
                    
                    { (view === 'login' || view === 'signup') && (
                        <>
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-300" />
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-slate-500">Or continue with</span>
                                </div>
                            </div>
                            <div className="flex gap-4">
                               <SocialButton icon={<GoogleIcon />} provider="Google" />
                               <SocialButton icon={<MicrosoftIcon />} provider="Microsoft" />
                            </div>

                             <p className="mt-6 text-center text-sm text-slate-600">
                                {view === 'login' ? "Don't have an account? " : "Already have an account? "}
                                <button
                                    onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                                    className="font-medium text-primary hover:text-primary-dark"
                                >
                                    {view === 'login' ? 'Sign up' : 'Log in'}
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthPage;