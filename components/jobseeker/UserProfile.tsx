import React, { useState, useEffect } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import FileUpload from './FileUpload';

const inputStyle = "w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow disabled:bg-slate-100";
const buttonPrimary = "bg-gradient-primary text-white font-bold py-2 px-5 rounded-lg hover:brightness-110 transition-all duration-300 shadow-md hover:shadow-lg disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed";
const buttonSecondary = "bg-slate-100 text-slate-800 font-bold py-2 px-5 rounded-lg hover:bg-slate-200 transition-colors";

interface UserProfileProps {
    onProfileCreated: () => void;
}
const UserProfile = ({ onProfileCreated }: UserProfileProps) => {
    const { getUserProfileForCurrentUser, updateUserProfile, loading } = useSmartHire();
    const profile = getUserProfileForCurrentUser();
    
    const [isEditing, setIsEditing] = useState(false);
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    
    const [summary, setSummary] = useState(profile?.summary || '');
    const [skills, setSkills] = useState(profile?.skills.join(', ') || '');
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (profile) {
            setSummary(profile.summary);
            setSkills(profile.skills.join(', '));
        }
    }, [profile]);
    
    const handleFileUpload = async (file: File | null) => {
        setFormError('');
        if (!file) {
            setResumeFile(null);
            return;
        }
        setResumeFile(file);

        try {
            await updateUserProfile({}, file);
            
            if(!profile) { // If it's the first time creating a profile
                onProfileCreated();
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Failed to process resume.');
        }
    };

    const handleSaveChanges = async () => {
        setFormError('');
        if (!summary.trim() || !skills.trim()) {
            setFormError("Summary and skills cannot be empty.");
            return;
        }
        await updateUserProfile({
            summary,
            skills: skills.split(',').map(s => s.trim()).filter(Boolean)
        });
        setIsEditing(false);
    };

    if (!profile) {
        return (
            <div className="bg-white p-8 rounded-xl shadow-card max-w-2xl mx-auto border border-slate-200">
                <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">Create Your Professional Profile</h3>
                <p className="text-slate-600 text-center mb-6">
                    Get started by uploading your resume. Our AI will automatically extract your professional summary and skills to build your profile.
                </p>
                <FileUpload onFileChange={handleFileUpload} />
                {loading && (
                    <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-slate-800">Analyzing your resume with Gemini...</p>
                    </div>
                )}
                {formError && <p className="text-red-500 text-sm text-center mt-4">{formError}</p>}
                 <div className="text-center text-slate-500 p-4 mt-6 bg-slate-50 rounded-lg border text-sm">
                    Note: Your profile will also be created automatically when you apply for your first job.
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-card border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900">My Profile</h3>
                {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className={buttonPrimary}>Edit Profile</button>
                )}
            </div>

            <div className="space-y-6">
                 <div>
                    <label htmlFor="summary" className="block text-sm font-bold text-slate-700 mb-1">AI-Generated Summary</label>
                    <textarea
                        id="summary"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        disabled={!isEditing}
                        rows={5}
                        className={inputStyle}
                    />
                </div>

                <div>
                    <label htmlFor="skills" className="block text-sm font-bold text-slate-700 mb-1">Key Skills</label>
                    <input
                        id="skills"
                        type="text"
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        disabled={!isEditing}
                        className={inputStyle}
                        placeholder="e.g., React, Python, Project Management"
                    />
                    <p className="text-xs text-slate-500 mt-1">Separate skills with a comma.</p>
                </div>

                 {isEditing && (
                    <div className="pt-4 border-t border-slate-200">
                        <h4 className="text-lg font-bold text-slate-800 mb-2">Update Resume</h4>
                        <p className="text-sm text-slate-600 mb-4">Upload a new file to replace your current resume on file. This will also re-generate your summary and skills based on the new content.</p>
                        <FileUpload onFileChange={handleFileUpload} />
                         {loading && !formError && (
                            <div className="text-center py-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                <p className="text-slate-800">Processing new resume...</p>
                            </div>
                        )}
                        {formError && <p className="text-red-500 text-sm text-center mt-4">{formError}</p>}
                    </div>
                 )}

                {isEditing && (
                    <div className="flex justify-end items-center space-x-4 pt-6 border-t border-slate-200">
                         {formError && <p className="text-red-500 text-sm">{formError}</p>}
                         {loading && <span className="text-slate-600 font-semibold">Saving...</span>}
                        <button onClick={() => { setIsEditing(false); setFormError(''); }} className={buttonSecondary} disabled={loading}>Cancel</button>
                        <button onClick={handleSaveChanges} className={buttonPrimary} disabled={loading}>Save Changes</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserProfile;