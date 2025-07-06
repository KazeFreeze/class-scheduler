import { PlusCircle, X, Users, Edit } from 'lucide-react';
import type { UniqueCourse } from '../types';

interface Props {
    course: UniqueCourse;
    isSelected: boolean;
    isGroup: boolean;
    isCustom?: boolean;
    onSelect: (code: string) => void;
    onRemove: (code: string) => void;
}

export const CourseItem = ({ course, isSelected, isGroup, isCustom, onSelect, onRemove }: Props) => {
    let baseClasses = "flex justify-between items-center p-3 border dark:border-gray-700 rounded-lg transition-all duration-200";
    
    let selectedClasses = "bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-900/50 dark:border-blue-500 dark:text-blue-300 font-semibold";
    if (isGroup) {
        selectedClasses = "bg-green-50 border-green-500 text-green-800 dark:bg-green-900/50 dark:border-green-500 dark:text-green-300 font-semibold";
    }
    if (isCustom) {
        selectedClasses = "bg-purple-50 border-purple-500 text-purple-800 dark:bg-purple-900/50 dark:border-purple-500 dark:text-purple-300 font-semibold";
    }
    const hoverClasses = "hover:bg-gray-100 hover:border-gray-300 dark:hover:bg-gray-700 dark:hover:border-gray-500";

    return (
        <div className={`${baseClasses} ${isSelected ? selectedClasses : hoverClasses}`} onClick={() => !isSelected && onSelect(course.code)}>
            <div className="flex-grow">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{course.code}</p>
                    {isGroup && (
                        <span className="flex items-center gap-1 text-xs bg-green-200 text-green-900 dark:bg-green-500/30 dark:text-green-200 font-medium px-2 py-0.5 rounded-full">
                            <Users size={12} />
                            Group
                        </span>
                    )}
                    {isCustom && (
                         <span className="flex items-center gap-1 text-xs bg-purple-200 text-purple-900 dark:bg-purple-500/30 dark:text-purple-200 font-medium px-2 py-0.5 rounded-full">
                            <Edit size={12} />
                            Custom
                        </span>
                    )}
                </div>
                <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">{course.title}</p>
            </div>
            {isSelected ? (
                <button onClick={(e) => { e.stopPropagation(); onRemove(course.code); }} className="text-red-500 hover:text-red-700 p-2 rounded-full -mr-2">
                    <X size={18} />
                </button>
            ) : (
                <PlusCircle size={20} className="text-blue-500" />
            )}
        </div>
    );
};