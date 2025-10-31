# UniAttend – Attendance Tracker

A lightweight, single-page web application for university students to monitor attendance across multiple subjects. UniAttend keeps your lecture log organised, visualises attendance trends, and lets you stay on top of required minimum percentages with a customisable absence allowance.

## Features

- **Multiple subjects** – add any number of subjects with optional codes.
- **Date-wise lecture log** – add lectures per subject and view them sorted automatically by most recent date.
- **Quick status updates** – one-click Present/Absent buttons and pending state for newly added lectures.
- **Attendance insights** – live attendance percentage, total attended count, and how many more lectures you can miss before the selected subject hits its limit.
- **Custom subject limits** – set how many lectures you can skip for each subject before risking a shortage.
- **Built-in safeguards** – UniAttend blocks additional absences once a subject reaches its configured limit, so you never overshoot unintentionally.
- **Admin-managed timetable** – switch into Admin Mode to create subjects, schedule lectures, or tidy up logs while students simply mark their status.
- **Pixel attendance companion** – a customisable mascot that reacts to each subject’s attendance and unlocks new palettes and accessories as you stay on track.
- **Local persistence** – all data is stored in your browser, so your plan survives refreshes.
- **Responsive, aesthetic UI** – modern glassmorphism styling that stays crisp on desktops, tablets, and phones.

## Getting Started

1. Open `index.html` in your preferred browser (no build step required).
2. Click **Enter Admin Mode** in the header and use the passcode `admin123` to unlock timetable controls.
3. Add your subjects from the left panel, then log lecture dates with optional notes for each one.
4. Exit Admin Mode when you’re done scheduling; students can still mark lectures as Present/Absent without admin access.
5. Select a subject and adjust its "Subject absence limit" control to fit your university's policy.
6. Visit the attendance companion card to tweak the mascot’s palette or accessories—new options appear as your attendance improves.

> Tip: Entries are saved to local storage. Clear your browser storage if you want to start over.

## Development

All app logic lives in `scripts/app.js` and uses modern ES modules. Styling is handled in `styles.css`. Feel free to fork and extend with additional analytics or export options.
