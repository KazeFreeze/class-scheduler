import { displaySchedule, clearCalendar } from "./calendar.js";

document.addEventListener("DOMContentLoaded", () => {
  const courseListContainer = document.getElementById("course-list");
  const searchInput = document.getElementById("course-search");
  const generateButton = document.getElementById("generate-schedule");
  const prevButton = document.getElementById("prev-btn");
  const nextButton = document.getElementById("next-btn");
  const scheduleCounter = document.getElementById("schedule-counter");
  const exportButton = document.getElementById("export-btn");

  let coursesData = [];
  let allSchedules = [];
  let currentScheduleIndex = 0;

  // Fetch course data from the API
  async function fetchCourses() {
    try {
      const response = await fetch("/api/getClasses");
      const data = await response.json();
      coursesData = data.courses;
      populateCourseList(coursesData);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  }

  // Populate the course list in the UI
  function populateCourseList(courses) {
    courseListContainer.innerHTML = "";
    const uniqueCourses = getUniqueCourses(courses);
    uniqueCourses.forEach((course) => {
      const label = document.createElement("label");
      label.innerHTML = `
                <input type="checkbox" value="${course["Subject Code"]}">
                <span>${course["Subject Code"]} - ${course["Course Title"]}</span>
            `;
      courseListContainer.appendChild(label);
    });
  }

  // To handle course variants, we group them by a base code.
  function getUniqueCourses(courses) {
    const courseMap = new Map();
    courses.forEach((course) => {
      const baseCode = getBaseCourseCode(course["Subject Code"]);
      if (!courseMap.has(baseCode)) {
        courseMap.set(baseCode, course);
      }
    });
    return Array.from(courseMap.values());
  }

  function getBaseCourseCode(subjectCode) {
    // Handle 'IE' and 'ENGG' special cases
    if (subjectCode.includes("IE")) {
      return "IE";
    }
    if (subjectCode.startsWith("ENGG 18X")) {
      return "ENGG 18X";
    }
    // General case: remove section and specialization details
    return subjectCode.split(".")[0];
  }

  // Filter courses based on search input
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredCourses = coursesData.filter(
      (course) =>
        course["Subject Code"].toLowerCase().includes(searchTerm) ||
        course["Course Title"].toLowerCase().includes(searchTerm)
    );
    populateCourseList(filteredCourses);
  });

  // Generate schedules
  generateButton.addEventListener("click", () => {
    const selectedCourses = Array.from(
      courseListContainer.querySelectorAll("input:checked")
    ).map((input) => getBaseCourseCode(input.value));

    if (selectedCourses.length === 0) {
      alert("Please select at least one course.");
      return;
    }

    const courseOptions = selectedCourses.map((baseCode) =>
      coursesData.filter(
        (course) => getBaseCourseCode(course["Subject Code"]) === baseCode
      )
    );

    allSchedules = generateCombinations(courseOptions);
    currentScheduleIndex = 0;
    updateCalendar();
  });

  function generateCombinations(courseGroups) {
    let combinations = [];
    function backtrack(index, currentCombination) {
      if (index === courseGroups.length) {
        if (!hasTimeConflict(currentCombination)) {
          combinations.push([...currentCombination]);
        }
        return;
      }
      for (const course of courseGroups[index]) {
        currentCombination.push(course);
        backtrack(index + 1, currentCombination);
        currentCombination.pop();
      }
    }
    backtrack(0, []);
    return combinations;
  }

  function hasTimeConflict(schedule) {
    const parsedTimes = [];
    for (const course of schedule) {
      const times = parseTime(course.Time);
      if (!times) continue;
      for (const time of times) {
        for (const existingTime of parsedTimes) {
          if (
            time.day === existingTime.day &&
            time.start < existingTime.end &&
            time.end > existingTime.start
          ) {
            return true; // Conflict found
          }
        }
        parsedTimes.push(time);
      }
    }
    return false; // No conflicts
  }

  function parseTime(timeStr) {
    if (!timeStr || timeStr.toLowerCase().includes("tba")) return null;

    const daysMap = { M: 1, T: 2, W: 3, TH: 4, F: 5, SAT: 6 };
    const parts = timeStr.split("(")[0].trim().split(";");
    const parsed = [];

    parts.forEach((part) => {
      const timeMatch = part.match(/(\d{4})-(\d{4})/);
      if (!timeMatch) return;
      const startTime = timeMatch[1];
      const endTime = timeMatch[2];
      const dayStr = part.replace(timeMatch[0], "").trim();
      const days = dayStr.split("-").flatMap((d) => {
        if (daysMap[d]) return [daysMap[d]];
        // Handle day ranges like M-TH
        const dayKeys = Object.keys(daysMap);
        const startDayIndex = dayKeys.indexOf(d.split("-")[0]);
        const endDayIndex = dayKeys.indexOf(d.split("-")[1]);
        if (startDayIndex !== -1 && endDayIndex !== -1) {
          return dayKeys
            .slice(startDayIndex, endDayIndex + 1)
            .map((day) => daysMap[day]);
        }
        return [];
      });

      days.forEach((day) => {
        parsed.push({
          day: day,
          start: parseInt(startTime, 10),
          end: parseInt(endTime, 10),
        });
      });
    });
    return parsed;
  }

  // Update calendar display
  function updateCalendar() {
    if (allSchedules.length > 0) {
      displaySchedule(allSchedules[currentScheduleIndex]);
      scheduleCounter.textContent = `Schedule ${currentScheduleIndex + 1} of ${
        allSchedules.length
      }`;
    } else {
      clearCalendar();
      scheduleCounter.textContent = "No non-conflicting schedules found.";
    }
  }

  // Navigation buttons
  prevButton.addEventListener("click", () => {
    if (allSchedules.length > 0) {
      currentScheduleIndex =
        (currentScheduleIndex - 1 + allSchedules.length) % allSchedules.length;
      updateCalendar();
    }
  });

  nextButton.addEventListener("click", () => {
    if (allSchedules.length > 0) {
      currentScheduleIndex = (currentScheduleIndex + 1) % allSchedules.length;
      updateCalendar();
    }
  });

  // Export to .ics
  exportButton.addEventListener("click", () => {
    if (allSchedules.length > 0) {
      const cal = ics();
      const currentSchedule = allSchedules[currentScheduleIndex];
      currentSchedule.forEach((course) => {
        // This is a simplified version. A full implementation would need more robust date handling.
        cal.addEvent(
          course["Course Title"],
          course["Course Title"],
          course["Room"],
          "2025-08-11T10:00:00",
          "2025-08-11T11:00:00"
        );
      });
      cal.download("my-schedule");
    }
  });

  // Initial fetch
  fetchCourses();
});
