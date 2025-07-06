let calendar;

/**
 * Initializes the FullCalendar instance.
 */
function initializeCalendar() {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "timeGridWeek",
    headerToolbar: false, // We use a custom header
    slotMinTime: "07:00:00",
    slotMaxTime: "22:00:00",
    allDaySlot: false,
    hiddenDays: [0], // Hide Sunday
    events: [],
    eventColor: "#3B82F6",
    eventDisplay: "block",
    eventTimeFormat: {
      hour: "numeric",
      minute: "2-digit",
      meridiem: "short",
    },
    // Make calendar height responsive
    height: "100%",
    // Set the first day of the week to Monday
    firstDay: 1,
  });
  calendar.render();
}

/**
 * Parses a course section object into FullCalendar event objects.
 * @param {object} course - The course section object from the data.
 * @returns {Array} - An array of FullCalendar event objects.
 */
function parseCourseToEvents(course) {
  const timeStr = course.Time;
  if (!timeStr || String(timeStr).toLowerCase().includes("tba")) return [];

  const daysMap = { M: 1, T: 2, W: 3, TH: 4, F: 5, S: 6, H: 4 }; // H is for TH
  const courseEvents = [];

  // Regex to find day abbreviations (including multi-day like 'TH', 'MWF')
  const dayTimeParts = String(timeStr)
    .split(";")
    .map((s) => s.trim());

  dayTimeParts.forEach((part) => {
    const timeMatch = part.match(/(\d{1,2}):?(\d{2})\s*-\s*(\d{1,2}):?(\d{2})/);
    if (!timeMatch) return;

    const startTime = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
    const endTime = `${timeMatch[3].padStart(2, "0")}:${timeMatch[4]}`;

    const dayStrMatch = part.match(/^([A-Z]+)/);
    if (!dayStrMatch) return;

    const dayStr = dayStrMatch[1];
    const days = [];

    // Handle multi-day strings like "MWF" or "TTH"
    let i = 0;
    while (i < dayStr.length) {
      if (dayStr[i] === "T" && i + 1 < dayStr.length && dayStr[i + 1] === "H") {
        days.push(daysMap["TH"]);
        i += 2;
      } else if (daysMap[dayStr[i]]) {
        days.push(daysMap[dayStr[i]]);
        i += 1;
      } else {
        i += 1; // Skip unknown characters
      }
    }

    days.forEach((day) => {
      if (day) {
        courseEvents.push({
          id: `${course["Subject Code"]}-${course.Section}`, // Unique ID for the event
          title: `${course["Subject Code"]} (${course.Section})`,
          description: course["Course Title"],
          startTime: startTime,
          endTime: endTime,
          daysOfWeek: [day],
          extendedProps: {
            instructor: course.Instructor,
            room: course.Room,
            courseId: course["Subject Code"],
            section: course.Section,
          },
          // Assign a color based on the course code for better visual distinction
          backgroundColor: stringToColor(course["Subject Code"]),
          borderColor: stringToColor(course["Subject Code"]),
        });
      }
    });
  });

  return courseEvents;
}

/**
 * Displays a full schedule on the calendar, removing all previous events.
 * @param {Array} schedule - An array of course section objects.
 */
export function displaySchedule(schedule) {
  if (!calendar) return;
  clearCalendar();
  const events = schedule.flatMap((course) => parseCourseToEvents(course));
  calendar.addEventSource(events);
}

/**
 * Adds a single course section to the calendar.
 * @param {object} course - The course section object.
 */
export function addEventToCalendar(course) {
  if (!calendar) return;
  const events = parseCourseToEvents(course);
  events.forEach((event) => calendar.addEvent(event));
}

/**
 * Removes a course section from the calendar by its ID.
 * @param {string} eventId - The unique ID of the event to remove.
 */
export function removeEventFromCalendar(eventId) {
  if (!calendar) return;
  const event = calendar.getEventById(eventId);
  if (event) {
    event.remove();
  }
}

/**
 * Removes all events from the calendar.
 */
export function clearCalendar() {
  if (calendar) {
    calendar.getEvents().forEach((event) => event.remove());
  }
}

/**
 * Generates a consistent color from a string.
 * @param {string} str - The input string (e.g., course code).
 * @returns {string} - A hex color code.
 */
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    let value = (hash >> (i * 8)) & 0xff;
    // Make colors less saturated and brighter for better readability
    value = Math.floor((value + 255) / 2);
    color += ("00" + value.toString(16)).substr(-2);
  }
  return color;
}

// Initialize calendar on DOM ready
document.addEventListener("DOMContentLoaded", initializeCalendar);
