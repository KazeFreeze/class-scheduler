import React, { useState, useCallback } from 'react';
import { ArrowRight, ArrowLeft, Wand2, ChevronUp, ChevronDown, Settings } from 'lucide-react';
import { SectionItem } from './SectionItem';
import { checkForConflict } from '../utils/schedulerUtils';
import type { CourseSection, Requirement, Schedule, AppStep } from '../types';

interface Props {
    allCoursesData: CourseSection[];
    setAllCoursesData: React.Dispatch<React.SetStateAction<CourseSection[]>>;
    requiredItems: Requirement[];
    setRequiredItems: React.Dispatch<React.SetStateAction<Requirement[]>>;
    selectedSections: Schedule;
    setSelectedSections: React.Dispatch<React.SetStateAction<Schedule>>;
    setStep: (step: AppStep) => void;
    runAutoScheduler: () => void;
    generatedSchedules: Schedule[];
    currentScheduleIndex: number;
    setCurrentScheduleIndex: React.Dispatch<React.SetStateAction<number>>;
    openCustomClassModal: (classToEdit: CourseSection) => void;
}

export const Step2_SelectSections = ({ allCoursesData, setAllCoursesData, requiredItems, setRequiredItems, selectedSections, setSelectedSections, setStep, runAutoScheduler, generatedSchedules, currentScheduleIndex, setCurrentScheduleIndex, openCustomClassModal }: Props) => {
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(requiredItems.map(r => r.id)));

    const getSectionsForId = useCallback((id: string): CourseSection[] => {
        const item = requiredItems.find(r => r.id === id);
        if (!item) return [];
        // Handle custom classes, which are stored directly in allCoursesData
        if (item.isCustom) {
            return allCoursesData.filter(c => c.isCustom && `custom_${c["Subject Code"]}_${c.Section}` === id);
        }
        const courseCodes = item.type === 'group' ? item.courses : [item.id];
        return allCoursesData.filter(c => !c.isCustom && courseCodes?.includes(c["Subject Code"]));
    }, [requiredItems, allCoursesData]);

    const handleToggleSection = (requirementId: string, section: CourseSection, isSelected: boolean) => {
        setSelectedSections(prev => {
            const newSelections = { ...prev };
            if (isSelected) {
                newSelections[requirementId] = { ...section, isLocked: true };
            } else {
                // For custom classes, deselecting here shouldn't remove it from the list, just the schedule
                const current = newSelections[requirementId];
                if (current && current.isLocked) {
                     delete newSelections[requirementId];
                }
            }
            return newSelections;
        });
    };

    const handleUpdateSection = (sectionToUpdate: CourseSection, updates: Partial<CourseSection>) => {
        setAllCoursesData(prevData =>
            prevData.map(sec => 
                (sec["Subject Code"] === sectionToUpdate["Subject Code"] && sec.Section === sectionToUpdate.Section)
                ? { ...sec, ...updates }
                : sec
            )
        );
    };

    const handleUpdateRequirement = (itemId: string, updates: Partial<Requirement>) => {
        setRequiredItems(prev => 
            prev.map(item => item.id === itemId ? { ...item, ...updates } : item)
        );
    };
    
    const toggleExpand = (id: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    return (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {requiredItems.map(item => {
                    const sections = getSectionsForId(item.id);
                    const isExpanded = expandedItems.has(item.id);
                    return (
                        <div key={item.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border dark:border-gray-700">
                            <div className="p-3 border-b dark:border-gray-700">
                                <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleExpand(item.id)}>
                                    <h3 className="font-bold text-lg flex-grow">{item.name}</h3>
                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                                {!item.isCustom && (
                                    <div className="mt-3 flex items-center gap-2 text-sm">
                                        <Settings size={16} className="text-gray-600 dark:text-gray-400" />
                                        <label htmlFor={`req-priority-${item.id}`} className="font-medium text-gray-700 dark:text-gray-300">Course Priority:</label>
                                        <input
                                            type="number"
                                            id={`req-priority-${item.id}`}
                                            title="Set overall priority for this course requirement (1 is highest)"
                                            value={item.priority}
                                            onChange={e => handleUpdateRequirement(item.id, { priority: parseInt(e.target.value) || 100 })}
                                            className="w-20 p-1 border rounded-md text-center bg-white dark:bg-gray-700 dark:border-gray-600"
                                        />
                                    </div>
                                )}
                            </div>
                            {isExpanded && (
                                <div className="space-y-2 p-3">
                                    {sections.length > 0 ? sections.map(section => {
                                        const isSelected = selectedSections[item.id]?.Section === section.Section && selectedSections[item.id]?.["Subject Code"] === section["Subject Code"];
                                        const conflictingSection = !isSelected ? checkForConflict(section, selectedSections, item.id) : null;
                                        const conflictText = conflictingSection ? `Conflicts with ${conflictingSection["Subject Code"]} (${conflictingSection.Section})` : '';
                                        return (
                                            <SectionItem
                                                key={`${section["Subject Code"]}-${section.Section}`}
                                                section={section}
                                                isSelected={isSelected}
                                                isConflicting={!!conflictingSection}
                                                conflictText={conflictText}
                                                onToggleSelect={(checked) => handleToggleSection(item.id, section, checked)}
                                                onUpdate={(updates) => handleUpdateSection(section, updates)}
                                                onEdit={() => openCustomClassModal(section)}
                                            />
                                        );
                                    }) : <p className="text-sm text-gray-500 dark:text-gray-400 text-center p-4">No sections available for this course.</p>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col gap-2">
                <button onClick={runAutoScheduler} className="w-full bg-green-500 text-white py-2.5 px-4 rounded-md hover:bg-green-600 dark:hover:bg-green-500 font-semibold flex items-center justify-center gap-2 text-sm disabled:bg-gray-400 disabled:dark:bg-gray-600">
                    <Wand2 size={16} /> Auto-Schedule
                </button>
                {generatedSchedules.length > 0 && (
                     <div className="mt-2 flex justify-between items-center bg-gray-100 dark:bg-gray-700/50 p-1 rounded-md">
                         <button onClick={() => setCurrentScheduleIndex(prev => (prev - 1 + generatedSchedules.length) % generatedSchedules.length)} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><ArrowLeft size={20}/></button>
                         <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Schedule {currentScheduleIndex + 1} of {generatedSchedules.length}</span>
                         <button onClick={() => setCurrentScheduleIndex(prev => (prev + 1) % generatedSchedules.length)} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><ArrowRight size={20}/></button>
                    </div>
                )}
                <button onClick={() => setStep(3)} className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 font-semibold flex items-center justify-center gap-2">
                    Next: Finalize & Export <ArrowRight size={16} />
                </button>
                <button onClick={() => setStep(1)} className="w-full text-center text-blue-600 dark:text-blue-400 hover:underline font-medium py-2 mt-1 flex items-center justify-center gap-2">
                    <ArrowLeft size={16} /> Back to Course Selection
                </button>
            </div>
        </div>
    );
};