let calendar;

document.addEventListener("DOMContentLoaded", function () {
  const calendarEl = document.getElementById("calendar");
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "timeGridWeek",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "timeGridWeek,timeGridDay",
    },
    slotMinTime: "07:00:00",
    slotMaxTime: "22:00:00",
    allDaySlot: false,
    events: [],
  });
  calendar.render();
});

export function displaySchedule(schedule) {
  if (!calendar) return;

  const events = schedule.flatMap((course) => {
    const timeStr = course.Time;
    if (!timeStr || timeStr.toLowerCase().includes("tba")) {
      return [];
    }

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
      const days = dayStr.split("-").flatMap((d) => {
        if (daysMap[d]) return [daysMap[d]];
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
        courseEvents.push({
          title: `${course["Subject Code"]} - ${course["Course Title"]}`,
          startTime: `${startHour}:${startMinute}`,
          endTime: `${endHour}:${endMinute}`,
          daysOfWeek: [day],
          extendedProps: {
            section: course.Section,
            instructor: course.Instructor,
            room: course.Room,
          },
        });
      });
    });
    return courseEvents;
  });

  calendar.removeAllEvents();
  calendar.addEventSource(events);
}

export function clearCalendar() {
  if (calendar) {
    calendar.removeAllEvents();
  }
}
