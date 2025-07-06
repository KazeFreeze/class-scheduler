import React from 'react';
import { PlusCircle, X } from 'lucide-react';
import type { UniqueCourse } from '../types';

interface Props {
    course: UniqueCourse;
    isSelected: boolean;
    isGroup: boolean;
    onSelect: (code: string) => void;
    onRemove: (code: string) => void;
}

export const CourseItem = ({ course, isSelected, isGroup, onSelect, onRemove }: Props) => {
    const baseClasses = "flex justify-between items-center p-3 border rounded-lg cursor-pointer transition-all duration-200";
    const selectedClasses = isGroup ? "bg-green-50 border-green-500 text-green-800 font-semibold" : "bg-blue-50 border-blue-500 text-blue-800 font-semibold";
    const hoverClasses = "hover:bg-gray-100 hover:border-gray-300";

    return (
        <div className={`${baseClasses} ${isSelected ? selectedClasses : hoverClasses}`} onClick={() => !isSelected && onSelect(course.code)}>
            <div className="flex-grow">
                <p className="font-semibold">{course.code}</p>
                <p className="text-xs">{course.title}</p>
            </div>
            {isSelected ? (
                <button onClick={(e) => { e.stopPropagation(); onRemove(course.code); }} className="text-red-500 hover:text-red-700 p-2 rounded-full">
                    <X size={18} />
                </button>
            ) : (
                <PlusCircle size={20} className="text-blue-500" />
            )}
        </div>
    );
};
