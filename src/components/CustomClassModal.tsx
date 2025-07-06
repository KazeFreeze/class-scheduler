import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAlert } from '../contexts/AlertContext';
import type { CourseSection } from '../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (section: CourseSection) => void;
    initialData: CourseSection | null;
}

export const CustomClassModal = ({ isOpen, onClose, onSave, initialData }: Props) => {
    const [section, setSection] = useState<Partial<CourseSection>>({});
    const showAlert = useAlert();
    const isEditing = !!initialData;

    useEffect(() => {
        if (isOpen) {
            setSection(initialData || {
                "Subject Code": "", "Course Title": "", Section: "", Time: "TBA", Room: "TBA",
                Instructor: "TBA", Slots: 99, Remarks: "Custom class.", priority: 50,
                excluded: false, isCustom: true,
            });
        }
    }, [isOpen, initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? parseInt(value) || 0 : value;
        setSection(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleSave = () => {
        if (!section["Subject Code"] || !section.Section || !section["Course Title"]) {
            showAlert("Input Required", "Please fill in at least Subject Code, Section, and Course Title.");
            return;
        }
        onSave(section as CourseSection);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}>
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 m-4 transform transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-semibold dark:text-gray-200">{isEditing ? 'Edit Custom Class' : 'Add Custom Class'}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full"><X size={24} /></button>
                </div>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject Code</label>
                            <input type="text" name="Subject Code" value={section["Subject Code"]} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" disabled={isEditing} />
                             {isEditing && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cannot change Subject Code when editing.</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Section</label>
                            <input type="text" name="Section" value={section.Section} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" disabled={isEditing} />
                             {isEditing && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cannot change Section when editing.</p>}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Course Title</label>
                        <input type="text" name="Course Title" value={section["Course Title"]} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time</label>
                        <input type="text" name="Time" value={section.Time} onChange={handleChange} placeholder="e.g., MWF 10:30-11:20" className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use format: DAYS HH:MM-HH:MM. e.g., TTH 13:00-14:30</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Instructor</label>
                            <input type="text" name="Instructor" value={section.Instructor} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Room</label>
                            <input type="text" name="Room" value={section.Room} onChange={handleChange} className="mt-1 w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                    <button onClick={handleSave} className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 font-semibold">Save Class</button>
                </div>
            </div>
        </div>
    );
};
