import { useState, useEffect, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Coffee, ArrowLeft, Eye, Moon, Sun, ZoomIn, ZoomOut } from 'lucide-react';

import { useCourses } from './hooks/useCourses';
import { parseCourseToEvents } from './utils/calendarUtils';
import { checkForConflict } from './utils/schedulerUtils';
import { Step1_CourseSelection } from './components/Step1_CourseSelection';
import { Step2_SelectSections } from './components/Step2_SelectSections';
import { Step3_Export } from './components/Step3_Export';
import { GroupModal } from './components/GroupModal';
import { CustomClassModal } from './components/CustomClassModal';
import { AlertModal } from './components/AlertModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AboutModal } from './components/AboutModal';
import { AlertContext } from './contexts/AlertContext';
import type { Requirement, Schedule, AppStep, CourseSection } from './types';

// Simple hook to manage theme state
const useTheme = () => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'light' ? 'dark' : 'light');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    return [theme, setTheme] as const;
};

// Configuration for discrete zoom levels
const zoomConfigs = [
    { label: 'Hourly', slotDuration: '01:00:00' },
    { label: '30-Min', slotDuration: '00:30:00' },
    { label: '15-Min', slotDuration: '00:15:00' },
];

export default function App() {
    const { allCoursesData, setAllCoursesData, uniqueCourses, loading, error } = useCourses();
    const [step, setStep] = useState<AppStep>(1);
    const [requiredItems, setRequiredItems] = useState<Requirement[]>([]);
    const [selectedSections, setSelectedSections] = useState<Schedule>({});
    
    const [isGroupModalOpen, setGroupModalOpen] = useState(false);
    const [isCustomClassModalOpen, setCustomClassModalOpen] = useState(false);
    const [isAboutModalOpen, setAboutModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<CourseSection | null>(null);
    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: '', message: '' });
    const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    const [generatedSchedules, setGeneratedSchedules] = useState<Schedule[]>([]);
    const [currentScheduleIndex, setCurrentScheduleIndex] = useState(0);
    const [presetGroupAdded, setPresetGroupAdded] = useState(false);
    const [startSunburstAnimation, setStartSunburstAnimation] = useState(false);
    const [isCalendarVisible, setCalendarVisible] = useState(false);
    const [theme, setTheme] = useTheme();
    const [zoomIndex, setZoomIndex] = useState(1); // Default to Medium
    const [sectionOverrides, setSectionOverrides] = useState<{ [key: string]: Partial<Pick<CourseSection, 'priority' | 'excluded'>> }>({});

    // Load state from localStorage on initial component mount
    useEffect(() => {
        try {
            const savedStateJSON = localStorage.getItem('classSchedulerState');
            if (savedStateJSON) {
                const savedState = JSON.parse(savedStateJSON);
                if (savedState.step) setStep(savedState.step);
                if (savedState.requiredItems) setRequiredItems(savedState.requiredItems);
                if (savedState.selectedSections) setSelectedSections(savedState.selectedSections);
                if (savedState.generatedSchedules) setGeneratedSchedules(savedState.generatedSchedules);
                if (savedState.currentScheduleIndex) setCurrentScheduleIndex(savedState.currentScheduleIndex);
                if (savedState.zoomIndex !== undefined) setZoomIndex(savedState.zoomIndex);
                if (savedState.sectionOverrides) setSectionOverrides(savedState.sectionOverrides);
            }
        } catch (e) {
            console.error("Could not load state from local storage", e);
            localStorage.removeItem('classSchedulerState'); // Clear corrupted state
        }
    }, []); // Empty array ensures this runs only once on mount

    // Save state to localStorage whenever it changes, but not during initial data fetch
    useEffect(() => {
        if (!loading) {
            const stateToSave = {
                step,
                requiredItems,
                selectedSections,
                generatedSchedules,
                currentScheduleIndex,
                zoomIndex,
                sectionOverrides,
            };
            localStorage.setItem('classSchedulerState', JSON.stringify(stateToSave));
        }
    }, [step, requiredItems, selectedSections, generatedSchedules, currentScheduleIndex, zoomIndex, sectionOverrides, loading]);

    // Apply saved section overrides (priority, exclusion) after the main course data has been fetched.
    useEffect(() => {
        if (!loading && Object.keys(sectionOverrides).length > 0) {
            setAllCoursesData(currentCourses =>
                currentCourses.map(course => {
                    const key = `${course['Subject Code']}-${course.Section}`;
                    if (sectionOverrides[key]) {
                        return { ...course, ...sectionOverrides[key] };
                    }
                    return course;
                })
            );
        }
    }, [loading, setAllCoursesData]); // Runs once after API data is loaded

    // Re-hydrate custom classes into the main course list after API data and localStorage have loaded
    useEffect(() => {
        if (!loading && requiredItems.length > 0) {
            const customSectionsFromStorage = requiredItems
                .filter(req => req.isCustom && selectedSections[req.id])
                .map(req => selectedSections[req.id]);

            if (customSectionsFromStorage.length > 0) {
                setAllCoursesData(currentCourses => {
                    const currentCustomIds = new Set(currentCourses.filter(c => c.isCustom).map(c => `custom_${c['Subject Code']}_${c.Section}`));
                    const newCustomSections = customSectionsFromStorage.filter(sec => !currentCustomIds.has(`custom_${sec['Subject Code']}_${sec.Section}`));
                    
                    if (newCustomSections.length > 0) {
                        return [...currentCourses, ...newCustomSections];
                    }
                    return currentCourses;
                });
            }
        }
    }, [loading, requiredItems, selectedSections, setAllCoursesData]);


    const handleZoomIn = () => setZoomIndex(prev => Math.min(prev + 1, zoomConfigs.length - 1));
    const handleZoomOut = () => setZoomIndex(prev => Math.max(prev - 1, 0));
    const currentZoom = zoomConfigs[zoomIndex];

    useEffect(() => {
        const timer = setTimeout(() => {
            setStartSunburstAnimation(true);
        }, 10000); 
        return () => clearTimeout(timer);
    }, []);

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const showAlert = useCallback((title: string, message: string) => {
        setAlertConfig({ isOpen: true, title, message });
    }, []);

    const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
        setConfirmConfig({ isOpen: true, title, message, onConfirm });
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
    
    // This effect synchronizes the selected sections with the required items,
    // preventing stale selections if a course/group is removed.
    useEffect(() => {
        if (loading) return; // Don't run on initial load before everything is ready
        const requiredIds = new Set(requiredItems.map(r => r.id));
        const newSelectedSections: Schedule = {};
        let sectionsChanged = false;

        for (const reqId in selectedSections) {
            if (requiredIds.has(reqId)) {
                newSelectedSections[reqId] = selectedSections[reqId];
            } else {
                sectionsChanged = true;
            }
        }

        if (sectionsChanged || Object.keys(newSelectedSections).length !== Object.keys(selectedSections).length) {
            setSelectedSections(newSelectedSections);
            setGeneratedSchedules([]);
            setCurrentScheduleIndex(0);
        }
    }, [requiredItems, loading]);

    const renderStep = () => {
        switch (step) {
            case 1:
                return <Step1_CourseSelection uniqueCourses={uniqueCourses} requiredItems={requiredItems} setRequiredItems={setRequiredItems} setStep={setStep} openGroupModal={() => setGroupModalOpen(true)} openCustomClassModal={() => handleOpenCustomClassModal()} />;
            case 2:
                const wrappedSetAllCoursesData = (updater: React.SetStateAction<CourseSection[]>) => {
                    setAllCoursesData(prevData => {
                        const newData = typeof updater === 'function' ? updater(prevData) : updater;
                        
                        const newOverrides: typeof sectionOverrides = {};
                        let overridesChanged = false;

                        const oldDataMap = new Map(prevData.map(c => [`${c['Subject Code']}-${c.Section}`, c]));

                        newData.forEach(newCourse => {
                            const key = `${newCourse['Subject Code']}-${newCourse.Section}`;
                            const oldCourse = oldDataMap.get(key);
                            if (oldCourse && (newCourse.priority !== oldCourse.priority || newCourse.excluded !== oldCourse.excluded)) {
                                newOverrides[key] = { priority: newCourse.priority, excluded: newCourse.excluded };
                                overridesChanged = true;
                            }
                        });
                        
                        if(overridesChanged) {
                            setSectionOverrides(prevOverrides => ({...prevOverrides, ...newOverrides}));
                        }

                        return newData;
                    });
                };

                return <Step2_SelectSections allCoursesData={allCoursesData} setAllCoursesData={wrappedSetAllCoursesData} requiredItems={requiredItems} setRequiredItems={setRequiredItems} selectedSections={selectedSections} setSelectedSections={setSelectedSections} setStep={setStep} runAutoScheduler={runAutoScheduler} generatedSchedules={generatedSchedules} currentScheduleIndex={currentScheduleIndex} setCurrentScheduleIndex={setCurrentScheduleIndex} openCustomClassModal={handleOpenCustomClassModal} showConfirm={showConfirm} />;
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
            <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200">
                <AlertModal isOpen={alertConfig.isOpen} onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })} title={alertConfig.title} message={alertConfig.message} />
                <ConfirmModal 
                    isOpen={confirmConfig.isOpen} 
                    onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })} 
                    title={confirmConfig.title} 
                    message={confirmConfig.message} 
                    onConfirm={() => {
                        confirmConfig.onConfirm();
                        setConfirmConfig({ ...confirmConfig, isOpen: false });
                    }} 
                />
                <AboutModal isOpen={isAboutModalOpen} onClose={() => setAboutModalOpen(false)} />
                <GroupModal isOpen={isGroupModalOpen} onClose={() => setGroupModalOpen(false)} uniqueCourses={uniqueCourses} onSave={handleSaveGroup} />
                <CustomClassModal isOpen={isCustomClassModalOpen} onClose={() => setCustomClassModalOpen(false)} onSave={handleSaveCustomClass} initialData={editingClass} />
                
                <aside className={`${isCalendarVisible ? 'hidden' : 'flex'} md:flex w-full md:w-1/3 max-w-lg bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col`}>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <div className="flex justify-between items-center gap-4">
                            <h1 className="text-2xl font-bold">Class Planner</h1>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={toggleTheme}
                                    title="Toggle night mode"
                                    className="text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors p-2 rounded-full"
                                >
                                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                                </button>
                                <button 
                                    onClick={() => setAboutModalOpen(true)} 
                                    title="About this project" 
                                    className={`relative text-yellow-600 hover:text-yellow-700 hover:scale-110 transition-transform p-2 rounded-full ${startSunburstAnimation ? 'animate-sunburst' : ''}`}
                                >
                                    <Coffee size={20} />
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{subtitleText[step]}</p>
                    </div>
                    
                    {allCoursesData.length > 0 && renderStep()}

                    <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-700 md:hidden">
                        <button
                            onClick={() => setCalendarVisible(true)}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-semibold flex items-center justify-center gap-2"
                        >
                            <Eye size={16} /> View Schedule Preview
                        </button>
                    </div>
                </aside>

                <main className={`${isCalendarVisible ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-gray-100 dark:bg-gray-900`}>
                    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 flex-wrap justify-between items-center gap-3 flex">
                        <h2 className="text-xl font-bold">Weekly Schedule</h2>
                        <div className="flex items-center gap-2 text-sm">
                            <button title="Zoom Out" onClick={handleZoomOut} disabled={zoomIndex === 0} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"><ZoomOut size={16}/></button>
                            <span className="w-20 text-center font-semibold">{currentZoom.label}</span>
                            <button title="Zoom In" onClick={handleZoomIn} disabled={zoomIndex === zoomConfigs.length - 1} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"><ZoomIn size={16}/></button>
                        </div>
                        <button
                            onClick={() => setCalendarVisible(false)}
                            className="md:hidden bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-1.5 px-3 rounded-md font-semibold flex items-center gap-2 text-sm"
                        >
                            <ArrowLeft size={16} /> Back
                        </button>
                    </header>
                    <div className="flex-1 relative overflow-y-auto p-4">
                        <FullCalendar
                            plugins={[timeGridPlugin, interactionPlugin]}
                            initialView="timeGridWeek"
                            headerToolbar={false}
                            allDaySlot={false}
                            hiddenDays={[0]}
                            slotMinTime="00:00:00"
                            slotMaxTime="23:59:00"
                            slotDuration={currentZoom.slotDuration}
                            slotLabelInterval={'01:00:00'}
                            height="100%"
                            events={calendarEvents}
                            eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: 'short' }}
                            firstDay={1}
                        />
                    </div>
                </main>
            </div>
        </AlertContext.Provider>
    );
}
