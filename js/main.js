import {
  displaySchedule,
  clearCalendar,
  addEventToCalendar,
  removeEventFromCalendar,
} from "./calendar.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE MANAGEMENT ---
  let allCoursesData = [];
  let uniqueCourses = new Map();
  let requiredItems = new Map();
  let selectedSections = new Map();
  let generatedSchedules = [];
  let currentScheduleIndex = 0;
  let currentStep = 1; // Start at Step 1

  // --- UI ELEMENTS ---
  const sidebarStep1 = document.getElementById("sidebar-step-1");
  const sidebarStep2 = document.getElementById("sidebar-step-2");
  const sidebarSubtitle = document.getElementById("sidebar-subtitle");

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
  const nextStepBtn = document.getElementById("next-step-btn");
  const backStepBtn = document.getElementById("back-step-btn");

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
      renderSidebar(); // Initial render
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

  // --- MAIN RENDER FUNCTION (VIEW ROUTER) ---
  function renderSidebar() {
    if (currentStep === 1) {
      sidebarSubtitle.textContent = "Step 1: Select your required courses.";
      sidebarStep1.classList.remove("hidden");
      sidebarStep2.classList.add("hidden");
      renderStep1_SelectCourses();
    } else {
      // currentStep === 2
      sidebarSubtitle.textContent = "Step 2: Choose sections for each course.";
      sidebarStep1.classList.add("hidden");
      sidebarStep2.classList.remove("hidden");
      renderStep2_SelectSections();
    }
    updateAutoScheduleButton();
  }

  // --- STEP 1 RENDER ---
  function renderStep1_SelectCourses(filter = "") {
    availableCoursesList.innerHTML = "";

    // Render selected items at the top
    requiredItems.forEach((item) => {
      const course = uniqueCourses.get(item.id) || {
        code: item.name,
        title: "Custom Group",
      };
      const isGroup = item.type === "group";
      const itemEl = document.createElement("div");
      itemEl.className = `available-course-item p-3 ${
        isGroup ? "selected-group" : "selected"
      }`;
      itemEl.dataset.id = item.id;
      itemEl.innerHTML = `
              <div class="flex-grow">
                  <p class="font-semibold">${course.code}</p>
                  <p class="text-xs text-gray-600">${course.title}</p>
              </div>
              <button class="remove-course-btn text-red-500 hover:text-red-700 text-xl font-bold p-2" data-id="${item.id}" title="Remove ${course.code}">&times;</button>
          `;
      availableCoursesList.prepend(itemEl);
    });

    // Render unselected, filtered items
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
      item.className = `available-course-item p-3`;
      item.dataset.courseCode = course.code;
      item.innerHTML = `
              <div class="flex-grow">
                  <p class="font-medium">${course.code}</p>
                  <p class="text-xs">${course.title}</p>
              </div>
              <i class="fas fa-plus text-lg text-blue-500"></i>
          `;
      availableCoursesList.appendChild(item);
    });

    nextStepBtn.disabled = requiredItems.size === 0;
  }

  // --- STEP 2 RENDER ---
  function renderStep2_SelectSections() {
    requiredCoursesContainer.innerHTML = ""; // Clear previous content

    requiredItems.forEach((item) => {
      const container = document.createElement("div");
      container.className = "mb-4 bg-gray-50 rounded-lg border";

      const isExpanded = item.isExpanded === undefined ? true : item.isExpanded;

      container.innerHTML = `
              <div class="required-course-header p-3 cursor-pointer flex justify-between items-center" data-id="${
                item.id
              }">
                  <h3 class="font-bold text-lg">${item.name}</h3>
                  <i class="fas ${
                    isExpanded ? "fa-chevron-up" : "fa-chevron-down"
                  }"></i>
              </div>
          `;

      const sectionList = document.createElement("div");
      sectionList.className = "section-list-container space-y-2 p-3";
      if (!isExpanded) {
        sectionList.classList.add("hidden");
      }

      const sections = getSectionsForId(item.id);
      const currentlySelectedSection = selectedSections.get(item.id);

      if (sections.length === 0) {
        sectionList.innerHTML = `<p class="text-sm text-gray-500 text-center">No sections available for this course.</p>`;
      } else {
        sections.forEach((section) => {
          const isSelected =
            currentlySelectedSection &&
            currentlySelectedSection.Section === section.Section;
          const isConflict = !isSelected && checkForConflict(section, item.id);

          const sectionDiv = document.createElement("div");
          sectionDiv.className = `section-item ${
            isSelected ? "selected" : ""
          } ${isConflict ? "conflict" : ""}`;
          sectionDiv.dataset.itemId = item.id;
          sectionDiv.dataset.sectionJson = JSON.stringify(section); // Store full section data

          sectionDiv.innerHTML = `
                      <div class="flex justify-between items-center">
                          <div>
                              <p class="font-bold">${section.Section} | ${
            section.Time
          }</p>
                              <p class="text-xs text-gray-600">${
                                section.Instructor
                              } | Room: ${section.Room}</p>
                          </div>
                          <input type="checkbox" class="section-checkbox w-5 h-5" ${
                            isSelected ? "checked" : ""
                          } ${isConflict ? "disabled" : ""}>
                      </div>
                  `;
          sectionList.appendChild(sectionDiv);
        });
      }
      container.appendChild(sectionList);
      requiredCoursesContainer.appendChild(container);
    });
  }

  // --- EVENT HANDLERS & LOGIC ---

  // Navigation
  nextStepBtn.addEventListener("click", () => {
    currentStep = 2;
    renderSidebar();
  });
  backStepBtn.addEventListener("click", () => {
    currentStep = 1;
    renderSidebar();
  });

  availableCourseSearch.addEventListener("input", (e) =>
    renderStep1_SelectCourses(e.target.value)
  );

  availableCoursesList.addEventListener("click", (e) => {
    const itemBody = e.target.closest(".available-course-item");
    const removeBtn = e.target.closest(".remove-course-btn");

    if (removeBtn) {
      const idToRemove = removeBtn.dataset.id;
      requiredItems.delete(idToRemove);
      if (selectedSections.has(idToRemove)) {
        const section = selectedSections.get(idToRemove);
        removeEventFromCalendar(
          `${section["Subject Code"]}-${section.Section}`
        );
        selectedSections.delete(idToRemove);
      }
      renderStep1_SelectCourses(availableCourseSearch.value);
    } else if (itemBody) {
      const courseCode = itemBody.dataset.courseCode;
      if (courseCode) {
        toggleRequiredCourse(courseCode);
      }
    }
  });

  requiredCoursesContainer.addEventListener("click", (e) => {
    const header = e.target.closest(".required-course-header");
    if (header) {
      const id = header.dataset.id;
      const item = requiredItems.get(id);
      if (item) {
        item.isExpanded =
          item.isExpanded === undefined ? false : !item.isExpanded;
        renderStep2_SelectSections();
      }
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
    const courseInfo = uniqueCourses.get(courseCode);
    requiredItems.set(courseCode, {
      id: courseCode,
      type: "course",
      name: courseCode,
      priority: 100,
      isExpanded: true,
    });
    renderStep1_SelectCourses(availableCourseSearch.value);
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
      selectedSections.set(itemId, { ...section, isLocked: true }); // Lock manual selections
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

    const daysMap = { M: 1, T: 2, W: 3, TH: 4, F: 5, S: 6 };
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
            return true;
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

    const displayList =
      filter === "" ? searchResults.slice(0, 10) : searchResults;

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

  // --- AUTO-SCHEDULER LOGIC ---
  autoScheduleBtn.addEventListener("click", runAutoScheduler);

  function runAutoScheduler() {
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
    selectedSections = new Map(scheduleMap);

    const scheduleArray = Array.from(scheduleMap.values());
    displaySchedule(scheduleArray);

    document.getElementById("schedule-actions").classList.remove("hidden");
    document.getElementById("schedule-counter").textContent = `${
      currentScheduleIndex + 1
    } of ${generatedSchedules.length}`;

    renderStep2_SelectSections();
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
