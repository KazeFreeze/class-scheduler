import { AlertTriangle } from 'lucide-react';
import type { CourseSection } from '../types';

interface Props {
    section: CourseSection;
    isSelected: boolean;
    isConflicting: boolean;
    conflictText: string;
    onToggle: (isSelected: boolean) => void;
}

export const SectionItem = ({ section, isSelected, isConflicting, conflictText, onToggle }: Props) => {
    const baseClasses = "bg-white p-3 rounded-lg border transition-all duration-200 cursor-pointer";
    const selectedClasses = "border-blue-500 bg-blue-50 ring-2 ring-blue-500";
    const conflictClasses = "bg-red-50 border-red-500 opacity-70 cursor-not-allowed";
    const hoverClasses = "hover:shadow-md hover:-translate-y-0.5";

    return (
        <div className={`${baseClasses} ${isSelected ? selectedClasses : ''} ${isConflicting ? conflictClasses : hoverClasses}`} onClick={() => !isConflicting && onToggle(!isSelected)}>
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-bold">{section.Section} | {section.Time}</p>
                    <p className="text-xs text-gray-600">{section.Instructor} | Room: {section.Room}</p>
                </div>
                <div className="flex items-center gap-3">
                    {isConflicting && (
                        <div title={conflictText}>
                            <AlertTriangle className="text-red-500" size={18} />
                        </div>
                    )}
                    <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" checked={isSelected} readOnly disabled={isConflicting} />
                </div>
            </div>
        </div>
    );
};
