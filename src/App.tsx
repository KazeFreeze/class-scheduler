import React, { useState, useEffect, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

import { useCourses } from './hooks/useCourses';
import { parseCourseToEvents } from './utils/calendarUtils';
import { checkForConflict } from './utils/schedulerUtils';
import { Step1_CourseSelection } from './components/Step1_CourseSelection';
import { Step2_SelectSections } from './components/Step2_SelectSections';
import { Step3_Export } from './components/Step3_Export';
import { GroupModal } from './components/GroupModal';
import type { Requirement, Schedule, AppStep, CourseSection } from './types';

export default function App() {
    const { allCoursesData, uniqueCourses, loading, error } = useCourses();
    const [step, setStep] = useState<AppStep>(1);
    const [requiredItems, setRequiredItems] = useState<Requirement[]>([]);
    const [selectedSections, setSelectedSections] = useState<Schedule>({});
    const [isGroupModalOpen, setGroupModalOpen] = useState(false);
    
    const [generatedSchedules, setGeneratedSchedules] = useState<Schedule[]>([]);
    const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0);

    const calendarEvents = useMemo(() => {
        return Object.values(selectedSections).flatMap(parseCourseToEvents);
    }, [selectedSections]);

    const handleSaveGroup = (groupName: string, courseCodes: string[]) => {
        const newGroup: Requirement = {
            id: `group_${Date.now()}`,
            type: 'group',
            name: groupName,
            courses: courseCodes,
        };
        setRequiredItems(prev => [...prev, newGroup]);
    };
    
    const runAutoScheduler = () => {
        const lockedSelections: Schedule = {};
        const requirementsToSchedule: Requirement[] = [];

        requiredItems.forEach(req => {
            const selected = selectedSections[req.id];
            if (selected && selected.isLocked) {
                lockedSelections[req.id] = selected;
            } else {
                requirementsToSchedule.push(req);
            }
        });

        const newSelectedSections = { ...lockedSelections };
        
        const getSectionsForId = (id: string): CourseSection[] => {
            const item = requiredItems.find(r => r.id === id);
            if (!item) return [];
            const courseCodes = item.type === 'group' ? item.courses : [item.id];
            return allCoursesData.filter(c => courseCodes?.includes(c["Subject Code"]));
        };
        
        const sectionsByRequirement = new Map<string, CourseSection[]>();
        requirementsToSchedule.forEach(req => {
            sectionsByRequirement.set(req.id, getSectionsForId(req.id));
        });

        const schedules: Schedule[] = [];

        function findSchedulesRecursive(reqIndex: number, currentSchedule: Schedule) {
            if (schedules.length >= 100) return;

            if (reqIndex === requirementsToSchedule.length) {
                schedules.push({ ...currentSchedule });
                return;
            }

            const req = requirementsToSchedule[reqIndex];
            const possibleSections = sectionsByRequirement.get(req.id) || [];

            for (const section of possibleSections) {
                if (!checkForConflict(section, currentSchedule, req.id)) {
                    currentSchedule[req.id] = section;
                    findSchedulesRecursive(reqIndex + 1, currentSchedule);
                    delete currentSchedule[req.id];
                }
            }
        }

        findSchedulesRecursive(0, { ...lockedSelections });

        if (schedules.length > 0) {
            setGeneratedSchedules(schedules);
            setCurrentScheduleIndex(0);
            setSelectedSections(schedules[0]);
            alert(`Successfully generated ${schedules.length} possible schedules!`);
        } else {
            setSelectedSections(newSelectedSections);
            alert("Could not find any valid schedule with the given constraints.");
        }
    };
    
    useEffect(() => {
        if (generatedSchedules.length > 0) {
            setSelectedSections(generatedSchedules[currentScheduleIndex]);
        }
    }, [currentScheduleIndex, generatedSchedules]);
    
    useEffect(() => {
        setGeneratedSchedules([]);
        setCurrentScheduleIndex(0);
        setSelectedSections(prev => {
            const newSelections: Schedule = {};
            const requiredIds = new Set(requiredItems.map(r => r.id));
            for (const key in prev) {
                if(requiredIds.has(key)) {
                    newSelections[key] = prev[key];
                }
            }
            return newSelections;
        });
    }, [requiredItems]);


    const renderStep = () => {
        switch (step) {
            case 1:
                return <Step1_CourseSelection uniqueCourses={uniqueCourses} requiredItems={requiredItems} setRequiredItems={setRequiredItems} setStep={setStep} openGroupModal={() => setGroupModalOpen(true)} />;
            case 2:
                return <Step2_SelectSections allCoursesData={allCoursesData} requiredItems={requiredItems} selectedSections={selectedSections} setSelectedSections={setSelectedSections} setStep={setStep} runAutoScheduler={runAutoScheduler} generatedSchedules={generatedSchedules} currentScheduleIndex={currentScheduleIndex} setCurrentScheduleIndex={setCurrentScheduleIndex} />;
            case 3:
                return <Step3_Export selectedSections={selectedSections} setStep={setStep} />;
            default:
                return <Step1_CourseSelection uniqueCourses={uniqueCourses} requiredItems={requiredItems} setRequiredItems={setRequiredItems} setStep={setStep} openGroupModal={() => setGroupModalOpen(true)} />;
        }
    };
    
    const subtitleText: { [key in AppStep]: string } = {
        1: "Step 1: Select your required courses.",
        2: "Step 2: Choose sections for each course.",
        3: "Step 3: Finalize and export your schedule."
    }

    if (loading) {
        return <div className="flex items-center justify-center h-screen text-xl font-semibold">Loading Course Data...</div>;
    }

    if (error) {
        return <div className="flex items-center justify-center h-screen text-xl font-semibold text-red-500 p-8">{error}</div>;
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 font-sans text-gray-800">
            <GroupModal isOpen={isGroupModalOpen} onClose={() => setGroupModalOpen(false)} uniqueCourses={uniqueCourses} onSave={handleSaveGroup} />
            
            <aside className="w-full md:w-1/3 max-w-lg bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200 flex-shrink-0">
                    <h1 className="text-2xl font-bold">Class Planner</h1>
                    <p className="text-sm text-gray-500">{subtitleText[step]}</p>
                </div>
                {renderStep()}
            </aside>

            <main className="hidden md:flex flex-1 flex-col bg-gray-50">
                <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Weekly Schedule</h2>
                </header>
                <div className="flex-1 p-4 relative">
                    <FullCalendar
                        plugins={[timeGridPlugin, interactionPlugin]}
                        initialView="timeGridWeek"
                        headerToolbar={false}
                        allDaySlot={false}
                        hiddenDays={[0]}
                        slotMinTime="07:00:00"
                        slotMaxTime="22:00:00"
                        height="100%"
                        events={calendarEvents}
                        eventTimeFormat={{
                            hour: 'numeric',
                            minute: '2-digit',
                            meridiem: 'short'
                        }}
                        firstDay={1}
                        contentHeight="auto"
                    />
                </div>
            </main>
        </div>
    );
}
