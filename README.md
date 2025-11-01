# UniAttend – Attendance Tracker

A lightweight, single-page web application for university students to monitor attendance across multiple subjects. UniAttend keeps your lecture log organised, visualises attendance trends, and lets you stay on top of required minimum percentages with a customisable absence allowance.

## Features

- **Multiple subjects** – add any number of subjects with optional codes.
- **Date-wise lecture log** – add lectures per subject and view them sorted automatically by most recent date.
- **Quick status updates** – one-click Present/Absent buttons and pending state for newly added lectures.
- **Attendance insights** – live attendance percentage, total attended count, and how many more lectures you can miss before the selected subject hits its limit.
- **Custom subject limits** – set how many lectures you can skip for each subject before risking a shortage.
- **Built-in safeguards** – UniAttend blocks additional absences once a subject reaches its configured limit, so you never overshoot unintentionally.
- **Dedicated admin console** – manage subjects, lecture schedules, and allowance caps from a private portal while students only mark their attendance.
- **Local persistence** – all data is stored in your browser, so your plan survives refreshes.
- **Responsive, aesthetic UI** – modern glassmorphism styling that stays crisp on desktops, tablets, and phones.

## Getting Started

1. Open `index.html` in your preferred browser to access the student-facing tracker (no build step required).
2. To manage the timetable, open `admin.html`, enter the passcode `admin123`, and unlock the admin console.
3. Add subjects from the left panel, then log lecture dates with optional notes for each one inside the admin console.
4. Adjust each subject's "Subject absence limit" from the admin console to enforce your attendance policy.
5. Lock the console when you finish; students can continue marking lectures as Present/Absent from `index.html` without seeing admin tools.

> Tip: Entries are saved to local storage. Clear your browser storage if you want to start over.

## Development

All app logic lives in `scripts/app.js` and uses modern ES modules. Styling is handled in `styles.css`. Feel free to fork and extend with additional analytics or export options.
