import { useState, useEffect, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Coffee } from 'lucide-react';

import { useCourses } from './hooks/useCourses';
import { parseCourseToEvents } from './utils/calendarUtils';
import { checkForConflict } from './utils/schedulerUtils';
import { Step1_CourseSelection } from './components/Step1_CourseSelection';
import { Step2_SelectSections } from './components/Step2_SelectSections';
import { Step3_Export } from './components/Step3_Export';
import { GroupModal } from './components/GroupModal';
import { CustomClassModal } from './components/CustomClassModal';
import { AlertModal } from './components/AlertModal';
import { AboutModal } from './components/AboutModal';
import { AlertContext } from './contexts/AlertContext';
import type { Requirement, Schedule, AppStep, CourseSection } from './types';

export default function App() {
    const { allCoursesData, setAllCoursesData, uniqueCourses, loading, error } = useCourses();
    const [step, setStep] = useState<AppStep>(1);
    const [requiredItems, setRequiredItems] = useState<Requirement[]>([]);
    const [selectedSections, setSelectedSections] = useState<Schedule>({});
    // State for modals
    const [isGroupModalOpen, setGroupModalOpen] = useState(false);
    const [isCustomClassModalOpen, setCustomClassModalOpen] = useState(false);
    const [isAboutModalOpen, setAboutModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<CourseSection | null>(null);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: '', message: '' });

    const [generatedSchedules, setGeneratedSchedules] = useState<Schedule[]>([]);
    const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0);
    const [presetGroupAdded, setPresetGroupAdded] = useState(false);

    const showAlert = useCallback((title: string, message: string) => {
        setAlertConfig({ isOpen: true, title, message });
    }, []);

    useEffect(() => {
        if (allCoursesData.length === 0 || presetGroupAdded) return;
        const ieSections = allCoursesData.filter(c => c.Section.endsWith('.i'));
        if (ieSections.length > 0) {
            const ieCourseCodes = [...new Set(ieSections.map(c => c['Subject Code']))];
            const ieGroup: Requirement = {
                id: 'group_IE_preset', type: 'group', name: 'Interdisciplinary Elective (IE)',
                courses: ieCourseCodes, priority: 100, excluded: false,
            };
            setRequiredItems(prevItems => [ieGroup, ...prevItems]);
            setPresetGroupAdded(true);
        }
    }, [allCoursesData, presetGroupAdded]);

    const calendarEvents = useMemo(() => {
        return Object.values(selectedSections).flatMap(parseCourseToEvents);
    }, [selectedSections]);

    const handleSaveGroup = (groupName: string, courseCodes: string[]) => {
        const newGroup: Requirement = {
            id: `group_${Date.now()}`, type: 'group', name: groupName,
            courses: courseCodes, priority: 100, excluded: false,
        };
        setRequiredItems(prev => [...prev, newGroup]);
    };
    
    const handleOpenCustomClassModal = (classToEdit: CourseSection | null = null) => {
        setEditingClass(classToEdit);
        setCustomClassModalOpen(true);
    };

    const handleSaveCustomClass = (customClassData: CourseSection) => {
        if (editingClass) {
            setAllCoursesData(prev => prev.map(c => 
                (c.isCustom && c["Subject Code"] === editingClass["Subject Code"] && c.Section === editingClass.Section) 
                ? customClassData : c
            ));
            setSelectedSections(prev => {
                const newSelections = {...prev};
                for (const reqId in newSelections) {
                    if (newSelections[reqId]["Subject Code"] === editingClass["Subject Code"] && newSelections[reqId].Section === editingClass.Section) {
                        newSelections[reqId] = customClassData;
                    }
                }
                return newSelections;
            });
        } else {
            const newRequirement: Requirement = {
                id: `custom_${customClassData["Subject Code"]}_${customClassData.Section}`,
                type: 'course', name: `${customClassData["Subject Code"]} (Custom)`,
                priority: 50, excluded: false, isCustom: true,
            };
            setAllCoursesData(prev => [...prev, customClassData]);
            setRequiredItems(prev => [...prev, newRequirement]);
            setSelectedSections(prev => ({ ...prev, [newRequirement.id]: { ...customClassData, isLocked: true } }));
        }
        setEditingClass(null);
    };

    const runAutoScheduler = () => {
        const lockedSelections: Schedule = {};
        const requirementsToSchedule: Requirement[] = [];
        
        requiredItems.forEach(req => {
            const selected = selectedSections[req.id];
            if (selected && selected.isLocked) {
                lockedSelections[req.id] = selected;
            } else { requirementsToSchedule.push(req); }
        });

        requirementsToSchedule.sort((a, b) => a.priority - b.priority);

        const getSectionsForId = (id: string): CourseSection[] => {
            const item = requiredItems.find(r => r.id === id);
            if (!item) return [];
            if (item.isCustom) return allCoursesData.filter(c => c.isCustom && `custom_${c["Subject Code"]}_${c.Section}` === id);
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
            showAlert("Success!", `Successfully generated ${uniqueSchedules.length} unique schedules!`);
        } else {
            setGeneratedSchedules([]);
            setSelectedSections(lockedSelections);
            showAlert("No Schedules Found", "Could not find any valid schedule with the given constraints and priorities.");
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
                if(requiredIds.has(key)) { newSelections[key] = prev[key]; }
            }
            return newSelections;
        });
    }, [requiredItems]);

    const renderStep = () => {
        switch (step) {
            case 1:
                return <Step1_CourseSelection uniqueCourses={uniqueCourses} requiredItems={requiredItems} setRequiredItems={setRequiredItems} setStep={setStep} openGroupModal={() => setGroupModalOpen(true)} openCustomClassModal={() => handleOpenCustomClassModal()} />;
            case 2:
                return <Step2_SelectSections allCoursesData={allCoursesData} setAllCoursesData={setAllCoursesData} requiredItems={requiredItems} setRequiredItems={setRequiredItems} selectedSections={selectedSections} setSelectedSections={setSelectedSections} setStep={setStep} runAutoScheduler={runAutoScheduler} generatedSchedules={generatedSchedules} currentScheduleIndex={currentScheduleIndex} setCurrentScheduleIndex={setCurrentScheduleIndex} openCustomClassModal={handleOpenCustomClassModal} />;
            case 3:
                return <Step3_Export selectedSections={selectedSections} setStep={setStep} />;
            default:
                return <Step1_CourseSelection uniqueCourses={uniqueCourses} requiredItems={requiredItems} setRequiredItems={setRequiredItems} setStep={setStep} openGroupModal={() => setGroupModalOpen(true)} openCustomClassModal={() => handleOpenCustomClassModal()} />;
        }
    };
    
    const subtitleText: { [key in AppStep]: string } = {
        1: "Step 1: Select your required courses.",
        2: "Step 2: Set priorities and schedule.",
        3: "Step 3: Finalize and export your schedule."
    };

    if (loading) return <div className="flex items-center justify-center h-screen text-xl font-semibold">Loading Course Data...</div>;
    if (error) return <div className="flex items-center justify-center h-screen text-xl font-semibold text-red-500 p-8 text-center">{error}</div>;

    return (
        <AlertContext.Provider value={showAlert}>
            <div className="flex h-screen overflow-hidden bg-gray-100 font-sans text-gray-800">
                <AlertModal isOpen={alertConfig.isOpen} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} title={alertConfig.title} message={alertConfig.message} />
                <AboutModal isOpen={isAboutModalOpen} onClose={() => setAboutModalOpen(false)} />
                <GroupModal isOpen={isGroupModalOpen} onClose={() => setGroupModalOpen(false)} uniqueCourses={uniqueCourses} onSave={handleSaveGroup} />
                <CustomClassModal isOpen={isCustomClassModalOpen} onClose={() => setCustomClassModalOpen(false)} onSave={handleSaveCustomClass} initialData={editingClass} />
                
                <aside className="w-full md:w-1/3 max-w-lg bg-white border-r border-gray-200 flex flex-col">
                    <div className="p-4 border-b border-gray-200 flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <h1 className="text-2xl font-bold">Class Planner</h1>
                            <button 
                                onClick={() => setAboutModalOpen(true)} 
                                title="About this project" 
                                className="text-yellow-600 hover:text-yellow-700 hover:scale-110 transition-transform p-1 rounded-full animate-pulse"
                            >
                                <Coffee size={24} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500">{subtitleText[step]}</p>
                    </div>
                    {allCoursesData.length > 0 && renderStep()}
                </aside>

                <main className="hidden md:flex flex-1 flex-col bg-gray-50">
                    <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                        <h2 className="text-xl font-bold">Weekly Schedule Preview</h2>
                    </header>
                    <div className="flex-1 p-4 relative">
                        <FullCalendar plugins={[timeGridPlugin, interactionPlugin]} initialView="timeGridWeek" headerToolbar={false} allDaySlot={false} hiddenDays={[0]} slotMinTime="07:00:00" slotMaxTime="22:00:00" height="100%" events={calendarEvents} eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }} firstDay={1} contentHeight="auto" />
                    </div>
                </main>
            </div>
        </AlertContext.Provider>
    );
}