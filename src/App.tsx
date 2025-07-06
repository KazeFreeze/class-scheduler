import { useState, useEffect, useMemo } from 'react';
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
    const { allCoursesData, setAllCoursesData, uniqueCourses, loading, error } = useCourses();
    
    const [step, setStep] = useState<AppStep>(1);
    const [requiredItems, setRequiredItems] = useState<Requirement[]>([]);
    const [selectedSections, setSelectedSections] = useState<Schedule>({});
    const [isGroupModalOpen, setGroupModalOpen] = useState(false);
    
    const [generatedSchedules, setGeneratedSchedules] = useState<Schedule[]>([]);
    const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0);

    // CORRECTED: Added a state flag to ensure the preset group is added only once.
    // This prevents the unstable re-render cycle that was causing the crash.
    const [presetGroupAdded, setPresetGroupAdded] = useState(false);

    useEffect(() => {
        // Guard against running before data is loaded or if the group has already been added.
        if (allCoursesData.length === 0 || presetGroupAdded) return;

        const ieSections = allCoursesData.filter(c => c.Section.endsWith('.i'));
        
        if (ieSections.length > 0) {
            const ieCourseCodes = [...new Set(ieSections.map(c => c['Subject Code']))];
            const ieGroup: Requirement = {
                id: 'group_IE_preset',
                type: 'group',
                name: 'Interdisciplinary Elective (IE)',
                courses: ieCourseCodes,
                priority: 100,
                excluded: false,
            };
            
            // Add the new group and set the flag to true to prevent this from running again.
            setRequiredItems(prevItems => [ieGroup, ...prevItems]);
            setPresetGroupAdded(true);
        }
    }, [allCoursesData, presetGroupAdded]); // Dependency array is now stable.

    const calendarEvents = useMemo(() => {
        return Object.values(selectedSections).flatMap(parseCourseToEvents);
    }, [selectedSections]);

    const handleSaveGroup = (groupName: string, courseCodes: string[]) => {
        const newGroup: Requirement = {
            id: `group_${Date.now()}`,
            type: 'group',
            name: groupName,
            courses: courseCodes,
            priority: 100,
            excluded: false,
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

        requirementsToSchedule.sort((a, b) => a.priority - b.priority);
        
        const getSectionsForId = (id: string): CourseSection[] => {
            const item = requiredItems.find(r => r.id === id);
            if (!item) return [];
            const courseCodes = item.type === 'group' ? item.courses : [item.id];
            return allCoursesData.filter(c => courseCodes?.includes(c["Subject Code"]));
        };
        
        const sectionsByRequirement = new Map<string, CourseSection[]>();
        requirementsToSchedule.forEach(req => {
            const possibleSections = getSectionsForId(req.id);
            const validSections = possibleSections.filter(sec => !sec.excluded && sec.Slots > 0);
            validSections.sort((a, b) => a.priority - b.priority);
            sectionsByRequirement.set(req.id, validSections);
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

        const uniqueSchedules: Schedule[] = [];
        const seenSchedules = new Set<string>();

        for (const schedule of schedules) {
            const scheduleKey = Object.keys(schedule).sort().map(reqId => {
                const section = schedule[reqId];
                return `${reqId}:${section['Subject Code']}:${section.Section}`;
            }).join('|');

            if (!seenSchedules.has(scheduleKey)) {
                seenSchedules.add(scheduleKey);
                uniqueSchedules.push(schedule);
            }
        }

        if (uniqueSchedules.length > 0) {
            setGeneratedSchedules(uniqueSchedules);
            setCurrentScheduleIndex(0);
            setSelectedSections(uniqueSchedules[0]);
            alert(`Successfully generated ${uniqueSchedules.length} unique schedules!`);
        } else {
            setGeneratedSchedules([]);
            setSelectedSections(lockedSelections);
            alert("Could not find any valid schedule with the given constraints and priorities.");
        }
    };
    
    useEffect(() => {
        if (generatedSchedules.length > 0 && currentScheduleIndex < generatedSchedules.length) {
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
                return <Step2_SelectSections 
                    allCoursesData={allCoursesData} 
                    setAllCoursesData={setAllCoursesData} 
                    requiredItems={requiredItems} 
                    setRequiredItems={setRequiredItems}
                    selectedSections={selectedSections} 
                    setSelectedSections={setSelectedSections} 
                    setStep={setStep} 
                    runAutoScheduler={runAutoScheduler} 
                    generatedSchedules={generatedSchedules} 
                    currentScheduleIndex={currentScheduleIndex} 
                    setCurrentScheduleIndex={setCurrentScheduleIndex} 
                />;
            case 3:
                return <Step3_Export selectedSections={selectedSections} setStep={setStep} />;
            default:
                return <Step1_CourseSelection uniqueCourses={uniqueCourses} requiredItems={requiredItems} setRequiredItems={setRequiredItems} setStep={setStep} openGroupModal={() => setGroupModalOpen(true)} />;
        }
    };
    
    const subtitleText: { [key in AppStep]: string } = {
        1: "Step 1: Select your required courses.",
        2: "Step 2: Set priorities and schedule.",
        3: "Step 3: Finalize and export your schedule."
    }

    if (loading) return <div className="flex items-center justify-center h-screen text-xl font-semibold">Loading Course Data...</div>;
    if (error) return <div className="flex items-center justify-center h-screen text-xl font-semibold text-red-500 p-8 text-center">{error}</div>;

    return (
        <div className="flex h-screen overflow-hidden bg-gray-100 font-sans text-gray-800">
            <GroupModal isOpen={isGroupModalOpen} onClose={() => setGroupModalOpen(false)} uniqueCourses={uniqueCourses} onSave={handleSaveGroup} />
            
            <aside className="w-full md:w-1/3 max-w-lg bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200 flex-shrink-0">
                    <h1 className="text-2xl font-bold">Class Planner</h1>
                    <p className="text-sm text-gray-500">{subtitleText[step]}</p>
                </div>
                {allCoursesData.length > 0 && renderStep()}
            </aside>

            <main className="hidden md:flex flex-1 flex-col bg-gray-50">
                <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Weekly Schedule Preview</h2>
                </header>
                <div className="flex-1 p-4 relative">
                    <FullCalendar
                        plugins={[timeGridPlugin, interactionPlugin]}
                        initialView="timeGridWeek"
                        headerToolbar={false}
                        allDaySlot={false}
                        hiddenDays={[0]} // Hide Sunday
                        slotMinTime="07:00:00"
                        slotMaxTime="22:00:00"
                        height="100%"
                        events={calendarEvents}
                        eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
                        firstDay={1} // Start week on Monday
                        contentHeight="auto"
                    />
                </div>
            </main>
        </div>
    );
}
