"use client";

/**
 * CalendarPane - MORA Calendar Integration
 * 
 * A full calendar app for scheduling and events.
 * Phase 1: Local calendar with UI
 * Phase 2: Google Calendar / Outlook sync
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassPanel } from "@/components/layers/GlassPanel";
import { usePaneStore } from "@/lib/store/paneStore";
import { useMoraStore } from "@/lib/store/moraState";
import { coreGet, corePost } from "@/lib/api/coreClient";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    MapPin,
    Users,
    X,
    Sparkles
} from "lucide-react";

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    time?: string;
    duration?: number; // minutes
    location?: string;
    attendees?: string[];
    color?: string;
}

interface CalendarPaneProps {
    id?: string;
}

export function CalendarPane({ id = "calendar-main" }: CalendarPaneProps) {
    const { removePane, minimizePane, focusPane, getPane, updatePanePosition, updatePaneSize } = usePaneStore();
    const pane = getPane(id);

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showNewEvent, setShowNewEvent] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState("");
    const coreError = useMoraStore(state => state.coreError);

    // Map backend response to UI Event
    const mapEvent = (apiEvent: any): CalendarEvent => ({
        id: apiEvent.id,
        title: apiEvent.title,
        date: new Date(apiEvent.date), // Expecting YYYY-MM-DD
        time: apiEvent.time,
        duration: apiEvent.duration,
        location: apiEvent.location,
        color: apiEvent.color || "bg-emerald-500",
        attendees: apiEvent.attendees
    });

    // Fetch events from backend
    const fetchEvents = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await coreGet("/v3/calendar/events", { isOptional: true });
            if (data && Array.isArray(data)) {
                setEvents(data.map(mapEvent));
            } else {
                // Fallback or empty state
                setEvents([]);
            }
        } catch (e) {
            console.error("Failed to load calendar events", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load on mount
    React.useEffect(() => {
        if (pane) {
            fetchEvents();
        }
    }, [pane, fetchEvents]);

    // Calendar navigation
    const goToPrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        const now = new Date();
        setCurrentDate(now);
        setSelectedDate(now);
    };

    // Generate calendar grid
    const generateCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days: (Date | null)[] = [];

        // Add empty cells for days before the first day of the month
        const startDayOfWeek = firstDay.getDay() || 7; // Convert Sunday (0) to 7
        for (let i = 1; i < startDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    // Get events for a specific date
    const getEventsForDate = (date: Date) => {
        if (!date) return [];
        return events.filter(event =>
            event.date.toDateString() === date.toDateString()
        );
    };

    // Check if date is today
    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    // Check if date is selected
    const isSelected = (date: Date) => {
        return selectedDate?.toDateString() === date.toDateString();
    };

    // Add new event
    const handleAddEvent = async () => {
        if (!newEventTitle.trim() || !selectedDate) return;

        // Optimistic UI update
        const tempId = `temp-${Date.now()}`;
        const newEvent: CalendarEvent = {
            id: tempId,
            title: newEventTitle,
            date: selectedDate,
            time: "12:00", // Default time
            duration: 60,
            color: "bg-emerald-500"
        };

        setEvents(prev => [...prev, newEvent]);
        setNewEventTitle("");
        setShowNewEvent(false);

        try {
            // Persist to backend
            const payload = {
                title: newEvent.title,
                date: newEvent.date.toISOString().split('T')[0], // YYYY-MM-DD
                time: newEvent.time,
                duration: newEvent.duration,
                color: newEvent.color
            };

            const created = await corePost("/v3/calendar/events", payload);
            if (created) {
                // Replace temp event with real one
                setEvents(prev => prev.map(e => e.id === tempId ? mapEvent(created) : e));
            }
        } catch (e) {
            // Revert if failed
            console.error("Failed to create event", e);
            setEvents(prev => prev.filter(e => e.id !== tempId));
            // Show error toast (not implemented here)
        }
    };

    if (!pane) return null;

    const monthNames = [
        "Januar", "Februar", "Maerz", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember"
    ];

    const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

    return (
        <GlassPanel
            title="Calendar"
            width={pane.size.width}
            height={pane.size.height}
            initialX={pane.position.x}
            initialY={pane.position.y}
            onPositionChange={(x, y) => updatePanePosition(id, x, y)}
            onResize={(w, h) => updatePaneSize(id, w, h)}
            onClose={() => removePane(id)}
            onMinimize={() => minimizePane(id)}
            onFocus={() => focusPane(id)}
            isActive={true}
            zIndex={pane.zIndex}
            showCloseButton
            showMinimizeButton
            draggable
            resizable
        >
            <div className="flex flex-col h-full bg-[#030806]/95">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <CalendarIcon className="w-5 h-5 text-orange-400" />
                        <div>
                            <h2 className="text-lg font-light text-emerald-50">
                                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                            </h2>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={goToToday}
                            className="px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                        >
                            Heute
                        </button>
                        <button
                            onClick={goToPrevMonth}
                            className="p-2 rounded-lg hover:bg-white/5 text-white/60 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={goToNextMonth}
                            className="p-2 rounded-lg hover:bg-white/5 text-white/60 transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 p-4 overflow-hidden">
                    {/* Week day headers */}
                    <div className="grid grid-cols-7 mb-2">
                        {weekDays.map(day => (
                            <div key={day} className="text-center text-[10px] text-emerald-500/50 uppercase tracking-wider py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {generateCalendarDays().map((date, index) => (
                            <motion.div
                                key={index}
                                whileHover={{ scale: date ? 1.05 : 1 }}
                                onClick={() => date && setSelectedDate(date)}
                                className={`
                                    aspect-square rounded-lg flex flex-col items-center justify-start p-1 cursor-pointer transition-all
                                    ${!date ? 'opacity-0' : ''}
                                    ${date && isToday(date) ? 'bg-emerald-500/20 border border-emerald-500/30' : ''}
                                    ${date && isSelected(date) ? 'bg-mora-gold/20 border border-mora-gold/30' : ''}
                                    ${date && !isToday(date) && !isSelected(date) ? 'hover:bg-white/5 border border-transparent' : ''}
                                `}
                            >
                                {date && (
                                    <>
                                        <span className={`text-sm ${isToday(date) ? 'text-emerald-400 font-bold' : 'text-emerald-100'}`}>
                                            {date.getDate()}
                                        </span>
                                        {/* Event indicators */}
                                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                                            {getEventsForDate(date).slice(0, 3).map(event => (
                                                <div
                                                    key={event.id}
                                                    className={`w-1.5 h-1.5 rounded-full ${event.color || 'bg-emerald-500'}`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Selected Date Events Panel */}
                <AnimatePresence>
                    {selectedDate && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-white/5 overflow-hidden"
                        >
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-medium text-emerald-100">
                                        {selectedDate.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
                                    </h3>
                                    <button
                                        onClick={() => setShowNewEvent(true)}
                                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>

                                {/* Events list */}
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {getEventsForDate(selectedDate).length === 0 ? (
                                        <p className="text-xs text-emerald-500/40 text-center py-4">
                                            Keine Termine an diesem Tag
                                        </p>
                                    ) : (
                                        getEventsForDate(selectedDate).map(event => (
                                            <div
                                                key={event.id}
                                                className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/5"
                                            >
                                                <div className={`w-1 h-8 rounded-full ${event.color || 'bg-emerald-500'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-emerald-100 truncate">{event.title}</p>
                                                    <div className="flex items-center gap-2 text-[10px] text-emerald-500/50">
                                                        <Clock size={10} />
                                                        <span>{event.time}</span>
                                                        {event.duration && <span>- {event.duration} min</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* New event form */}
                                <AnimatePresence>
                                    {showNewEvent && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="mt-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
                                        >
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={newEventTitle}
                                                    onChange={(e) => setNewEventTitle(e.target.value)}
                                                    onKeyDown={(e) => e.key === "Enter" && handleAddEvent()}
                                                    placeholder="Neuer Termin..."
                                                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-emerald-50 placeholder:text-emerald-500/30 focus:outline-none focus:border-emerald-500/30"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={handleAddEvent}
                                                    disabled={!newEventTitle.trim()}
                                                    className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 disabled:opacity-50 transition-colors"
                                                >
                                                    Hinzufuegen
                                                </button>
                                                <button
                                                    onClick={() => setShowNewEvent(false)}
                                                    className="p-2 rounded-lg hover:bg-white/5 text-white/40"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MORA Integration hint */}
                <div className="p-3 border-t border-white/5 flex items-center gap-2 text-[10px] text-emerald-500/40">
                    <Sparkles size={12} className="text-mora-gold/50" />
                    <span>Events are stored as nodes and visible in the graph</span>
                </div>
            </div>
        </GlassPanel>
    );
}

export default CalendarPane;
