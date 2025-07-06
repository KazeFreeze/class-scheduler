import React, { useState, useCallback } from 'react';
import { ArrowRight, ArrowLeft, Wand2, ChevronUp, ChevronDown } from 'lucide-react'; // Changed Magic to Wand2
import { SectionItem } from './SectionItem';
import { checkForConflict } from '../utils/schedulerUtils';
import type { CourseSection, Requirement, Schedule, AppStep } from '../types';

interface Props {
    allCoursesData: CourseSection[];
    requiredItems: Requirement[];
    selectedSections: Schedule;
    setSelectedSections: React.Dispatch<React.SetStateAction<Schedule>>;
    setStep: (step: AppStep) => void;
    runAutoScheduler: () => void;
    generatedSchedules: Schedule[];
    currentScheduleIndex: number;
    setCurrentScheduleIndex: React.Dispatch<React.SetStateAction<number>>;
}

export const Step2_SelectSections = ({ allCoursesData, requiredItems, selectedSections, setSelectedSections, setStep, runAutoScheduler, generatedSchedules, currentScheduleIndex, setCurrentScheduleIndex }: Props) => {
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(requiredItems.map(r => r.id)));

    const getSectionsForId = useCallback((id: string): CourseSection[] => {
        const item = requiredItems.find(r => r.id === id);
        if (!item) return [];
        const courseCodes = item.type === 'group' ? item.courses : [item.id];
        return allCoursesData.filter(c => courseCodes?.includes(c["Subject Code"]));
    }, [requiredItems, allCoursesData]);
    
    const handleToggleSection = (requirementId: string, section: CourseSection, isSelected: boolean) => {
        setSelectedSections(prev => {
            const newSelections = { ...prev };
            if (isSelected) {
                newSelections[requirementId] = { ...section, isLocked: true };
            } else {
                delete newSelections[requirementId];
            }
            return newSelections;
        });
    };
    
    const toggleExpand = (id: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
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
                        <div key={item.id} className="bg-gray-50 rounded-lg border">
                            <div className="p-3 cursor-pointer flex justify-between items-center" onClick={() => toggleExpand(item.id)}>
                                <h3 className="font-bold text-lg">{item.name}</h3>
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
                                                onToggle={(checked) => handleToggleSection(item.id, section, checked)}
                                            />
                                        );
                                    }) : <p className="text-sm text-gray-500 text-center">No sections available.</p>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex-shrink-0 flex flex-col gap-2">
                <button onClick={runAutoScheduler} className="w-full bg-green-500 text-white py-2.5 px-4 rounded-md hover:bg-green-600 font-semibold flex items-center justify-center gap-2 text-sm disabled:bg-gray-400" disabled={requiredItems.length === 0}>
                    <Wand2 size={16} /> Auto-Schedule
                </button>
                {generatedSchedules.length > 0 && (
                     <div className="mt-2 flex justify-between items-center">
                         <button onClick={() => setCurrentScheduleIndex(prev => (prev - 1 + generatedSchedules.length) % generatedSchedules.length)} className="text-gray-500 hover:text-gray-800 p-2 rounded-full"><ArrowLeft size={20}/></button>
                         <span className="text-sm font-medium text-gray-700">{currentScheduleIndex + 1} of {generatedSchedules.length}</span>
                         <button onClick={() => setCurrentScheduleIndex(prev => (prev + 1) % generatedSchedules.length)} className="text-gray-500 hover:text-gray-800 p-2 rounded-full"><ArrowRight size={20}/></button>
                    </div>
                )}
                <button onClick={() => setStep(3)} className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 font-semibold flex items-center justify-center gap-2">
                    Next: Finalize & Export <ArrowRight size={16} />
                </button>
                <button onClick={() => setStep(1)} className="w-full text-center text-blue-600 hover:underline font-medium py-2 mt-1 flex items-center justify-center gap-2">
                    <ArrowLeft size={16} /> Back to Course Selection
                </button>
            </div>
        </div>
    );
};
