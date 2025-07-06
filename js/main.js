import {
  displaySchedule,
  clearCalendar,
  addEventToCalendar,
  removeEventFromCalendar,
} from "./calendar.js";

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE MANAGEMENT ---
  let allCoursesData = []; // All course sections from the API
  let uniqueCourses = new Map(); // Map of unique course codes to their info

  // Main state for user's requirements
  let requiredItems = new Map(); // Key: courseCode or groupID, Value: { type, name, priority, courses? }

  // State for selections
  let selectedSections = new Map(); // Key: courseCode or groupID, Value: sectionObject
  let activeSelectionId = null; // The course or group currently being viewed
  let generatedSchedules = [];
  let currentScheduleIndex = 0;

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
      allCoursesData = data.courses;
      processCourseData();
      renderAvailableCourses();
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

  // --- RENDER FUNCTIONS ---

  function renderAvailableCourses(filter = "") {
    availableCoursesList.innerHTML = "";
    const sortedCourses = [...uniqueCourses.values()].sort((a, b) =>
      a.code.localeCompare(b.code)
    );

    const filteredCourses = sortedCourses.filter(
      (course) =>
        course.code.toLowerCase().includes(filter.toLowerCase()) ||
        course.title.toLowerCase().includes(filter.toLowerCase())
    );

    if (filteredCourses.length === 0) {
      availableCoursesList.innerHTML = `<p class="text-gray-500 text-center">No courses found.</p>`;
      return;
    }

    filteredCourses.forEach((course) => {
      const isSelected = requiredItems.has(course.code);
      const item = document.createElement("div");
      item.className = `available-course-item ${isSelected ? "selected" : ""}`;
      item.dataset.courseCode = course.code;
      item.innerHTML = `
            <div>
                <p class="font-medium">${course.code}</p>
                <p class="text-xs">${course.title}</p>
            </div>
            <i class="fas ${
              isSelected ? "fa-check-circle" : "fa-plus"
            } text-lg"></i>
        `;
      item.addEventListener("click", () => toggleRequiredCourse(course.code));
      availableCoursesList.appendChild(item);
    });
  }

  function renderRequiredItemSections() {
    if (!activeSelectionId) {
      requiredCoursesContainer.innerHTML = `<p class="text-center text-gray-500 pt-8">Select a required course or group to see its sections.</p>`;
      return;
    }

    const item = requiredItems.get(activeSelectionId);
    if (!item) return;

    requiredCoursesContainer.innerHTML = ""; // Clear previous content

    const header = document.createElement("div");
    header.className = "required-course-header";
    header.innerHTML = `
        <div class="flex justify-between items-center">
            <h3 class="font-bold text-lg">${item.name}</h3>
            <button class="text-red-500 hover:text-red-700 remove-item-btn" data-id="${activeSelectionId}" title="Remove this requirement">&times;</button>
        </div>
        <div class="flex items-center gap-2 mt-2">
            <label class="text-xs font-medium">Priority:</label>
            <input type="number" value="${item.priority}" min="1" class="priority-input item-priority-input" data-id="${activeSelectionId}">
            <span class="text-xs text-gray-500">(1 = highest)</span>
        </div>
    `;
    requiredCoursesContainer.appendChild(header);

    const sectionList = document.createElement("div");
    sectionList.className = "space-y-2";

    const sections = getSectionsForId(activeSelectionId);
    const currentlySelectedSection = selectedSections.get(activeSelectionId);

    sections.forEach((section) => {
      const sectionId = `${section["Subject Code"]}-${section.Section}`;
      const isSelected =
        currentlySelectedSection &&
        currentlySelectedSection.Section === section.Section;
      const isConflict = checkForConflict(section, activeSelectionId);

      const sectionDiv = document.createElement("div");
      sectionDiv.className = `section-item ${isSelected ? "selected" : ""} ${
        !isSelected && isConflict ? "conflict" : ""
      }`;
      sectionDiv.dataset.sectionId = sectionId;
      sectionDiv.dataset.courseCode = section["Subject Code"];

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
                <div class="flex items-center gap-3">
                     <label class="text-xs">P:</label>
                     <input type="number" value="${
                       section.priority || 100
                     }" min="1" class="priority-input section-priority-input" title="Section Priority">
                     <input type="checkbox" class="exclude-section-toggle" title="Exclude from auto-scheduling" ${
                       section.excluded ? "checked" : ""
                     }>
                </div>
            </div>
        `;

      if (!isConflict || isSelected) {
        sectionDiv.addEventListener("click", (e) => {
          if (e.target.type === "checkbox" || e.target.type === "number")
            return;
          toggleSectionSelection(item.id, section);
        });
      }

      sectionList.appendChild(sectionDiv);
    });

    requiredCoursesContainer.appendChild(sectionList);
  }

  // --- EVENT HANDLERS & LOGIC ---

  availableCourseSearch.addEventListener("input", (e) =>
    renderAvailableCourses(e.target.value)
  );

  function toggleRequiredCourse(courseCode) {
    if (requiredItems.has(courseCode)) {
      // This part is handled by the remove button now
      return;
    } else {
      const courseInfo = uniqueCourses.get(courseCode);
      requiredItems.set(courseCode, {
        id: courseCode,
        type: "course",
        name: courseCode,
        priority: 100,
      });
    }
    activeSelectionId = courseCode;
    updateActiveSelectionUI();
    renderAvailableCourses(availableCourseSearch.value);
    renderRequiredItemSections();
    updateAutoScheduleButton();
  }

  // Event delegation for dynamically created elements
  requiredCoursesContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-item-btn")) {
      const idToRemove = e.target.dataset.id;
      requiredItems.delete(idToRemove);
      if (selectedSections.has(idToRemove)) {
        const section = selectedSections.get(idToRemove);
        removeEventFromCalendar(
          `${section["Subject Code"]}-${section.Section}`
        );
        selectedSections.delete(idToRemove);
      }
      if (activeSelectionId === idToRemove) {
        activeSelectionId = null;
      }
      updateActiveSelectionUI();
      renderAvailableCourses(availableCourseSearch.value);
      renderRequiredItemSections();
      updateAutoScheduleButton();
    }
  });

  requiredCoursesContainer.addEventListener("change", (e) => {
    if (e.target.classList.contains("item-priority-input")) {
      const id = e.target.dataset.id;
      const priority = parseInt(e.target.value, 10);
      if (requiredItems.has(id)) {
        requiredItems.get(id).priority = priority;
      }
    }
    // Add logic for section priority and exclusion later
  });

  availableCoursesList.addEventListener("click", (e) => {
    const item = e.target.closest(".available-course-item");
    if (!item) return;

    const id = item.dataset.courseCode || item.dataset.groupId;
    if (requiredItems.has(id)) {
      activeSelectionId = id;
      updateActiveSelectionUI();
      renderRequiredItemSections();
    }
  });

  function updateActiveSelectionUI() {
    document
      .querySelectorAll(".available-course-item.active")
      .forEach((el) => el.classList.remove("active"));
    if (activeSelectionId) {
      const activeEl = document.querySelector(
        `[data-course-code="${activeSelectionId}"], [data-group-id="${activeSelectionId}"]`
      );
      if (activeEl) activeEl.classList.add("active");
    }
  }

  function getSectionsForId(id) {
    const item = requiredItems.get(id);
    if (!item) return [];

    let courseCodes = [];
    if (item.type === "group") {
      courseCodes = item.courses;
    } else {
      courseCodes = [item.id];
    }

    return allCoursesData.filter((c) =>
      courseCodes.includes(c["Subject Code"])
    );
  }

  function toggleSectionSelection(itemId, section) {
    const sectionIdentifier = `${section["Subject Code"]}-${section.Section}`;
    const currentlySelected = selectedSections.get(itemId);

    // Deselecting
    if (currentlySelected && currentlySelected.Section === section.Section) {
      selectedSections.delete(itemId);
      removeEventFromCalendar(sectionIdentifier);
    }
    // Selecting a new section
    else {
      // If another section for this item was selected, remove it first
      if (currentlySelected) {
        removeEventFromCalendar(
          `${currentlySelected["Subject Code"]}-${currentlySelected.Section}`
        );
      }
      selectedSections.set(itemId, section);
      addEventToCalendar(section);
    }
    renderRequiredItemSections(); // Re-render to update styles
  }

  function parseTime(timeStr) {
    const [time, meridiem] = timeStr.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (meridiem === "pm" && hours !== 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
    return hours * 60 + minutes;
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

      const start = parseTimeSimple(timeMatch[1], timeMatch[2]);
      const end = parseTimeSimple(timeMatch[3], timeMatch[4]);

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
          i += 1;
        }
      }
    });
    return times;
  }

  function parseTimeSimple(h, m) {
    return parseInt(h, 10) * 60 + parseInt(m, 10);
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
    // Render search results
    groupModalSearchResults.innerHTML = "";
    const filter = groupCourseSearch.value.toLowerCase();
    const sortedCourses = [...uniqueCourses.values()].sort((a, b) =>
      a.code.localeCompare(b.code)
    );

    sortedCourses
      .filter((course) => !tempGroupCourses.has(course.code))
      .filter(
        (course) =>
          course.code.toLowerCase().includes(filter) ||
          course.title.toLowerCase().includes(filter)
      )
      .forEach((course) => {
        const div = document.createElement("div");
        div.className = "p-2 hover:bg-gray-100 cursor-pointer rounded";
        div.textContent = `${course.code} - ${course.title}`;
        div.addEventListener("click", () => {
          tempGroupCourses.set(course.code, course);
          renderGroupModalLists();
        });
        groupModalSearchResults.appendChild(div);
      });

    // Render selected list
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
    });

    // Add group to the top list
    const item = document.createElement("div");
    item.className = "available-course-item selected-group";
    item.dataset.groupId = groupId;
    item.innerHTML = `
        <div>
            <p class="font-medium">${groupName}</p>
            <p class="text-xs">Custom Group</p>
        </div>
        <i class="fas fa-users text-lg"></i>
    `;
    item.addEventListener("click", () => {
      activeSelectionId = groupId;
      updateActiveSelectionUI();
      renderRequiredItemSections();
    });
    availableCoursesList.prepend(item);

    activeSelectionId = groupId;
    updateActiveSelectionUI();
    renderRequiredItemSections();
    updateAutoScheduleButton();
    closeGroupModal();
  });

  // --- AUTO-SCHEDULER LOGIC ---
  autoScheduleBtn.addEventListener("click", runAutoScheduler);

  function runAutoScheduler() {
    clearCalendar();
    selectedSections.clear();

    const requirements = Array.from(requiredItems.values()).sort(
      (a, b) => a.priority - b.priority
    );
    const sectionsByRequirement = new Map();

    requirements.forEach((req) => {
      const sections = getSectionsForId(req.id)
        .filter((s) => !s.excluded) // Filter out excluded sections
        .sort((a, b) => (a.priority || 100) - (b.priority || 100)); // Sort by section priority
      sectionsByRequirement.set(req.id, sections);
    });

    generatedSchedules = [];
    const schedule = new Map(); // Using map for current schedule path

    findSchedules(0, requirements, sectionsByRequirement, schedule);

    if (generatedSchedules.length > 0) {
      currentScheduleIndex = 0;
      displayGeneratedSchedule();
      alert(
        `Successfully generated ${generatedSchedules.length} possible schedules!`
      );
    } else {
      alert(
        "Could not find any valid schedule with the given requirements and constraints."
      );
      // Restore manual selections
      selectedSections.forEach(addEventToCalendar);
    }
  }

  function findSchedules(
    reqIndex,
    requirements,
    sectionsByRequirement,
    currentSchedule
  ) {
    if (reqIndex === requirements.length) {
      generatedSchedules.push(new Map(currentSchedule)); // Found a valid schedule
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
    const scheduleArray = Array.from(scheduleMap.values());
    displaySchedule(scheduleArray);

    document.getElementById("schedule-actions").classList.remove("hidden");
    document.getElementById("schedule-counter").textContent = `${
      currentScheduleIndex + 1
    } of ${generatedSchedules.length}`;
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
