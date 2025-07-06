import { AlertTriangle, ShieldOff, Star, Info, XCircle } from 'lucide-react';
import type { CourseSection } from '../types';

interface Props {
    section: CourseSection;
    isSelected: boolean;
    isConflicting: boolean;
    conflictText: string;
    onToggleSelect: (isSelected: boolean) => void;
    onUpdate: (updates: Partial<CourseSection>) => void;
}

export const SectionItem = ({ section, isSelected, isConflicting, conflictText, onToggleSelect, onUpdate }: Props) => {
    const hasNoSlots = section.Slots <= 0;
    const isDisabled = hasNoSlots || isConflicting;

    // Base classes for the component
    const baseClasses = "bg-white p-3 rounded-lg border transition-all duration-200";
    // Classes for a selected section
    const selectedClasses = "border-blue-500 bg-blue-50 ring-2 ring-blue-500";
    // Classes for a disabled (no slots or conflicting) section
    const disabledClasses = "bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed";
    // Hover classes for an enabled section
    const hoverClasses = "hover:shadow-md hover:-translate-y-0.5 hover:border-gray-400";

    const handleClick = () => {
        if (!isDisabled) {
            onToggleSelect(!isSelected);
        }
    };

    return (
        <div className={`${baseClasses} ${isSelected ? selectedClasses : ''} ${isDisabled ? disabledClasses : hoverClasses}`} onClick={handleClick}>
            <div className="flex justify-between items-start">
                <div className="flex-grow">
                    <p className="font-bold">{section.Section} | {section.Time}</p>
                    <p className="text-xs text-gray-600">{section.Instructor} | Room: {section.Room}</p>
                    <p className={`text-sm font-semibold mt-1 ${hasNoSlots ? 'text-red-600' : 'text-green-600'}`}>
                        Slots Available: {section.Slots}
                    </p>
                </div>
                <div className="flex items-center gap-3 ml-2">
                    {isConflicting && (
                        <div title={conflictText}>
                            <AlertTriangle className="text-yellow-500" size={18} />
                        </div>
                    )}
                     {hasNoSlots && (
                        <div title="No slots available for this section.">
                            <XCircle className="text-red-600" size={18} />
                        </div>
                    )}
                    <input 
                        type="checkbox" 
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50" 
                        checked={isSelected} 
                        readOnly 
                        disabled={isDisabled} 
                    />
                </div>
            </div>

            {/* Remarks section */}
            {section.Remarks && (
                <div className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 text-xs flex items-start gap-2">
                    <Info size={16} className="flex-shrink-0 mt-0.5" />
                    <p>{section.Remarks}</p>
                </div>
            )}

            {/* Section-level controls for auto-scheduler */}
            <div className="mt-3 pt-2 border-t border-gray-200 flex items-center gap-4 text-sm" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2" title="Set priority for this specific section">
                    <Star size={16} className="text-gray-500"/>
                    <label htmlFor={`sec-priority-${section["Subject Code"]}-${section.Section}`} className="font-medium text-gray-600">Priority:</label>
                    <input
                        type="number"
                        id={`sec-priority-${section["Subject Code"]}-${section.Section}`}
                        value={section.priority}
                        onChange={e => onUpdate({ priority: parseInt(e.target.value) || 100 })}
                        className="w-16 p-1 border rounded-md text-center"
                        disabled={isDisabled && !isSelected}
                    />
                </div>
                 <div className="flex items-center gap-2" title="Exclude this specific section from auto-scheduling">
                    <ShieldOff size={16} className="text-gray-500"/>
                    <label htmlFor={`sec-exclude-${section["Subject Code"]}-${section.Section}`} className="font-medium text-gray-600">Exclude:</label>
                    <input
                        type="checkbox"
                        id={`sec-exclude-${section["Subject Code"]}-${section.Section}`}
                        checked={section.excluded}
                        onChange={e => onUpdate({ excluded: e.target.checked })}
                        className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={isDisabled && !isSelected}
                    />
                </div>
            </div>
        </div>
    );
};
