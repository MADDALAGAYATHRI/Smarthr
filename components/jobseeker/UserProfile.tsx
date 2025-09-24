
import React, { useState, useEffect } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import FileUpload from './FileUpload';

const inputStyle = "w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow disabled:bg-slate-100";
const buttonPrimary = "bg-primary text-white font-bold py-2 px-5 rounded-lg hover:bg-primary-dark transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed";
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

        // Simulate reading file and calling AI
        try {
            const resumeText = await file.text();
            // Simulate Gemini call to extract info
            const extractedSummary = "AI-extracted summary: Experienced software developer with a passion for creating intuitive user interfaces and robust backend systems. Proficient in modern JavaScript frameworks and cloud technologies.";
            const extractedSkills = ["React", "TypeScript", "Node.js", "AWS", "Agile Methodologies", "UI/UX Design"];
            
            await updateUserProfile({
                resumeText,
                summary: extractedSummary,
                skills: extractedSkills,
            });
            
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
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto border border-slate-200">
                <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">Create Your Professional Profile</h3>
                <p className="text-slate-600 text-center mb-6">Upload your resume to get started. Our AI will analyze it to build your initial profile, helping you apply for jobs faster.</p>
                
                {loading ? (
                    <div className="text-center py-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <p className="text-slate-800 font-semibold">Analyzing your resume...</p>
                    </div>
                ) : (
                    <FileUpload onFileChange={handleFileUpload} />
                )}
                {formError && <p className="text-red-500 text-sm text-center mt-4">{formError}</p>}
            </div>
        );
    }

    return (
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-slate-200">
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
                        <p className="text-sm text-slate-600 mb-4">Upload a new file to replace your current resume on file.</p>
                        <FileUpload onFileChange={handleFileUpload} />
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