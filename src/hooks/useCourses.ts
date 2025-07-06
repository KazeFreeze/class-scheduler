import { useState, useEffect } from "react";
import type { CourseSection, UniqueCourse } from "../types";

/**
 * Custom hook to fetch and process course data from the API.
 * It initializes each course section with default values for priority and exclusion.
 */
export const useCourses = () => {
  // State for all course sections with added client-side properties
  const [allCoursesData, setAllCoursesData] = useState<CourseSection[]>([]);
  // State for the map of unique courses for selection
  const [uniqueCourses, setUniqueCourses] = useState<Map<string, UniqueCourse>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // Fetching from the Vercel serverless function endpoint
        const response = await fetch("/api/getClasses");
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${
              errorData.error || "Unknown error"
            }`
          );
        }
        const data = await response.json();

        // Process fetched courses to add default client-side properties
        const coursesWithDefaults = data.courses.map(
          (c: any): CourseSection => ({
            ...c,
            Slots: c.Slots ?? 0, // Default to 0 if slots are not provided
            Remarks: c.Remarks ?? "", // Default to empty string for remarks
            priority: 100, // Default priority for sections (lower is higher)
            excluded: false, // Default exclusion status
          })
        );

        setAllCoursesData(coursesWithDefaults);

        // Create a map of unique courses for the selection step
        const newUniqueCourses = new Map<string, UniqueCourse>();
        coursesWithDefaults.forEach((course: CourseSection) => {
          const code = course["Subject Code"];
          if (!newUniqueCourses.has(code)) {
            newUniqueCourses.set(code, { code, title: course["Course Title"] });
          }
        });
        setUniqueCourses(newUniqueCourses);
      } catch (e: any) {
        setError(
          `Failed to fetch course data. Please ensure the API is running and the Gist URL is correct. Details: ${e.message}`
        );
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return { allCoursesData, setAllCoursesData, uniqueCourses, loading, error };
};
