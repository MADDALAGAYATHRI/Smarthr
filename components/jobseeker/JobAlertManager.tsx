import React, { useState, useEffect } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';

const JobAlertManager = () => {
    const { getJobAlertsForCurrentUser, updateUserProfile, updateJobAlerts, getUserProfileForCurrentUser } = useSmartHire();
    const profile = getUserProfileForCurrentUser();
    const [keywords, setKeywords] = useState<string>('');
    const [saved, setSaved] = useState<boolean>(false);

    useEffect(() => {
        const subscription = getJobAlertsForCurrentUser();
        if (subscription && subscription.keywords.length > 0) {
            setKeywords(subscription.keywords.join(', '));
        } else if (profile && profile.skills.length > 0) {
            setKeywords(profile.skills.join(', '));
        }
    }, [getJobAlertsForCurrentUser, profile]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const keywordArray = keywords.split(',').map(kw => kw.trim()).filter(Boolean);
        updateJobAlerts(keywordArray);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleSyncSkills = () => {
        if (profile && profile.skills) {
            setKeywords(profile.skills.join(', '));
        }
    };

    const inputStyle = "w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow";

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto border border-slate-200">
            <div className="flex items-center space-x-3 mb-4">
                 <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
                <h3 className="text-2xl font-bold text-slate-900">Job Alert Preferences</h3>
            </div>
            <p className="text-slate-600 mb-6">
                Enter keywords for jobs you are interested in (e.g., "React", "Python", "UX Designer"). You will receive an email notification when a new job matching your criteria is posted. Separate keywords with a comma.
            </p>

            <form onSubmit={handleSave}>
                <label htmlFor="keywords" className="block text-slate-700 font-bold mb-2">Keywords</label>
                <input
                    id="keywords"
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="frontend, react, javascript..."
                    className={inputStyle}
                />
                 {profile && (
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-sm text-slate-600 mb-2">Want to use the skills from your profile?</p>
                        <button
                            type="button"
                            onClick={handleSyncSkills}
                            className="bg-primary/10 text-primary font-bold py-2 px-4 rounded-lg hover:bg-primary/20 transition-colors text-sm"
                        >
                            Sync with my profile skills
                        </button>
                    </div>
                )}
                <div className="flex justify-end items-center mt-6">
                    {saved && <span className="text-slate-600 font-semibold mr-4 animate-fade-in-out">Preferences saved!</span>}
                    <button
                        type="submit"
                        className="bg-primary text-white font-bold py-2 px-6 rounded-lg hover:bg-primary-dark transition-colors"
                    >
                        Save
                    </button>
                </div>
            </form>
        </div>
    );
};

export default JobAlertManager;