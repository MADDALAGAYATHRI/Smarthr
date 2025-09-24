
import React from 'react';
import { SmartHireProvider, useSmartHire } from './hooks/useSmartHire';
import AuthPage from './components/AuthPage';
import HRDashboard from './components/hr/HRDashboard';
import JobSeekerPortal from './components/jobseeker/JobSeekerPortal';
import Header from './components/common/Header';

const AppContent = () => {
    const { currentUser, logout } = useSmartHire();

    const renderContent = () => {
        if (!currentUser) {
            return <AuthPage />;
        }

        if (currentUser.role === 'HR') {
            return <HRDashboard />;
        }

        if (currentUser.role === 'Job Seeker') {
            return <JobSeekerPortal />;
        }

        return <div>Invalid user role.</div>;
    };

    return (
        <div className="bg-slate-50 min-h-screen font-sans text-slate-800">
            <Header currentUser={currentUser} onLogout={logout} />
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {renderContent()}
            </main>
        </div>
    );
};


const App = () => {
    return (
        <SmartHireProvider>
            <AppContent />
        </SmartHireProvider>
    );
};

export default App;