
import React, { useState } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';

interface ForgotPasswordFormProps {
    onBackToLogin: () => void;
}

const ForgotPasswordForm = ({ onBackToLogin }: ForgotPasswordFormProps) => {
    const { sendPasswordResetLink } = useSmartHire();
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const success = await sendPasswordResetLink(email);
        if (success) {
            setSubmitted(true);
        } else {
            setError("No account found with that email address.");
        }
    };
    
    const inputStyle = "mt-1 block w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow";

    if (submitted) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Check Your Email</h2>
                <p className="text-slate-600 mb-6">
                    If an account with <span className="font-semibold text-primary">{email}</span> exists, you will receive an email with instructions on how to reset your password.
                </p>
                <button
                    onClick={onBackToLogin}
                    className="text-sm font-medium text-primary hover:text-primary-dark"
                >
                    &larr; Back to Login
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
             <h2 className="text-2xl font-bold text-center text-slate-900">Forgot Password</h2>
             <p className="text-slate-600 text-center text-sm">Enter your email and we'll send you a link to get back into your account.</p>
            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</p>}
            <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">Email Address</label>
                <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className={inputStyle}
                />
            </div>
            <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
                Send Reset Link
            </button>
            <div className="text-center">
                 <button
                    type="button"
                    onClick={onBackToLogin}
                    className="text-sm font-medium text-primary hover:text-primary-dark"
                >
                    &larr; Back to Login
                </button>
            </div>
        </form>
    );
};

export default ForgotPasswordForm;