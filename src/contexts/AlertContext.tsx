import { createContext, useContext } from 'react';

// Define the shape of the function that the context will provide.
type AlertContextType = (title: string, message: string) => void;

// Create the context with a default value (a function that does nothing).
export const AlertContext = createContext<AlertContextType>(() => {});

// Custom hook for easy consumption of the context.
export const useAlert = () => useContext(AlertContext);
