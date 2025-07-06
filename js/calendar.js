let calendar;

document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "timeGridWeek",
    headerToolbar: false, // We are using custom controls now
    slotMinTime: "07:00:00",
    slotMaxTime: "22:00:00",
    allDaySlot: false,
    hiddenDays: [0], // Hide Sunday
    events: [],
    eventColor: "#3B82F6", // Default blue color
    eventDisplay: "block",
    eventTimeFormat: {
      hour: "numeric",
      minute: "2-digit",
      meridiem: "short",
    },
  });
  calendar.render();
});

export function displaySchedule(schedule) {
  if (!calendar) return;

  const events = schedule.flatMap((course) => {
    return parseCourseToEvents(course);
  });

  calendar.removeAllEvents();
  calendar.addEventSource(events);
}

export function addEventToCalendar(course) {
  if (!calendar) return;
  const events = parseCourseToEvents(course);
  events.forEach((event) => calendar.addEvent(event));
}

export function removeEventFromCalendar(eventId) {
  if (!calendar) return;
  const event = calendar.getEventById(eventId);
  if (event) event.remove();
}

function parseCourseToEvents(course) {
  const timeStr = course.Time;
  if (!timeStr || timeStr.toLowerCase().includes("tba")) return [];

  const daysMap = { M: 1, T: 2, W: 3, TH: 4, F: 5, SAT: 6 };
  const parts = timeStr.split("(")[0].trim().split(";");
  const courseEvents = [];

  parts.forEach((part) => {
    const timeMatch = part.match(/(\d{2})(\d{2})-(\d{2})(\d{2})/);
    if (!timeMatch) return;

    const startHour = timeMatch[1];
    const startMinute = timeMatch[2];
    const endHour = timeMatch[3];
    const endMinute = timeMatch[4];
    const dayStr = part.replace(timeMatch[0].trim(), "").trim();

    let days = [];
    if (dayStr.includes("-")) {
      const [startDay, endDay] = dayStr.split("-");
      const dayKeys = Object.keys(daysMap);
      const startDayIndex = dayKeys.indexOf(startDay);
      const endDayIndex = dayKeys.indexOf(endDay);
      if (startDayIndex !== -1 && endDayIndex !== -1) {
        for (let i = startDayIndex; i <= endDayIndex; i++) {
          days.push(daysMap[dayKeys[i]]);
        }
      }
    } else {
      days = [daysMap[dayStr]];
    }

    days.forEach((day) => {
      if (day) {
        courseEvents.push({
          id: `${course["Subject Code"]}-${course.Section}`,
          title: `${course["Subject Code"]} (${course.Section})`,
          description: course["Course Title"],
          startTime: `${startHour}:${startMinute}`,
          endTime: `${endHour}:${endMinute}`,
          daysOfWeek: [day],
          extendedProps: {
            instructor: course.Instructor,
            room: course.Room,
          },
        });
      }
    });
  });
  return courseEvents;
}

export function clearCalendar() {
  if (calendar) {
    calendar.removeAllEvents();
  }
}
