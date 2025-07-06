import { useState } from 'react';
import { Download, ArrowLeft } from 'lucide-react';
import * as ics from 'ics';
import { useAlert } from '../contexts/AlertContext';
import type { Schedule, AppStep } from '../types';

interface Props {
    selectedSections: Schedule;
    setStep: (step: AppStep) => void;
}

export const Step3_Export = ({ selectedSections, setStep }: Props) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const showAlert = useAlert();

    const handleExport = () => {
        if (!startDate || !endDate) {
            showAlert("Date Missing", "Please select a start and end date for the schedule.");
            return;
        }

        const dayMap: { [key: string]: 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' } = { M: "MO", T: "TU", W: "WE", TH: "TH", F: "FR", S: "SA" };
        const events: ics.EventAttributes[] = [];

        Object.values(selectedSections).forEach(section => {
            const timeStr = section.Time;
            if (!timeStr || String(timeStr).toLowerCase().includes("tba")) return;

            const dayTimeParts = String(timeStr).split(";").map(s => s.trim());

            dayTimeParts.forEach(part => {
                const timeMatch = part.match(/(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})/);
                if (!timeMatch) return;

                const startHour = timeMatch[1];
                const startMinute = timeMatch[2];
                const endHour = timeMatch[3];
                const endMinute = timeMatch[4];

                const dayStrMatch = part.match(/^([A-Z]+)/);
                if (!dayStrMatch) return;
                
                const dayStr = dayStrMatch[1];
                const days: ('MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA')[] = [];
                
                let i = 0;
                while (i < dayStr.length) {
                    let dayChar = dayStr[i];
                    if (dayChar === 'T' && i + 1 < dayStr.length && dayStr[i + 1] === 'H') {
                        days.push(dayMap['TH']);
                        i += 2;
                    } else if (dayMap[dayChar]) {
                        days.push(dayMap[dayChar]);
                        i += 1;
                    } else { i++; }
                }

                if (days.length > 0) {
                    const startArr = startDate.split('-').map(Number);
                    // The end date for the recurrence rule should be a DATE value, not a DATETIME, for better compatibility.
                    const untilDate = endDate.replace(/-/g, '');
                    
                    events.push({
                        title: `${section["Subject Code"]} (${section.Section})`,
                        description: `${section["Course Title"]}\nInstructor: ${section.Instructor}`,
                        location: section.Room,
                        start: [startArr[0], startArr[1], startArr[2], parseInt(startHour), parseInt(startMinute)],
                        end: [startArr[0], startArr[1], startArr[2], parseInt(endHour), parseInt(endMinute)],
                        recurrenceRule: `FREQ=WEEKLY;BYDAY=${days.join(',')};UNTIL=${untilDate}`,
                    });
                }
            });
        });

        if (events.length === 0) {
            showAlert("No Events", "There are no valid events to export in the selected schedule.");
            return;
        }

        const { error, value } = ics.createEvents(events);
        if (error) {
            console.error(error);
            showAlert("Export Failed", "An error occurred while creating the .ics file.");
            return;
        }

        if (value) {
            const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'My-Schedule.ics';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-4 overflow-y-auto">
            <div className="flex-grow">
                <h3 className="text-lg font-semibold mb-3">Set Schedule Period</h3>
                <div className="space-y-4">
                    <div>
                         <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Schedule Start Date</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
                    </div>
                    <div>
                         <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Schedule End Date</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2" />
                    </div>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 flex flex-col gap-2">
                <button onClick={handleExport} className="w-full bg-gray-800 hover:bg-black dark:bg-gray-200 dark:hover:bg-white dark:text-black text-white py-2.5 px-4 rounded-md font-semibold flex items-center justify-center gap-2">
                    <Download size={16} /> Export .ics File
                </button>
                <button onClick={() => setStep(2)} className="w-full text-center text-blue-600 dark:text-blue-400 hover:underline font-medium py-2 mt-1 flex items-center justify-center gap-2">
                    <ArrowLeft size={16} /> Back to Section Selection
                </button>
            </div>
        </div>
    );
};