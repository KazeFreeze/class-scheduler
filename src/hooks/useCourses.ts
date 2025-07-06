import { useState, useEffect } from "react";
import type { CourseSection, UniqueCourse } from "../types";

export const useCourses = () => {
  const [allCoursesData, setAllCoursesData] = useState<CourseSection[]>([]);
  const [uniqueCourses, setUniqueCourses] = useState<Map<string, UniqueCourse>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch("/api/getClasses");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        const coursesWithDefaults = data.courses.map((c: CourseSection) => ({
          ...c,
          priority: 100,
          excluded: false,
        }));
        setAllCoursesData(coursesWithDefaults);

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
          `Failed to fetch course data. Please ensure the API is running. Error: ${e.message}`
        );
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return { allCoursesData, uniqueCourses, loading, error };
};
