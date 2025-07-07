import { AlertTriangle, ShieldOff, Star, Info, XCircle, Edit } from 'lucide-react';
import type { CourseSection } from '../types';

interface Props {
    section: CourseSection;
    isSelected: boolean;
    isConflicting: boolean;
    conflictText: string;
    onToggleSelect: (isSelected: boolean) => void;
    onUpdate: (updates: Partial<CourseSection>) => void;
    onEdit: () => void;
    showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const SectionItem = ({ section, isSelected, isConflicting, conflictText, onToggleSelect, onUpdate, onEdit, showConfirm }: Props) => {
    const hasNoSlots = section.Slots <= 0;
    // A section is only truly disabled if it's conflicting. Zero slots can be overridden.
    const isDisabled = !section.isCustom && isConflicting;

    const baseClasses = "bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700 transition-all duration-200 cursor-pointer";
    
    let selectedClasses = "border-blue-500 bg-blue-50 dark:bg-blue-900/50 ring-2 ring-blue-500";
    if (section.isCustom && isSelected) {
        selectedClasses = "border-purple-500 bg-purple-50 dark:bg-purple-900/50 ring-2 ring-purple-500";
    }
    // Visually indicate a disabled state for conflicting sections.
    const disabledClasses = "opacity-60 cursor-not-allowed";
    const hoverClasses = "hover:shadow-md hover:-translate-y-0.5 hover:border-gray-400 dark:hover:border-gray-500";

    const handleClick = () => {
        if (isDisabled) return; // Prevent action on conflicting sections

        // If trying to select a class with no slots that isn't already selected, show confirmation.
        if (hasNoSlots && !isSelected && !section.isCustom) {
            showConfirm(
                "Override Zero Slots?",
                "This class section has no available slots. Are you sure you want to add it to your schedule? This assumes you have already enlisted and secured a slot.",
                () => {
                    onToggleSelect(true); // On confirm, proceed to select the section
                }
            );
        } else {
            // Otherwise, toggle selection as normal.
            onToggleSelect(!isSelected);
        }
    };

    const hasMeaningfulRemarks = section.Remarks && section.Remarks.trim() !== '-';
    
    return (
        <div className={`${baseClasses} ${isSelected ? selectedClasses : ''} ${isDisabled ? disabledClasses : hoverClasses}`} onClick={handleClick}>
            <div className="flex justify-between items-start">
                <div className="flex-grow">
                    <p className="font-bold">{section.Section} | {section.Time}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{section.Instructor} | Room: {section.Room}</p>
                    <p className={`text-sm font-semibold mt-1 ${hasNoSlots ? 'text-red-600' : 'text-green-600'}`}>
                        Slots Available: {section.Slots}
                    </p>
                </div>
                <div className="flex items-center gap-3 ml-2">
                    {isConflicting && !section.isCustom && (
                        <div title={conflictText}>
                            <AlertTriangle className="text-yellow-500" size={18} />
                        </div>
                    )}
                     {hasNoSlots && !section.isCustom && (
                        <div title="No slots available. Click to override.">
                            <XCircle className="text-red-600" size={18} />
                        </div>
                    )}
                    <input 
                        type="checkbox" 
                        className={`h-5 w-5 rounded border-gray-300 dark:bg-gray-900 dark:border-gray-600 focus:ring-blue-500 disabled:opacity-50 ${section.isCustom ? 'text-purple-600 focus:ring-purple-500' : 'text-blue-600'}`}
                        checked={isSelected} 
                        readOnly 
                        disabled={isDisabled || (hasNoSlots && !isSelected && !section.isCustom)} 
                    />
                </div>
            </div>

            {hasMeaningfulRemarks && (
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-300 text-xs flex items-start gap-2">
                    <Info size={16} className="flex-shrink-0 mt-0.5" />
                    <p>{section.Remarks}</p>
                </div>
            )}

            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between text-sm" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-4">
                    {!section.isCustom && (
                        <>
                            <div className="flex items-center gap-2" title="Set priority for this specific section">
                                <Star size={16} className="text-gray-500 dark:text-gray-400"/>
                                <label htmlFor={`sec-priority-${section["Subject Code"]}-${section.Section}`} className="font-medium text-gray-600 dark:text-gray-300">Priority:</label>
                                <input
                                    type="number"
                                    id={`sec-priority-${section["Subject Code"]}-${section.Section}`}
                                    value={section.priority}
                                    onChange={e => onUpdate({ priority: parseInt(e.target.value) || 100 })}
                                    className="w-16 p-1 border rounded-md text-center bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    disabled={isDisabled && !isSelected}
                                />
                            </div>
                             <div className="flex items-center gap-2" title="Exclude this specific section from auto-scheduling">
                                <ShieldOff size={16} className="text-gray-500 dark:text-gray-400"/>
                                <label htmlFor={`sec-exclude-${section["Subject Code"]}-${section.Section}`} className="font-medium text-gray-600 dark:text-gray-300">Exclude:</label>
                                <input
                                    type="checkbox"
                                    id={`sec-exclude-${section["Subject Code"]}-${section.Section}`}
                                    checked={section.excluded}
                                    onChange={e => onUpdate({ excluded: e.target.checked })}
                                    className="h-5 w-5 rounded border-gray-300 dark:bg-gray-900 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                                    disabled={isDisabled && !isSelected}
                                />
                            </div>
                        </>
                    )}
                </div>
                {section.isCustom && (
                    <button onClick={onEdit} className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium py-1 px-2 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50">
                        <Edit size={14} />
                        <span>Edit Details</span>
                    </button>
                )}
            </div>
        </div>
    );
};
