import React, { useState, useMemo } from 'react';
import { useSmartHire } from '../../hooks/useSmartHire';
import type { Job } from '../../types';

// Simple date utility functions to avoid a library dependency
const dateFns = {
  startOfMonth: (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1),
  endOfMonth: (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0),
  startOfWeek: (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  },
  addDays: (date: Date, days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  },
  addMonths: (date: Date, months: number) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  },
  subMonths: (date: Date, months: number) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() - months);
    return d;
  },
  isSameMonth: (date1: Date, date2: Date) =>
    date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth(),
  isSameDay: (date1: Date, date2: Date) =>
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate(),
  isToday: (date: Date) => dateFns.isSameDay(date, new Date()),
  format: (date: Date, formatStr: string) => {
    if (formatStr === 'MMMM yyyy') {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (formatStr === 'd') {
      return date.getDate().toString();
    }
    if (formatStr === 'yyyy-MM-dd') {
      return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    }
    return date.toString();
  },
};

interface CalendarEvent {
    type: 'deadline' | 'interview';
    title: string;
    time?: string;
    jobTitle: string;
}

const CalendarView = () => {
    const { jobs, applications, candidates } = useSmartHire();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    const eventsByDate = useMemo(() => {
        const events: Record<string, CalendarEvent[]> = {};

        // 1. Job application deadlines
        jobs.forEach(job => {
            if (job.applicationDeadline) {
                const deadlineDate = new Date(job.applicationDeadline);
                const dateStr = dateFns.format(deadlineDate, 'yyyy-MM-dd');
                if (!events[dateStr]) events[dateStr] = [];
                events[dateStr].push({
                    type: 'deadline',
                    title: `Deadline`,
                    jobTitle: job.title
                });
            }
        });

        // 2. Mock Interviews
        applications.forEach(app => {
            if (app.status === 'Interviewing') {
                const candidate = candidates.find(c => c.id === app.candidateId);
                if (!candidate) return;
                
                const pseudoRandomDay = (parseInt(candidate.id.replace(/\D/g, ''), 10) % 28) + 1;
                const interviewDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), pseudoRandomDay);
                const dateStr = dateFns.format(interviewDate, 'yyyy-MM-dd');

                if (!events[dateStr]) events[dateStr] = [];
                events[dateStr].push({
                    type: 'interview',
                    title: `Interview`,
                    jobTitle: `${candidate.name} (${jobs.find(j => j.id === app.jobId)?.title || 'N/A'})`,
                    time: `${(pseudoRandomDay % 8) + 9}:00 AM`
                });
            }
        });
        return events;
    }, [jobs, applications, candidates, currentDate]);

    const monthStart = dateFns.startOfMonth(currentDate);
    const startDate = dateFns.startOfWeek(monthStart);

    const days = useMemo(() => {
        const calendarDays = [];
        let day = startDate;
        for (let i = 0; i < 42; i++) { // Render 6 weeks to cover all possibilities
            calendarDays.push(day);
            day = dateFns.addDays(day, 1);
        }
        return calendarDays;
    }, [startDate]);

    const handlePrevMonth = () => {
        setCurrentDate(dateFns.subMonths(currentDate, 1));
        setSelectedDate(null);
    }
    const handleNextMonth = () => {
        setCurrentDate(dateFns.addMonths(currentDate, 1));
        setSelectedDate(null);
    }
    const handleDayClick = (day: Date) => setSelectedDate(day);
    const handleGoToToday = () => {
      setCurrentDate(new Date());
      setSelectedDate(new Date());
    }

    const selectedDayEvents = selectedDate ? eventsByDate[dateFns.format(selectedDate, 'yyyy-MM-dd')] || [] : [];

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
             <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                <div className="lg:col-span-7">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-slate-900">{dateFns.format(currentDate, 'MMMM yyyy')}</h3>
                        <div className="flex items-center space-x-1">
                            <button onClick={handleGoToToday} className="px-3 py-1.5 rounded-md text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors">Today</button>
                            <button onClick={handlePrevMonth} aria-label="Previous month" className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button onClick={handleNextMonth} aria-label="Next month" className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 uppercase pb-2 border-b border-slate-200">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1 mt-1">
                        {days.map((day, i) => {
                            const dayStr = dateFns.format(day, 'yyyy-MM-dd');
                            const dayEvents = eventsByDate[dayStr] || [];
                            const isCurrentMonth = dateFns.isSameMonth(day, currentDate);
                            const isToday = dateFns.isToday(day);
                            const isSelected = selectedDate && dateFns.isSameDay(day, selectedDate);

                            return (
                                <div key={i} onClick={() => handleDayClick(day)} className={`relative flex flex-col h-24 p-1.5 rounded-lg cursor-pointer transition-colors border ${isCurrentMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50 text-slate-400'} ${isSelected ? 'border-primary shadow-md' : 'border-slate-200'}`}>
                                    <span className={`self-end text-sm font-semibold ${isToday ? 'bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center' : 'p-1'}`}>
                                        {dateFns.format(day, 'd')}
                                    </span>
                                    {dayEvents.length > 0 && isCurrentMonth && (
                                        <div className="mt-1 space-y-1 overflow-hidden">
                                            {dayEvents.slice(0, 1).map((event, index) => (
                                                <div key={index} className={`flex items-center text-xs px-1.5 py-0.5 rounded-md ${event.type === 'deadline' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0 ${event.type === 'deadline' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                                    <span className="truncate">{event.title}</span>
                                                </div>
                                            ))}
                                            {dayEvents.length > 1 && <p className="text-xs text-slate-500 mt-1 pl-1.5">+{dayEvents.length - 1} more</p>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="lg:col-span-3 bg-slate-50 p-4 rounded-lg border border-slate-200 min-h-[300px] flex flex-col">
                    <h4 className="font-bold text-slate-900 text-lg mb-4 flex-shrink-0">
                        {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
                    </h4>
                    {selectedDayEvents.length > 0 ? (
                        <div className="space-y-3 overflow-y-auto">
                            {selectedDayEvents.map((event, i) => (
                                <div key={i} className={`p-3 rounded-lg border-l-4 ${event.type === 'deadline' ? 'border-blue-500 bg-blue-50' : 'border-green-500 bg-green-50'}`}>
                                    <p className="font-bold text-slate-800 text-sm">{event.title}</p>
                                    <p className="text-xs text-slate-600">{event.jobTitle}</p>
                                    {event.time && (
                                        <div className="flex items-center text-xs text-slate-600 mt-1">
                                            <svg className="w-3 h-3 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                            <span>{event.time}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center flex-grow">
                            <svg className="w-12 h-12 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            <p className="text-sm text-slate-500">No events scheduled for this day.</p>
                        </div>
                    )}
                     <div className="mt-auto pt-4 border-t border-slate-200 flex-shrink-0">
                        <h5 className="font-semibold text-sm text-slate-700 mb-2">Legend</h5>
                        <div className="space-y-1.5 text-sm">
                            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div><span className="text-slate-600">Application Deadline</span></div>
                            <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div><span className="text-slate-600">Interview Scheduled</span></div>
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
};

export default CalendarView;