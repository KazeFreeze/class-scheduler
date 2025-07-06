import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import type { UniqueCourse } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    uniqueCourses: Map<string, UniqueCourse>;
    onSave: (groupName: string, courseCodes: string[]) => void;
}

export const GroupModal = ({ isOpen, onClose, uniqueCourses, onSave }: Props) => {
    const [groupName, setGroupName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourses, setSelectedCourses] = useState<Map<string, UniqueCourse>>(new Map());
    const showAlert = useAlert();

    useEffect(() => {
        if (isOpen) {
            setGroupName('');
            setSearchTerm('');
            setSelectedCourses(new Map());
        }
    }, [isOpen]);

    const handleSelectCourse = (course: UniqueCourse) => {
        setSelectedCourses(prev => new Map(prev).set(course.code, course));
        setSearchTerm('');
    };

    const handleRemoveCourse = (courseCode: string) => {
        setSelectedCourses(prev => {
            const newMap = new Map(prev);
            newMap.delete(courseCode);
            return newMap;
        });
    };

    const handleSave = () => {
        if (!groupName.trim()) {
            showAlert("Input Required", "Please provide a name for your group.");
            return;
        }
        if (selectedCourses.size === 0) {
            showAlert("Input Required", "Please add at least one course to the group.");
            return;
        }
        onSave(groupName, [...selectedCourses.keys()]);
        onClose();
    };

    const searchResults = useMemo(() => {
        const lowerCaseSearch = searchTerm.toLowerCase();
        const available = Array.from(uniqueCourses.values()).filter(c => !selectedCourses.has(c.code));
        if (!searchTerm) return available.slice(0, 10);
        return available.filter(c => c.code.toLowerCase().includes(lowerCaseSearch) || c.title.toLowerCase().includes(lowerCaseSearch));
    }, [searchTerm, uniqueCourses, selectedCourses]);

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}>
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6 flex flex-col h-[90vh] max-h-[700px] transform transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-xl font-semibold dark:text-gray-200">Create a Custom Group</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"><X size={24} /></button>
                </div>
                <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Enter group name (e.g., 'Humanities Elective')" className="w-full p-2 border rounded-md mb-4 flex-shrink-0 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
                <div className="flex gap-4 flex-grow min-h-0">
                    <div className="w-1/2 flex flex-col">
                        <h4 className="font-semibold mb-2 flex-shrink-0 dark:text-gray-200">Available Courses</h4>
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search courses to add..." className="w-full p-2 border rounded-md mb-2 flex-shrink-0 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
                        <div className="flex-grow overflow-y-auto border dark:border-gray-600 rounded-md p-2 space-y-1">
                            {searchResults.map(course => (
                                <div key={course.code} onClick={() => handleSelectCourse(course)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer rounded text-sm dark:text-gray-300">
                                    {course.code} - {course.title}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="w-1/2 flex flex-col">
                        <h4 className="font-semibold mb-2 flex-shrink-0 dark:text-gray-200">Courses in Group ({selectedCourses.size})</h4>
                        <div className="flex-grow overflow-y-auto border dark:border-gray-600 rounded-md p-2 space-y-2">
                            {[...selectedCourses.values()].map(course => (
                                <div key={course.code} className="p-2 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 rounded flex justify-between items-center text-sm">
                                    <span>{course.code}</span>
                                    <button onClick={() => handleRemoveCourse(course.code)} className="text-red-500 hover:text-red-700"><X size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-2 flex-shrink-0">
                    <button onClick={onClose} className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                    <button onClick={handleSave} className="bg-blue-600 text-white py-2 px-4 rounded-md">Save Group</button>
                </div>
            </div>
        </div>
    );
};
