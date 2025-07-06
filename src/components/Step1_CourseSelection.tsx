import { useState, useMemo } from 'react';
import { PlusCircle, ArrowRight, Search } from 'lucide-react';
import { CourseItem } from './CourseItem';
import type { UniqueCourse, Requirement, AppStep } from '../types';

interface Props {
    uniqueCourses: Map<string, UniqueCourse>;
    requiredItems: Requirement[];
    setRequiredItems: React.Dispatch<React.SetStateAction<Requirement[]>>;
    setStep: (step: AppStep) => void;
    openGroupModal: () => void;
}

export const Step1_CourseSelection = ({ uniqueCourses, requiredItems, setRequiredItems, setStep, openGroupModal }: Props) => {
    const [searchTerm, setSearchTerm] = useState("");

    // Adds a new course requirement with default priority and exclusion.
    // These controls are now hidden from the user in this step.
    const handleSelectCourse = (courseCode: string) => {
        const newReq: Requirement = { 
            id: courseCode, 
            type: 'course', 
            name: courseCode,
            priority: 100, // Default priority, to be edited in Step 2
            excluded: false, 
        };
        setRequiredItems(prev => [...prev, newReq]);
    };

    // Removes a requirement from the list
    const handleRemoveItem = (itemId: string) => {
        setRequiredItems(prev => prev.filter(item => item.id !== itemId));
    };

    const filteredAndSortedCourses = useMemo(() => {
        const lowerCaseSearch = searchTerm.toLowerCase();
        const available = [...uniqueCourses.values()].filter(course => !requiredItems.some(req => req.id === course.code));

        if (!searchTerm) {
            return available.slice(0, 10); // Show top 10 if no search term
        }

        return available.filter(course =>
            course.code.toLowerCase().includes(lowerCaseSearch) ||
            course.title.toLowerCase().includes(lowerCaseSearch)
        );
    }, [searchTerm, uniqueCourses, requiredItems]);

    return (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
            <div className="relative mb-3 flex-shrink-0">
                <input
                    type="text"
                    placeholder="Search available courses..."
                    className="w-full p-2 pl-8 border rounded-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            </div>
            <div className="flex-grow space-y-2 pr-2 overflow-y-auto">
                {/* Render selected courses (without extra controls) */}
                {requiredItems.map(item => {
                    const course = item.type === 'course' ? uniqueCourses.get(item.id) : { code: item.name, title: `Group: ${item.courses?.join(', ')}` };
                    if (!course) return null;
                    return (
                        <CourseItem 
                            key={item.id} 
                            course={course} 
                            isSelected={true} 
                            isGroup={item.type === 'group'} 
                            onSelect={() => {}} 
                            onRemove={() => handleRemoveItem(item.id)} 
                        />
                    );
                })}
                
                <hr className="my-2 border-dashed" />

                {/* Render available courses */}
                {filteredAndSortedCourses.map(course => (
                    <CourseItem 
                        key={course.code} 
                        course={course} 
                        isSelected={false} 
                        isGroup={false} 
                        onSelect={handleSelectCourse} 
                        onRemove={() => {}} 
                    />
                ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex-shrink-0 flex flex-col gap-2">
                <button onClick={openGroupModal} className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 text-sm font-medium flex items-center justify-center gap-2">
                    <PlusCircle size={16} />Create Custom Group
                </button>
                <button onClick={() => setStep(2)} disabled={requiredItems.length === 0} className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    Next: Configure Schedule <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};
