import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
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

    useEffect(() => {
        if (isOpen) {
            setGroupName('');
            setSearchTerm('');
            setSelectedCourses(new Map());
        }
    }, [isOpen]);

    if (!isOpen) return null;

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
        if (!groupName.trim() || selectedCourses.size === 0) {
            alert("Please provide a group name and add at least one course.");
            return;
        }
        onSave(groupName, [...selectedCourses.keys()]);
        onClose();
    };

    const searchResults = useMemo(() => {
        const lowerCaseSearch = searchTerm.toLowerCase();
        const available = [...uniqueCourses.values()].filter(c => !selectedCourses.has(c.code));
        if (!searchTerm) return available.slice(0, 10);
        return available.filter(c => c.code.toLowerCase().includes(lowerCaseSearch) || c.title.toLowerCase().includes(lowerCaseSearch));
    }, [searchTerm, uniqueCourses, selectedCourses]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 flex flex-col h-[90vh] max-h-[700px]">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-xl font-semibold">Create a Custom Group</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={24} /></button>
                </div>
                <input type="text" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Enter group name (e.g., 'Humanities Elective')" className="w-full p-2 border rounded-md mb-4 flex-shrink-0" />
                <div className="flex gap-4 flex-grow min-h-0">
                    <div className="w-1/2 flex flex-col">
                        <h4 className="font-semibold mb-2 flex-shrink-0">Available Courses</h4>
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search courses to add..." className="w-full p-2 border rounded-md mb-2 flex-shrink-0" />
                        <div className="flex-grow overflow-y-auto border rounded-md p-2 space-y-1">
                            {searchResults.map(course => (
                                <div key={course.code} onClick={() => handleSelectCourse(course)} className="p-2 hover:bg-gray-100 cursor-pointer rounded text-sm">
                                    {course.code} - {course.title}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="w-1/2 flex flex-col">
                        <h4 className="font-semibold mb-2 flex-shrink-0">Courses in Group ({selectedCourses.size})</h4>
                        <div className="flex-grow overflow-y-auto border rounded-md p-2 space-y-2">
                            {[...selectedCourses.values()].map(course => (
                                <div key={course.code} className="p-2 bg-blue-100 rounded flex justify-between items-center text-sm">
                                    <span>{course.code}</span>
                                    <button onClick={() => handleRemoveCourse(course.code)} className="text-red-500 hover:text-red-700"><X size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-2 flex-shrink-0">
                    <button onClick={onClose} className="bg-gray-200 text-gray-700 py-2 px-4 rounded-md">Cancel</button>
                    <button onClick={handleSave} className="bg-blue-600 text-white py-2 px-4 rounded-md">Save Group</button>
                </div>
            </div>
        </div>
    );
};
