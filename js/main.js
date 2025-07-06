import {
  displaySchedule,
  clearCalendar,
  addEventToCalendar,
  removeEventFromCalendar,
} from "./calendar.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE MANAGEMENT ---
  let coursesData = [];
  let requiredCourses = {}; // { "CSCI 21": { priority: 100, excludedSections: [] }, "group_1": {...} }
  let customGroups = {}; // { "group_1": { name: "Electives", courses: ["ENE 13.01i", "ARTS 180.08i"] } }
  let currentSchedule = []; // Holds manually selected sections
  let allSchedules = []; // Holds schedules from auto-scheduler
  let currentScheduleIndex = 0;

  // --- UI ELEMENTS ---
  const addCourseBtn = document.getElementById("add-course-btn");
  const createGroupBtn = document.getElementById("create-group-btn");
  const requiredCoursesList = document.getElementById("required-courses-list");

  // Modals
  const courseModal = document.getElementById("course-modal");
  const modalCourseSearch = document.getElementById("modal-course-search");
  const modalCourseList = document.getElementById("modal-course-list");

  const groupModal = document.getElementById("group-modal");
  const groupCourseSearch = document.getElementById("group-course-search");
  const groupModalSearchResults = document.getElementById(
    "group-modal-search-results"
  );
  const groupModalSelectedList = document.getElementById(
    "group-modal-selected-list"
  );
  const cancelGroupBtn = document.getElementById("cancel-group-btn");
  const saveGroupBtn = document.getElementById("save-group-btn");

  // Scheduler controls
  const autoScheduleBtn = document.getElementById("auto-schedule-btn");
  const scheduleActions = document.getElementById("schedule-actions");
  const prevButton = document.getElementById("prev-btn");
  const nextButton = document.getElementById("next-btn");
  const scheduleCounter = document.getElementById("schedule-counter");

  // --- INITIALIZATION ---
  async function fetchCourses() {
    try {
      const response = await fetch("/api/getClasses");
      const data = await response.json();
      coursesData = data.courses;
      // Initial render can happen here if needed
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  }
  fetchCourses();

  // --- UI & EVENT LISTENERS ---

  // Modal Handling
  addCourseBtn.addEventListener("click", () => {
    populateModalCourseList(getUniqueCourses(coursesData));
    courseModal.classList.add("flex");
  });

  createGroupBtn.addEventListener("click", () => {
    groupModal.classList.add("flex");
  });

  courseModal.addEventListener("click", (e) => {
    if (e.target === courseModal) courseModal.classList.remove("flex");
  });

  groupModal.addEventListener("click", (e) => {
    if (e.target === groupModal) groupModal.classList.remove("flex");
  });

  cancelGroupBtn.addEventListener("click", () =>
    groupModal.classList.remove("flex")
  );

  // --- LOGIC FUNCTIONS ---

  function getUniqueCourses(courses) {
    const courseMap = new Map();
    courses.forEach((course) => {
      const baseCode = getBaseCourseCode(course["Subject Code"]);
      if (!courseMap.has(baseCode)) {
        courseMap.set(baseCode, course);
      }
    });
    return Array.from(courseMap.values()).sort((a, b) =>
      a["Subject Code"].localeCompare(b["Subject Code"])
    );
  }

  function getBaseCourseCode(subjectCode) {
    if (subjectCode.includes("IE ")) return "IE";
    if (subjectCode.startsWith("ENGG 18X")) return "ENGG 18X";
    const match = subjectCode.match(/^[A-Za-z]+\s?\d+/);
    return match ? match[0] : subjectCode;
  }

  function populateModalCourseList(courses) {
    modalCourseList.innerHTML = "";
    courses.forEach((course) => {
      const div = document.createElement("div");
      div.className = "p-2 hover:bg-gray-100 cursor-pointer rounded";
      div.textContent = `${course["Subject Code"]} - ${course["Course Title"]}`;
      div.dataset.courseCode = getBaseCourseCode(course["Subject Code"]);
      div.addEventListener("click", () => {
        addRequiredCourse(div.dataset.courseCode);
        courseModal.classList.remove("flex");
      });
      modalCourseList.appendChild(div);
    });
  }

  function addRequiredCourse(baseCode) {
    if (requiredCourses[baseCode]) return; // Avoid duplicates
    requiredCourses[baseCode] = {
      priority: 100,
      excludedSections: [],
      type: "course",
    };
    renderRequiredCourses();
  }

  function renderRequiredCourses() {
    requiredCoursesList.innerHTML = "";
    for (const id in requiredCourses) {
      const item = requiredCourses[id];
      const container = document.createElement("div");
      container.className =
        item.type === "group" ? "custom-group-item" : "required-course-item";

      const title = item.type === "group" ? customGroups[id].name : id;

      container.innerHTML = `
                <div class="flex justify-between items-center">
                    <h3 class="font-bold">${title}</h3>
                    <div class="flex items-center gap-2">
                        <label class="text-xs">Priority:</label>
                        <input type="number" value="${item.priority}" class="priority-input">
                        <button class="text-red-500 hover:text-red-700 remove-item-btn" data-id="${id}">&times;</button>
                    </div>
                </div>
                <div class="mt-2 space-y-1 section-list"></div>
            `;
      requiredCoursesList.appendChild(container);

      // Populate sections for this course/group
      const sectionList = container.querySelector(".section-list");
      const sections = getSectionsForId(id);

      sections.forEach((section) => {
        const sectionDiv = document.createElement("div");
        sectionDiv.className =
          "section-item flex justify-between items-center text-sm";
        sectionDiv.innerHTML = `
                    <div>
                        <p class="font-medium">${section.Section} | ${section.Time}</p>
                        <p class="text-xs text-gray-500">${section.Instructor}</p>
                    </div>
                    <input type="checkbox" class="exclude-section-toggle" title="Exclude from auto-scheduling">
                `;
        sectionList.appendChild(sectionDiv);
      });
    }
  }

  function getSectionsForId(id) {
    if (requiredCourses[id].type === "group") {
      return customGroups[id].courses.flatMap((courseCode) =>
        coursesData.filter(
          (c) =>
            getBaseCourseCode(c["Subject Code"]) ===
            getBaseCourseCode(courseCode)
        )
      );
    } else {
      return coursesData.filter(
        (c) => getBaseCourseCode(c["Subject Code"]) === id
      );
    }
  }

  // Placeholder for Auto-Schedule logic
  autoScheduleBtn.addEventListener("click", () => {
    alert(
      "Auto-scheduling logic with priorities is complex and would require a more sophisticated algorithm (like backtracking with heuristics). This button is a placeholder for that feature."
    );
  });
});
