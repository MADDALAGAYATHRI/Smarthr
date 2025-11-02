
import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../../types';

interface HeaderProps {
    currentUser: User | null;
    onLogout: () => void;
}

const SmartHireLogo = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
        <path d="M10 28V12.5C10 9.46243 12.4624 7 15.5 7H28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"></path>
        <path d="M22 4V19.5C22 22.5376 19.5376 25 16.5 25H4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
);

const Header = ({ currentUser, onLogout }: HeaderProps) => {
    // FIX: Add missing '=' for useState hook initialization.
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-40 border-b border-slate-200">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
                <div 
                    className="flex items-center space-x-2"
                >
                    <SmartHireLogo />
                    <h1 className="text-2xl font-bold text-slate-900">SmartHire</h1>
                </div>
                {currentUser && (
                    <div className="flex items-center space-x-2 md:space-x-4">
                       <div className="relative" ref={dropdownRef}>
                            <button 
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                                aria-haspopup="true"
                                aria-expanded={isDropdownOpen}
                            >
                               <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center font-bold text-primary">
                                   {currentUser.name.charAt(0)}
                               </div>
                                <span className="text-sm font-medium text-slate-700 hidden sm:block">
                                    {currentUser.name}
                                </span>
                                 <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>

                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-2xl border border-slate-200 z-50 animate-fade-in-down">
                                    <div className="p-4 border-b border-slate-200">
                                        <p className="font-bold text-slate-800 text-base">{currentUser.name}</p>
                                        <p className="text-sm text-slate-500">{currentUser.email}</p>
                                    </div>
                                    <nav className="py-2">
                                        {currentUser.role === 'Job Seeker' && (
                                            <a href="#profile" onClick={() => setIsDropdownOpen(false)} className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-primary transition-colors">
                                                My Profile
                                            </a>
                                        )}
                                        <button
                                            onClick={() => { onLogout(); setIsDropdownOpen(false); }}
                                            className="w-full text-left block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-primary transition-colors"
                                            aria-label="Logout"
                                        >
                                            Logout
                                        </button>
                                    </nav>
                                </div>
                            )}
                       </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
