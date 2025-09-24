
import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../../types';

interface HeaderProps {
    currentUser: User | null;
    onLogout: () => void;
}

const Header = ({ currentUser, onLogout }: HeaderProps) => {
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
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
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
                                 <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
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