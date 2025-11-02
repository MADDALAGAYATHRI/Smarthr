
import React, { useState, useEffect } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';

interface LoginFormProps {
    onForgotPassword: () => void;
    emailFromSignup?: string;
}

const LoginForm = ({ onForgotPassword, emailFromSignup }: LoginFormProps) => {
    const { login, error } = useSmartHire();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
        if (emailFromSignup) {
            setEmail(emailFromSignup);
        }
    }, [emailFromSignup]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        login(email, password, rememberMe);
    };
    
    const inputStyle = "mt-1 block w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
             <h2 className="text-2xl font-bold text-center text-slate-900">Welcome Back!</h2>
            {error && <p className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</p>}
            <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-slate-700">Email Address</label>
                <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className={inputStyle}
                />
            </div>
            <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">Password</label>
                <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className={inputStyle}
                />
            </div>
             <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-primary focus:ring-primary border-slate-300 rounded"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-800">
                        Remember me
                    </label>
                </div>
                 <button type="button" onClick={onForgotPassword} className="text-sm font-medium text-primary hover:text-primary-dark">Forgot password?</button>
            </div>
            <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-gradient-primary hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300"
            >
                Login
            </button>
        </form>
    );
};

export default LoginForm;