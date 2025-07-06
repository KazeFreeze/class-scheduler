import {
  displaySchedule,
  clearCalendar,
  addEventToCalendar,
  removeEventFromCalendar,
} from "./calendar.js";

/**
 * For a more complex application, consider using a lightweight state management library
 * like Zustand or a full UI framework like React or Vue to handle state-driven UI updates
 * more efficiently than manual DOM manipulation.
 */
document.addEventListener("DOMContentLoaded", () => {
  // --- STATE MANAGEMENT ---
  let allCoursesData = [];
  let uniqueCourses = new Map();

  // Key: courseCode or groupID, Value: { id, type, name, priority, courses?, isExpanded?, sections? }
  let requiredItems = new Map();

  // Key: courseCode or groupID, Value: sectionObject
  let selectedSections = new Map();
  let activeSelectionId = null;
  let generatedSchedules = [];
  let currentScheduleIndex = 0;
  let currentStep = 1; // 1: Select Courses, 2: Select Sections

  // --- UI ELEMENTS ---
  const availableCourseSearch = document.getElementById(
    "available-course-search"
  );
  const availableCoursesList = document.getElementById(
    "available-courses-list"
  );
  const requiredCoursesContainer = document.getElementById(
    "required-courses-container"
  );
  const createGroupBtn = document.getElementById("create-group-btn");
  const autoScheduleBtn = document.getElementById("auto-schedule-btn");

  // Group Modal Elements
  const groupModal = document.getElementById("group-modal");
  const closeGroupModalBtn = document.getElementById("close-group-modal-btn");
  const groupNameInput = document.getElementById("group-name-input");
  const groupCourseSearch = document.getElementById("group-course-search");
  const groupModalSearchResults = document.getElementById(
    "group-modal-search-results"
  );
  const groupModalSelectedList = document.getElementById(
    "group-modal-selected-list"
  );
  const groupItemCount = document.getElementById("group-item-count");
  const cancelGroupBtn = document.getElementById("cancel-group-btn");
  const saveGroupBtn = document.getElementById("save-group-btn");

  let tempGroupCourses = new Map();

  // --- INITIALIZATION ---
  async function fetchAndInitialize() {
    try {
      const response = await fetch("/api/getClasses");
      const data = await response.json();
      allCoursesData = data.courses.map((c) => ({
        ...c,
        priority: 100,
        excluded: false,
      }));
      processCourseData();
      renderSidebar();
    } catch (error) {
      console.error("Error fetching courses:", error);
      availableCoursesList.innerHTML = `<p class="text-red-500">Failed to load course data.</p>`;
    }
  }

  function processCourseData() {
    allCoursesData.forEach((course) => {
      const code = course["Subject Code"];
      if (!uniqueCourses.has(code)) {
        uniqueCourses.set(code, {
          code: code,
          title: course["Course Title"],
        });
      }
    });
  }

  fetchAndInitialize();

  // --- MAIN RENDER FUNCTION ---
  function renderSidebar() {
    // Hide all view containers and then show the correct one
    document.querySelector(".p-4.flex-1.flex.flex-col").style.display =
      currentStep === 1 ? "flex" : "none";
    document.querySelector(
      ".p-4.flex-1.flex.flex-col.overflow-y-auto"
    ).style.display = currentStep === 2 ? "flex" : "none";

    if (currentStep === 1) {
      renderStep1_SelectCourses();
    } else {
      renderStep2_SelectSections();
    }
    updateAutoScheduleButton();
  }

  // --- STEP 1 RENDER ---
  function renderStep1_SelectCourses(filter = "") {
    const courseListContainer = document.getElementById(
      "available-courses-list"
    );
    courseListContainer.innerHTML = "";

    // Render selected items first
    requiredItems.forEach((item) => {
      const course = uniqueCourses.get(item.id) || {
        code: item.name,
        title: "Custom Group",
      };
      const isGroup = item.type === "group";
      const itemEl = document.createElement("div");
      itemEl.className = `available-course-item ${
        isGroup ? "selected-group" : "selected"
      }`;
      itemEl.dataset.id = item.id;
      itemEl.innerHTML = `
              <div>
                  <p class="font-medium">${course.code}</p>
                  <p class="text-xs">${course.title}</p>
              </div>
              <button class="text-red-500 hover:text-red-700 remove-course-btn" data-id="${item.id}">&times;</button>
          `;
      courseListContainer.appendChild(itemEl);
    });

    // Render unselected items
    const sortedCourses = [...uniqueCourses.values()].sort((a, b) =>
      a.code.localeCompare(b.code)
    );
    const filteredCourses = sortedCourses.filter(
      (course) =>
        !requiredItems.has(course.code) &&
        (course.code.toLowerCase().includes(filter.toLowerCase()) ||
          course.title.toLowerCase().includes(filter.toLowerCase()))
    );

    filteredCourses.forEach((course) => {
      const item = document.createElement("div");
      item.className = `available-course-item`;
      item.dataset.courseCode = course.code;
      item.innerHTML = `
              <div>
                  <p class="font-medium">${course.code}</p>
                  <p class="text-xs">${course.title}</p>
              </div>
              <i class="fas fa-plus text-lg"></i>
          `;
      item.addEventListener("click", () => toggleRequiredCourse(course.code));
      courseListContainer.appendChild(item);
    });

    // Add Next Step button if needed
    let nextButton = document.getElementById("next-step-btn");
    if (!nextButton) {
      nextButton = document.createElement("button");
      nextButton.id = "next-step-btn";
      nextButton.className =
        "w-full mt-4 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400";
      nextButton.textContent = "Next Step: Choose Sections";
      nextButton.addEventListener("click", () => {
        currentStep = 2;
        renderSidebar();
      });
      courseListContainer.parentElement.appendChild(nextButton);
    }
    nextButton.disabled = requiredItems.size === 0;
  }

  // --- STEP 2 RENDER ---
  function renderStep2_SelectSections() {
    requiredCoursesContainer.innerHTML = ""; // Clear previous content

    const backButton = document.createElement("button");
    backButton.className = "mb-4 text-blue-500 hover:underline";
    backButton.innerHTML = "&larr; Back to Course Selection";
    backButton.addEventListener("click", () => {
      currentStep = 1;
      renderSidebar();
    });
    requiredCoursesContainer.appendChild(backButton);

    requiredItems.forEach((item) => {
      const container = document.createElement("div");
      container.className = "mb-4";

      const isExpanded = item.isExpanded === undefined ? true : item.isExpanded;

      container.innerHTML = `
              <div class="required-course-header cursor-pointer flex justify-between items-center" data-id="${
                item.id
              }">
                  <h3 class="font-bold text-lg">${item.name}</h3>
                  <i class="fas ${
                    isExpanded ? "fa-chevron-up" : "fa-chevron-down"
                  }"></i>
              </div>
          `;

      const sectionList = document.createElement("div");
      sectionList.className = "space-y-2 mt-2 pl-4 border-l-2 border-gray-200";
      if (!isExpanded) {
        sectionList.classList.add("hidden");
      }

      const sections = getSectionsForId(item.id);
      const currentlySelectedSection = selectedSections.get(item.id);

      sections.forEach((section) => {
        const sectionId = `${section["Subject Code"]}-${section.Section}`;
        const isSelected =
          currentlySelectedSection &&
          currentlySelectedSection.Section === section.Section;
        const isConflict = !isSelected && checkForConflict(section, item.id);

        const sectionDiv = document.createElement("div");
        sectionDiv.className = `section-item ${isSelected ? "selected" : ""} ${
          isConflict ? "conflict" : ""
        }`;
        sectionDiv.dataset.itemId = item.id;
        sectionDiv.dataset.sectionJson = JSON.stringify(section);

        sectionDiv.innerHTML = `
                  <div class="flex justify-between items-start">
                      <div>
                          <p class="font-bold">${section.Section} | ${
          section.Time
        }</p>
                          <p class="text-xs text-gray-600">${
                            section.Instructor
                          } | Room: ${section.Room}</p>
                      </div>
                      <input type="checkbox" class="section-checkbox" ${
                        isSelected ? "checked" : ""
                      } ${isConflict ? "disabled" : ""}>
                  </div>
              `;
        sectionList.appendChild(sectionDiv);
      });
      container.appendChild(sectionList);
      requiredCoursesContainer.appendChild(container);
    });
  }

  // --- EVENT HANDLERS & LOGIC ---

  availableCourseSearch.addEventListener("input", (e) =>
    renderStep1_SelectCourses(e.target.value)
  );

  document
    .getElementById("available-courses-list")
    .addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-course-btn")) {
        const idToRemove = e.target.dataset.id;
        requiredItems.delete(idToRemove);
        if (selectedSections.has(idToRemove)) {
          const section = selectedSections.get(idToRemove);
          removeEventFromCalendar(
            `${section["Subject Code"]}-${section.Section}`
          );
          selectedSections.delete(idToRemove);
        }
        renderSidebar();
      }
    });

  requiredCoursesContainer.addEventListener("click", (e) => {
    const header = e.target.closest(".required-course-header");
    if (header) {
      const id = header.dataset.id;
      const item = requiredItems.get(id);
      item.isExpanded = !item.isExpanded;
      renderStep2_SelectSections();
    }
  });

  requiredCoursesContainer.addEventListener("change", (e) => {
    if (e.target.classList.contains("section-checkbox")) {
      const sectionDiv = e.target.closest(".section-item");
      const itemId = sectionDiv.dataset.itemId;
      const section = JSON.parse(sectionDiv.dataset.sectionJson);
      toggleSectionSelection(itemId, section, e.target.checked);
    }
  });

  function toggleRequiredCourse(courseCode) {
    if (requiredItems.has(courseCode)) {
      return; // Should be handled by remove button
    } else {
      const courseInfo = uniqueCourses.get(courseCode);
      requiredItems.set(courseCode, {
        id: courseCode,
        type: "course",
        name: courseCode,
        priority: 100,
        isExpanded: true,
      });
    }
    renderSidebar();
  }

  function getSectionsForId(id) {
    const item = requiredItems.get(id);
    if (!item) return [];
    let courseCodes = item.type === "group" ? item.courses : [item.id];
    return allCoursesData.filter((c) =>
      courseCodes.includes(c["Subject Code"])
    );
  }

  function toggleSectionSelection(itemId, section, isSelected) {
    const sectionIdentifier = `${section["Subject Code"]}-${section.Section}`;

    if (isSelected) {
      const currentlySelected = selectedSections.get(itemId);
      if (currentlySelected) {
        removeEventFromCalendar(
          `${currentlySelected["Subject Code"]}-${currentlySelected.Section}`
        );
      }
      selectedSections.set(itemId, { ...section, isLocked: true });
      addEventToCalendar(section);
    } else {
      selectedSections.delete(itemId);
      removeEventFromCalendar(sectionIdentifier);
    }
    renderStep2_SelectSections(); // Re-render to update styles and conflicts
  }

  function getSectionTimes(section) {
    const times = [];
    const timeStr = section.Time;
    if (!timeStr || String(timeStr).toLowerCase().includes("tba")) return [];

    const daysMap = { M: 1, T: 2, W: 3, TH: 4, F: 5, S: 6, H: 4 };
    const dayTimeParts = String(timeStr)
      .split(";")
      .map((s) => s.trim());

    dayTimeParts.forEach((part) => {
      const timeMatch = part.match(
        /(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})/
      );
      if (!timeMatch) return;

      const start =
        parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
      const end = parseInt(timeMatch[3], 10) * 60 + parseInt(timeMatch[4], 10);

      const dayStrMatch = part.match(/^([A-Z]+)/);
      if (!dayStrMatch) return;

      const dayStr = dayStrMatch[1];
      let i = 0;
      while (i < dayStr.length) {
        let dayChar = dayStr[i];
        if (dayChar === "T" && i + 1 < dayStr.length && dayStr[i + 1] === "H") {
          times.push({ day: daysMap["TH"], start, end });
          i += 2;
        } else if (daysMap[dayChar]) {
          times.push({ day: daysMap[dayChar], start, end });
          i += 1;
        } else {
          i++;
        }
      }
    });
    return times;
  }

  function checkForConflict(sectionToCheck, requirementIdToIgnore) {
    const sectionTimes = getSectionTimes(sectionToCheck);
    if (sectionTimes.length === 0) return false;

    for (const [reqId, selectedSection] of selectedSections.entries()) {
      if (reqId === requirementIdToIgnore) continue;

      const existingTimes = getSectionTimes(selectedSection);
      for (const t1 of sectionTimes) {
        for (const t2 of existingTimes) {
          if (t1.day === t2.day && t1.start < t2.end && t1.end > t2.start) {
            return true; // Conflict found
          }
        }
      }
    }
    return false;
  }

  function updateAutoScheduleButton() {
    autoScheduleBtn.disabled = requiredItems.size === 0;
  }

  // --- GROUP MODAL LOGIC ---
  createGroupBtn.addEventListener("click", () => {
    tempGroupCourses.clear();
    groupNameInput.value = "";
    renderGroupModalLists();
    groupModal.classList.remove("hidden");
    groupModal.classList.add("flex");
  });

  function closeGroupModal() {
    groupModal.classList.add("hidden");
    groupModal.classList.remove("flex");
  }

  closeGroupModalBtn.addEventListener("click", closeGroupModal);
  cancelGroupBtn.addEventListener("click", closeGroupModal);
  groupCourseSearch.addEventListener("input", () => renderGroupModalLists());

  function renderGroupModalLists() {
    groupModalSearchResults.innerHTML = "";
    const filter = groupCourseSearch.value.toLowerCase();
    const sortedCourses = [...uniqueCourses.values()].sort((a, b) =>
      a.code.localeCompare(b.code)
    );

    const searchResults = sortedCourses
      .filter((course) => !tempGroupCourses.has(course.code))
      .filter(
        (course) =>
          course.code.toLowerCase().includes(filter) ||
          course.title.toLowerCase().includes(filter)
      );

    // Display only top 5 results if no search filter is applied
    const displayList =
      filter === "" ? searchResults.slice(0, 5) : searchResults;

    displayList.forEach((course) => {
      const div = document.createElement("div");
      div.className = "p-2 hover:bg-gray-100 cursor-pointer rounded";
      div.textContent = `${course.code} - ${course.title}`;
      div.addEventListener("click", () => {
        tempGroupCourses.set(course.code, course);
        groupCourseSearch.value = "";
        renderGroupModalLists();
      });
      groupModalSearchResults.appendChild(div);
    });

    groupModalSelectedList.innerHTML = "";
    groupItemCount.textContent = tempGroupCourses.size;
    tempGroupCourses.forEach((course) => {
      const div = document.createElement("div");
      div.className =
        "p-2 bg-blue-100 rounded flex justify-between items-center";
      div.textContent = course.code;
      const removeBtn = document.createElement("button");
      removeBtn.className = "text-red-500 hover:text-red-700";
      removeBtn.innerHTML = "&times;";
      removeBtn.addEventListener("click", () => {
        tempGroupCourses.delete(course.code);
        renderGroupModalLists();
      });
      div.appendChild(removeBtn);
      groupModalSelectedList.appendChild(div);
    });
  }

  saveGroupBtn.addEventListener("click", () => {
    const groupName = groupNameInput.value.trim();
    if (!groupName || tempGroupCourses.size === 0) {
      alert("Please provide a group name and add at least one course.");
      return;
    }

    const groupId = `group_${Date.now()}`;
    requiredItems.set(groupId, {
      id: groupId,
      type: "group",
      name: groupName,
      priority: 100,
      courses: [...tempGroupCourses.keys()],
      isExpanded: true,
    });

    renderSidebar();
    closeGroupModal();
  });

  /**
   * The auto-scheduler uses a backtracking algorithm. For very large datasets,
   * this could be slow. Libraries for Constraint Satisfaction Problems (CSP),
   * like `js-csp`, could offer more advanced and optimized solvers if performance
   * becomes an issue.
   */
  // --- AUTO-SCHEDULER LOGIC ---
  autoScheduleBtn.addEventListener("click", runAutoScheduler);

  function runAutoScheduler() {
    // Separate locked (manual) selections from those to be scheduled
    const lockedSelections = new Map();
    const requirementsToSchedule = [];

    requiredItems.forEach((req) => {
      const selected = selectedSections.get(req.id);
      if (selected && selected.isLocked) {
        lockedSelections.set(req.id, selected);
      } else {
        requirementsToSchedule.push(req);
      }
    });

    // Clear only non-locked items from the calendar
    selectedSections.forEach((section, reqId) => {
      if (!section.isLocked) {
        removeEventFromCalendar(
          `${section["Subject Code"]}-${section.Section}`
        );
        selectedSections.delete(reqId);
      }
    });

    const sortedRequirements = requirementsToSchedule.sort(
      (a, b) => a.priority - b.priority
    );
    const sectionsByRequirement = new Map();

    sortedRequirements.forEach((req) => {
      const sections = getSectionsForId(req.id)
        .filter((s) => !s.excluded)
        .sort((a, b) => (a.priority || 100) - (b.priority || 100));
      sectionsByRequirement.set(req.id, sections);
    });

    generatedSchedules = [];
    findSchedules(
      0,
      sortedRequirements,
      sectionsByRequirement,
      lockedSelections
    );

    if (generatedSchedules.length > 0) {
      currentScheduleIndex = 0;
      displayGeneratedSchedule();
      alert(
        `Successfully generated ${generatedSchedules.length} possible schedules!`
      );
    } else {
      alert("Could not find any valid schedule with the given constraints.");
      // Restore calendar to its pre-run state
      displaySchedule(Array.from(selectedSections.values()));
    }
  }

  function findSchedules(
    reqIndex,
    requirements,
    sectionsByRequirement,
    currentSchedule
  ) {
    if (reqIndex === requirements.length) {
      generatedSchedules.push(new Map(currentSchedule));
      return;
    }

    const req = requirements[reqIndex];
    const possibleSections = sectionsByRequirement.get(req.id);

    for (const section of possibleSections) {
      if (!isScheduleConflict(section, currentSchedule)) {
        currentSchedule.set(req.id, section);
        findSchedules(
          reqIndex + 1,
          requirements,
          sectionsByRequirement,
          currentSchedule
        );
        currentSchedule.delete(req.id); // backtrack
      }
    }
  }

  function isScheduleConflict(sectionToCheck, schedule) {
    const sectionTimes = getSectionTimes(sectionToCheck);
    if (sectionTimes.length === 0) return false;

    for (const selectedSection of schedule.values()) {
      const existingTimes = getSectionTimes(selectedSection);
      for (const t1 of sectionTimes) {
        for (const t2 of existingTimes) {
          if (t1.day === t2.day && t1.start < t2.end && t1.end > t2.start) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function displayGeneratedSchedule() {
    if (generatedSchedules.length === 0) return;

    const scheduleMap = generatedSchedules[currentScheduleIndex];
    // Update the main selectedSections map
    selectedSections = new Map(scheduleMap);

    const scheduleArray = Array.from(scheduleMap.values());
    displaySchedule(scheduleArray);

    document.getElementById("schedule-actions").classList.remove("hidden");
    document.getElementById("schedule-counter").textContent = `${
      currentScheduleIndex + 1
    } of ${generatedSchedules.length}`;

    // Re-render the sections to show what the auto-scheduler picked
    if (currentStep === 2) {
      renderStep2_SelectSections();
    }
  }

  document.getElementById("prev-btn").addEventListener("click", () => {
    if (generatedSchedules.length === 0) return;
    currentScheduleIndex =
      (currentScheduleIndex - 1 + generatedSchedules.length) %
      generatedSchedules.length;
    displayGeneratedSchedule();
  });

  document.getElementById("next-btn").addEventListener("click", () => {
    if (generatedSchedules.length === 0) return;
    currentScheduleIndex =
      (currentScheduleIndex + 1) % generatedSchedules.length;
    displayGeneratedSchedule();
  });
});
