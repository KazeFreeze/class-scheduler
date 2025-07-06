import { useState } from 'react';
import { X, Coffee, Github } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

// Replace these with your actual details!
const YOUR_NAME = "Bernard G. Tapiru, Jr.";
const YOUR_BIO = "BS EcE major passionate about useful tech tools - software and hardware. This class scheduler was a fun project to help students organize their academic schedules.";
const GITHUB_LINK = "https://github.com/kazefreeze/";
const COFFEE_LINK = "https://buymeacoffee.com/bunad";
// The path to the QR code image in the 'public' folder.
const GCASH_QR_CODE_PATH = "/gcash-qr.jpg";


export const AboutModal = ({ isOpen, onClose }: Props) => {
    if (!isOpen) return null;

    const [showGcashQr, setShowGcashQr] = useState(false);

    return (
        <>
            <div 
                className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 transition-opacity duration-300"
                onClick={onClose}
            >
                <div 
                    className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4 p-6 transform transition-all duration-300 flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-semibold">About this Project</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-1 rounded-full"><X size={24} /></button>
                    </div>
                    
                    <div className="space-y-4 text-gray-700">
                        <p className="font-bold text-lg">Created by: {YOUR_NAME}</p>
                        <p className="text-base leading-relaxed">{YOUR_BIO}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <a href={GITHUB_LINK} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-700 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                                <Github size={20} />
                                <span>GitHub</span>
                            </a>
                            <a href={COFFEE_LINK} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors">
                                <Coffee size={20} />
                                <span>Buy me a coffee</span>
                            </a>
                        </div>
                        <div>
                            <button 
                                onClick={() => setShowGcashQr(true)} 
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                <Coffee size={20} />
                                <span>Buy me a coffee (GCash)</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Full-screen QR Code Modal */}
            {showGcashQr && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[60] transition-opacity duration-300 p-4"
                    onClick={() => setShowGcashQr(false)}
                >
                    <div
                        className="relative bg-white p-6 rounded-lg shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowGcashQr(false)}
                            className="absolute -top-5 -right-5 bg-white text-gray-800 rounded-full p-2 shadow-lg hover:scale-110 transition-transform"
                            aria-label="Close QR code view"
                        >
                            <X size={24} />
                        </button>
                        <img src={GCASH_QR_CODE_PATH} alt="GCash QR Code" className="h-[80vh] w-auto max-w-[80vw] object-contain" />
                        <p className="text-center mt-4 text-gray-600 font-medium">Scan with your GCash App</p>
                    </div>
                </div>
            )}
        </>
    );
};