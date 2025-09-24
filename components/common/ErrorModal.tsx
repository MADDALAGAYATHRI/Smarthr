
import React from 'react';

interface ErrorModalProps {
    message: string;
    onClose: () => void;
}

const ErrorModal = ({ message, onClose }: ErrorModalProps) => {
    return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md border-2 border-red-500/20 text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">
                    !
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">An Error Occurred</h3>
                <p className="text-slate-600 mb-6">{message}</p>
                <button
                    onClick={onClose}
                    className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

export default ErrorModal;