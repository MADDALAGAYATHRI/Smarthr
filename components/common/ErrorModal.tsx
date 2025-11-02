
import React from 'react';

interface ErrorModalProps {
    title?: string;
    message: string;
    onClose: () => void;
}

const ErrorModal = ({ title = "An Error Occurred", message, onClose }: ErrorModalProps) => {
    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md border-2 border-red-500/20 text-center animate-fade-in-down" role="alertdialog" aria-modal="true" aria-labelledby="error-title" aria-describedby="error-message">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <h3 id="error-title" className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
                <p id="error-message" className="text-slate-600 mb-6">{message}</p>
                <button
                    onClick={onClose}
                    className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default ErrorModal;