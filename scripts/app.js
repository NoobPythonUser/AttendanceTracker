const STORAGE_KEY = 'uniAttendState_v1';
const DEFAULT_MAX_ABSENCES = 3;
const ADMIN_PASSCODE = 'admin123';

const MASCOT_DEFAULT = {
    palette: 'ember',
    accessory: 'none',
};

const MASCOT_PALETTES = [
    {
        value: 'ember',
        label: 'Ember & Cream',
        hint: 'Available by default.',
        unlock: () => true,
    },
    {
        value: 'dawn',
        label: 'Dawn Blush',
        hint: 'Reach 75% attendance in a subject to unlock.',
        unlock: (stats) => Boolean(stats) && stats.percentage >= 75,
    },
    {
        value: 'forest',
        label: 'Forest Walk',
        hint: 'Hold 85% attendance across at least 4 logged lectures.',
        unlock: (stats) => Boolean(stats) && stats.percentage >= 85 && stats.total >= 4,
    },
    {
        value: 'midnight',
        label: 'Midnight Scholar',
        hint: 'Maintain a perfect record across 5 or more lectures.',
        unlock: (stats) => Boolean(stats) && stats.total >= 5 && stats.absent === 0,
    },
];

const MASCOT_ACCESSORIES = [
    {
        value: 'none',
        label: 'None',
        hint: 'Available by default.',
        unlock: () => true,
    },
    {
        value: 'cap',
        label: 'Scholar Cap',
        hint: 'Reach 80% attendance in the selected subject.',
        unlock: (stats) => Boolean(stats) && stats.percentage >= 80,
    },
    {
        value: 'scarf',
        label: 'Cozy Scarf',
        hint: 'Reach 90% attendance to unlock this accessory.',
        unlock: (stats) => Boolean(stats) && stats.percentage >= 90,
    },
];

function getMaxAbsences(subject = null) {
    if (!subject) {
        return state.defaultMaxAbsences ?? DEFAULT_MAX_ABSENCES;
    }
    return typeof subject.maxAbsences === 'number'
        ? subject.maxAbsences
        : state.defaultMaxAbsences ?? DEFAULT_MAX_ABSENCES;
}

const elements = {
    subjectForm: document.getElementById('subject-form'),
    subjectName: document.getElementById('subject-name'),
    subjectCode: document.getElementById('subject-code'),
    subjectList: document.getElementById('subject-list'),
    lectureForm: document.getElementById('lecture-form'),
    lectureDate: document.getElementById('lecture-date'),
    lectureTopic: document.getElementById('lecture-topic'),
    lectureList: document.getElementById('lecture-list'),
    detailWrapper: document.getElementById('detail-wrapper'),
    emptyState: document.getElementById('empty-state'),
    detailTitle: document.getElementById('detail-title'),
    detailCode: document.getElementById('detail-code'),
    attendancePercent: document.getElementById('attendance-percent'),
    lecturesAttended: document.getElementById('lectures-attended'),
    remainingAllowance: document.getElementById('remaining-allowance'),
    maxAbsences: document.getElementById('max-absences'),
    applyMax: document.getElementById('apply-max'),
    limitWarning: document.getElementById('limit-warning'),
    adminToggle: document.getElementById('admin-toggle'),
    adminStatus: document.getElementById('admin-status'),
    subjectLockNote: document.getElementById('subject-lock-note'),
    lectureLockNote: document.getElementById('lecture-lock-note'),
    mascotCharacter: document.getElementById('mascot-character'),
    mascotMessage: document.getElementById('mascot-message'),
    mascotPalette: document.getElementById('mascot-palette'),
    mascotAccessory: document.getElementById('mascot-accessory'),
};

const templates = {
    subject: document.getElementById('subject-template'),
    lecture: document.getElementById('lecture-template'),
};

let state = loadState();
if (typeof state.defaultMaxAbsences !== 'number') {
    state.defaultMaxAbsences = DEFAULT_MAX_ABSENCES;
}
if (!Array.isArray(state.subjects)) {
    state.subjects = [];
}
if (!state.mascot) {
    state.mascot = { ...MASCOT_DEFAULT };
}
let selectedSubjectId = state.subjects[0]?.id ?? null;
let isAdmin = false;

function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normaliseMascotConfig(input) {
    const paletteValues = new Set(MASCOT_PALETTES.map((option) => option.value));
    const accessoryValues = new Set(MASCOT_ACCESSORIES.map((option) => option.value));

    if (!input || typeof input !== 'object') {
        return { ...MASCOT_DEFAULT };
    }

    return {
        palette: paletteValues.has(input.palette) ? input.palette : MASCOT_DEFAULT.palette,
        accessory: accessoryValues.has(input.accessory) ? input.accessory : MASCOT_DEFAULT.accessory,
    };
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            const defaultMaxAbsences =
                typeof parsed.defaultMaxAbsences === 'number'
                    ? parsed.defaultMaxAbsences
                    : typeof parsed.maxAbsences === 'number'
                      ? parsed.maxAbsences
                      : DEFAULT_MAX_ABSENCES;

            const subjects = Array.isArray(parsed.subjects)
                ? parsed.subjects.map((subject) => ({
                      ...subject,
                      lectures: Array.isArray(subject.lectures) ? subject.lectures : [],
                      maxAbsences:
                          typeof subject.maxAbsences === 'number'
                              ? subject.maxAbsences
                              : defaultMaxAbsences,
                  }))
                : [];

            const mascot = normaliseMascotConfig(parsed.mascot);

            return {
                defaultMaxAbsences,
                subjects,
                mascot,
            };
        } catch (error) {
            console.error('Failed to load attendance state', error);
        }
    }
    return {
        defaultMaxAbsences: DEFAULT_MAX_ABSENCES,
        subjects: [],
        mascot: { ...MASCOT_DEFAULT },
    };
}

function persistState() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            defaultMaxAbsences: state.defaultMaxAbsences,
            subjects: state.subjects,
            mascot: state.mascot,
        }),
    );
}

function createSubject(name, code) {
    return {
        id: generateId(),
        name,
        code,
        lectures: [],
        maxAbsences: getMaxAbsences(),
    };
}

function createLecture(date, topic) {
    return {
        id: generateId(),
        date,
        topic,
        status: 'pending',
    };
}

function formatDate(dateString) {
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(dateString));
}

function calculateStats(subject) {
    if (!subject) {
        return {
            total: 0,
            attended: 0,
            percentage: 0,
            remainingAllowance: getMaxAbsences(),
            maxAbsences: getMaxAbsences(),
            absent: 0,
        };
    }

    const maxAbsences = getMaxAbsences(subject);
    const total = subject.lectures.length;
    const attended = subject.lectures.filter((lecture) => lecture.status === 'present').length;
    const absent = subject.lectures.filter((lecture) => lecture.status === 'absent').length;
    const percentage = total === 0 ? 0 : Math.round((attended / total) * 100);
    const remainingAllowance = Math.max(maxAbsences - absent, 0);

    return { total, attended, percentage, remainingAllowance, maxAbsences, absent };
}

function sortLectures(lectures) {
    return [...lectures].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderSubjects() {
    elements.subjectList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    state.subjects.forEach((subject) => {
        const subjectNode = templates.subject.content.cloneNode(true);
        const card = subjectNode.querySelector('.subject-card');
        const selectButton = subjectNode.querySelector('.subject-select');
        const title = subjectNode.querySelector('.subject-title');
        const code = subjectNode.querySelector('.subject-code');
        const percent = subjectNode.querySelector('.subject-percent');
        const progressFill = subjectNode.querySelector('.progress-fill');
        const deleteBtn = subjectNode.querySelector('.delete-subject');

        title.textContent = subject.name;
        code.textContent = subject.code || 'No code';

        const stats = calculateStats(subject);
        percent.textContent = `${stats.percentage}%`;
        progressFill.style.width = `${stats.percentage}%`;

        if (subject.id === selectedSubjectId) {
            card.classList.add('active');
        }

        deleteBtn.classList.toggle('hidden', !isAdmin);
        deleteBtn.disabled = !isAdmin;
        if (!isAdmin) {
            deleteBtn.setAttribute('aria-hidden', 'true');
        } else {
            deleteBtn.removeAttribute('aria-hidden');
        }

        selectButton.addEventListener('click', () => {
            selectedSubjectId = subject.id;
            render();
        });

        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            if (!isAdmin) {
                alert('Admin access required to delete subjects.');
                return;
            }
            const confirmed = confirm(`Delete subject "${subject.name}"? All lectures will be lost.`);
            if (!confirmed) return;
            state.subjects = state.subjects.filter((s) => s.id !== subject.id);
            if (selectedSubjectId === subject.id) {
                selectedSubjectId = state.subjects[0]?.id ?? null;
            }
            persistState();
            render();
        });

        fragment.appendChild(subjectNode);
    });

    elements.subjectList.appendChild(fragment);
}

function renderSubjectDetail() {
    const subject = state.subjects.find((item) => item.id === selectedSubjectId);
    if (!subject) {
        elements.emptyState.classList.remove('hidden');
        elements.detailWrapper.classList.add('hidden');
        elements.limitWarning.classList.add('hidden');
        updateMascot(null, null);
        return;
    }

    elements.emptyState.classList.add('hidden');
    elements.detailWrapper.classList.remove('hidden');

    elements.detailTitle.textContent = subject.name;
    elements.detailCode.textContent = subject.code || 'No subject code';

    const stats = calculateStats(subject);
    const { attended, percentage, remainingAllowance, maxAbsences, absent } = stats;
    elements.attendancePercent.textContent = `${percentage}%`;
    elements.lecturesAttended.textContent = `${attended}/${subject.lectures.length}`;
    elements.remainingAllowance.textContent = `${remainingAllowance} of ${maxAbsences}`;

    const totalAbsences = absent;

    if (remainingAllowance === 0) {
        const overLimit = Math.max(totalAbsences - maxAbsences, 0);
        if (maxAbsences === 0) {
            elements.limitWarning.textContent = `Absence limit for ${subject.name} is set to zero. You will need to attend every lecture.`;
        } else if (overLimit > 0) {
            const lectureWord = overLimit === 1 ? 'lecture' : 'lectures';
            elements.limitWarning.textContent = `Absence limit exceeded by ${overLimit} ${lectureWord}. Mark ${overLimit} ${lectureWord} as present to regain allowance.`;
        } else {
            elements.limitWarning.textContent = `Absence limit reached for ${subject.name}. Mark a lecture as present to regain allowance.`;
        }
        elements.limitWarning.classList.remove('hidden');
    } else {
        elements.limitWarning.classList.add('hidden');
    }

    updateMascot(subject, stats);

    elements.lectureList.innerHTML = '';

    const sortedLectures = sortLectures(subject.lectures);
    const subjectMaxAbsences = maxAbsences;
    const fragment = document.createDocumentFragment();

    sortedLectures.forEach((lecture) => {
        const lectureNode = templates.lecture.content.cloneNode(true);
        lectureNode.querySelector('.lecture-date').textContent = formatDate(lecture.date);
        lectureNode.querySelector('.lecture-topic').textContent = lecture.topic || '—';

        const statusEl = lectureNode.querySelector('.lecture-status');
        statusEl.textContent = lecture.status === 'pending' ? 'Pending' : lecture.status === 'present' ? 'Present' : 'Absent';
        statusEl.classList.toggle('present', lecture.status === 'present');
        statusEl.classList.toggle('absent', lecture.status === 'absent');

        const presentButton = lectureNode.querySelector('.present-button');
        const absentButton = lectureNode.querySelector('.absent-button');
        const deleteBtn = lectureNode.querySelector('.delete-lecture');

        presentButton.addEventListener('click', () => {
            lecture.status = 'present';
            persistState();
            render();
        });

        absentButton.addEventListener('click', () => {
            if (lecture.status === 'absent') {
                return;
            }

            const currentAbsences = subject.lectures.filter((item) => item.status === 'absent').length;
            const limit = getMaxAbsences(subject);
            if (currentAbsences >= limit) {
                alert('Absence limit reached for this subject. Mark a lecture as present before adding more absences.');
                return;
            }

            lecture.status = 'absent';
            persistState();
            render();
        });

        deleteBtn.addEventListener('click', () => {
            if (!isAdmin) {
                alert('Admin access required to delete lectures.');
                return;
            }
            const confirmed = confirm('Delete this lecture entry?');
            if (!confirmed) return;
            subject.lectures = subject.lectures.filter((l) => l.id !== lecture.id);
            persistState();
            render();
        });

        const absencesIfMarked = totalAbsences + (lecture.status === 'absent' ? 0 : 1);
        const limitReachedForRow = lecture.status !== 'absent' && absencesIfMarked > subjectMaxAbsences;
        absentButton.disabled = limitReachedForRow;
        if (limitReachedForRow) {
            absentButton.title = 'Absence limit reached';
        } else {
            absentButton.removeAttribute('title');
        }

        fragment.appendChild(lectureNode);
    });

    if (sortedLectures.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-lectures';
        empty.textContent = 'No lectures added yet. Add one to start tracking!';
        fragment.appendChild(empty);
    }

    elements.lectureList.appendChild(fragment);
}

function getMascotMood(stats) {
    if (!stats || stats.total === 0) {
        return 'neutral';
    }
    if (stats.remainingAllowance === 0 || stats.percentage < 70) {
        return 'concerned';
    }
    if (stats.percentage >= 85) {
        return 'happy';
    }
    return 'calm';
}

function getMascotMessage(subject, stats) {
    if (!subject) {
        return 'Select a subject to meet your companion.';
    }
    if (!stats || stats.total === 0) {
        return `No lectures logged for ${subject.name} yet. Let's build the timetable together.`;
    }
    if (stats.remainingAllowance === 0) {
        return `Limit reached in ${subject.name}. Attend the next lecture to regain allowance.`;
    }
    if (stats.percentage >= 90) {
        const allowanceWord = stats.remainingAllowance === 1 ? 'lecture' : 'lectures';
        return `Stellar streak! You can still miss ${stats.remainingAllowance} ${allowanceWord} in ${subject.name}.`;
    }
    if (stats.percentage >= 75) {
        return `${subject.name} attendance looks strong. Keep the rhythm going!`;
    }
    return `Absences are adding up in ${subject.name}. Let's aim to attend the next session.`;
}

function applyMascotAppearance() {
    const { palette, accessory } = state.mascot;

    MASCOT_PALETTES.forEach((option) => {
        elements.mascotCharacter.classList.remove(`palette-${option.value}`);
    });
    MASCOT_ACCESSORIES.forEach((option) => {
        elements.mascotCharacter.classList.remove(`accessory-${option.value}`);
    });

    elements.mascotCharacter.classList.add(`palette-${palette}`);
    elements.mascotCharacter.classList.add(`accessory-${accessory}`);

    if (elements.mascotPalette.value !== palette) {
        elements.mascotPalette.value = palette;
    }
    if (elements.mascotAccessory.value !== accessory) {
        elements.mascotAccessory.value = accessory;
    }
}

function ensureMascotSelectionValidity(stats) {
    const paletteConfig = MASCOT_PALETTES.find((option) => option.value === state.mascot.palette);
    const accessoryConfig = MASCOT_ACCESSORIES.find((option) => option.value === state.mascot.accessory);

    let updated = false;

    if (!paletteConfig || !paletteConfig.unlock(stats)) {
        state.mascot.palette = MASCOT_DEFAULT.palette;
        updated = true;
    }

    if (!accessoryConfig || !accessoryConfig.unlock(stats)) {
        state.mascot.accessory = MASCOT_DEFAULT.accessory;
        updated = true;
    }

    if (updated) {
        persistState();
    }
}

function updateMascotCustomizationControls(subject, stats) {
    const hasSubject = Boolean(subject);
    const contextStats = hasSubject ? stats : null;

    elements.mascotPalette.disabled = !hasSubject;
    elements.mascotAccessory.disabled = !hasSubject;

    const lockedTitle = 'Select a subject to customise your companion.';
    elements.mascotPalette.title = hasSubject ? 'Change your companion\'s palette.' : lockedTitle;
    elements.mascotAccessory.title = hasSubject ? 'Choose an accessory for your companion.' : lockedTitle;

    ensureMascotSelectionValidity(contextStats);

    Array.from(elements.mascotPalette.options).forEach((optionEl) => {
        const config = MASCOT_PALETTES.find((item) => item.value === optionEl.value);
        if (!config) return;
        const unlocked = config.unlock(contextStats);
        optionEl.disabled = !unlocked;
        optionEl.textContent = unlocked ? config.label : `${config.label} 🔒`;
        optionEl.title = unlocked ? 'Unlocked' : config.hint;
    });

    Array.from(elements.mascotAccessory.options).forEach((optionEl) => {
        const config = MASCOT_ACCESSORIES.find((item) => item.value === optionEl.value);
        if (!config) return;
        const unlocked = config.unlock(contextStats);
        optionEl.disabled = !unlocked;
        optionEl.textContent = unlocked ? config.label : `${config.label} 🔒`;
        optionEl.title = unlocked ? 'Unlocked' : config.hint;
    });

    applyMascotAppearance();
}

function updateMascot(subject, stats) {
    const mood = getMascotMood(stats);
    const moodDescriptions = {
        happy: 'is looking upbeat',
        calm: 'seems relaxed',
        concerned: 'looks concerned',
        neutral: 'is waiting to get started',
    };

    updateMascotCustomizationControls(subject, stats);

    const moodClasses = ['mood-happy', 'mood-calm', 'mood-concerned', 'mood-neutral'];
    moodClasses.forEach((className) => elements.mascotCharacter.classList.remove(className));
    elements.mascotCharacter.classList.add(`mood-${mood}`);

    const message = getMascotMessage(subject, stats);
    elements.mascotMessage.textContent = message;
    elements.mascotCharacter.setAttribute('aria-label', `Attendance companion ${moodDescriptions[mood] ?? ''}.`);
}

function populateMascotOptions() {
    elements.mascotPalette.innerHTML = '';
    elements.mascotAccessory.innerHTML = '';

    const paletteFragment = document.createDocumentFragment();
    MASCOT_PALETTES.forEach((palette) => {
        const option = document.createElement('option');
        option.value = palette.value;
        option.textContent = palette.label;
        paletteFragment.appendChild(option);
    });
    elements.mascotPalette.appendChild(paletteFragment);

    const accessoryFragment = document.createDocumentFragment();
    MASCOT_ACCESSORIES.forEach((accessory) => {
        const option = document.createElement('option');
        option.value = accessory.value;
        option.textContent = accessory.label;
        accessoryFragment.appendChild(option);
    });
    elements.mascotAccessory.appendChild(accessoryFragment);

    applyMascotAppearance();
}

function setFormEnabled(form, enabled) {
    if (!form) return;
    const fields = form.querySelectorAll('input, button, select, textarea');
    fields.forEach((field) => {
        field.disabled = !enabled;
    });
    form.classList.toggle('locked', !enabled);
}

function applyAdminPermissions(subject) {
    setFormEnabled(elements.subjectForm, isAdmin);
    setFormEnabled(elements.lectureForm, isAdmin);

    if (elements.subjectLockNote) {
        elements.subjectLockNote.textContent = isAdmin
            ? 'Admin mode active — you can add or remove subjects.'
            : 'Admin access required to add or remove subjects.';
    }

    if (elements.lectureLockNote) {
        if (!subject) {
            elements.lectureLockNote.textContent = isAdmin
                ? 'Select a subject to start building its timetable.'
                : 'Select a subject to view its timetable.';
        } else {
            elements.lectureLockNote.textContent = isAdmin
                ? `Admin mode active — add lectures to ${subject.name}\'s timetable.`
                : 'Lecture scheduling is managed by administrators.';
        }
    }
}

function updateAdminIndicator() {
    if (!elements.adminToggle || !elements.adminStatus) return;
    elements.adminToggle.textContent = isAdmin ? 'Exit Admin Mode' : 'Enter Admin Mode';
    elements.adminToggle.setAttribute('aria-pressed', String(isAdmin));
    elements.adminStatus.textContent = isAdmin ? 'Admin mode active' : 'Student view';
    elements.adminStatus.classList.toggle('active', isAdmin);
}

function handleAdminToggle() {
    if (isAdmin) {
        isAdmin = false;
        render();
        return;
    }

    const attempt = prompt('Enter the admin passcode to manage subjects and timetables:');
    if (attempt === null) {
        return;
    }

    if (attempt.trim() === ADMIN_PASSCODE) {
        isAdmin = true;
        render();
    } else {
        alert('Incorrect passcode.');
    }
}

function onMascotPaletteChange() {
    const subject = state.subjects.find((item) => item.id === selectedSubjectId);
    const stats = subject ? calculateStats(subject) : null;
    const value = elements.mascotPalette.value;
    const config = MASCOT_PALETTES.find((option) => option.value === value);

    if (!config || !config.unlock(stats)) {
        ensureMascotSelectionValidity(stats);
        applyMascotAppearance();
        return;
    }

    state.mascot.palette = value;
    persistState();
    applyMascotAppearance();
    updateMascot(subject, stats);
}

function onMascotAccessoryChange() {
    const subject = state.subjects.find((item) => item.id === selectedSubjectId);
    const stats = subject ? calculateStats(subject) : null;
    const value = elements.mascotAccessory.value;
    const config = MASCOT_ACCESSORIES.find((option) => option.value === value);

    if (!config || !config.unlock(stats)) {
        ensureMascotSelectionValidity(stats);
        applyMascotAppearance();
        return;
    }

    state.mascot.accessory = value;
    persistState();
    applyMascotAppearance();
    updateMascot(subject, stats);
}

function updateMaxAbsenceControls(subject) {
    const hasSubject = Boolean(subject);
    elements.maxAbsences.disabled = !hasSubject;
    elements.applyMax.disabled = !hasSubject;

    if (hasSubject) {
        elements.maxAbsences.title = `Set how many lectures you can miss in ${subject.name}`;
        elements.applyMax.title = `Save the absence limit for ${subject.name}`;
    } else {
        elements.maxAbsences.title = 'Select a subject to set its absence limit';
        elements.applyMax.title = 'Select a subject first';
    }
}

function render() {
    updateAdminIndicator();
    const subject = state.subjects.find((item) => item.id === selectedSubjectId);
    const maxAbsencesValue = getMaxAbsences(subject);
    elements.maxAbsences.value = maxAbsencesValue;
    updateMaxAbsenceControls(subject);
    renderSubjects();
    renderSubjectDetail();
    const refreshedSubject = state.subjects.find((item) => item.id === selectedSubjectId);
    applyAdminPermissions(refreshedSubject);
}

function onAddSubject(event) {
    event.preventDefault();
    if (!isAdmin) {
        alert('Admin access required to add subjects.');
        return;
    }
    const name = elements.subjectName.value.trim();
    const code = elements.subjectCode.value.trim();

    if (!name) return;

    const subject = createSubject(name, code);
    state.subjects.push(subject);
    selectedSubjectId = subject.id;
    persistState();
    render();

    elements.subjectForm.reset();
}

function lectureDateExists(subject, date) {
    return subject.lectures.some((lecture) => lecture.date === date);
}

function onAddLecture(event) {
    event.preventDefault();
    if (!isAdmin) {
        alert('Only administrators can add lectures to the timetable.');
        return;
    }
    const subject = state.subjects.find((item) => item.id === selectedSubjectId);
    if (!subject) return;

    const date = elements.lectureDate.value;
    if (!date) return;

    if (lectureDateExists(subject, date)) {
        alert('A lecture for this date already exists.');
        return;
    }

    const topic = elements.lectureTopic.value.trim();
    const lecture = createLecture(date, topic);
    subject.lectures.push(lecture);
    persistState();
    render();

    elements.lectureForm.reset();
}

function onApplyMaxAbsences() {
    const value = parseInt(elements.maxAbsences.value, 10);
    if (Number.isNaN(value) || value < 0) {
        alert('Please enter a valid number greater than or equal to 0.');
        render();
        return;
    }
    const subject = state.subjects.find((item) => item.id === selectedSubjectId);
    if (!subject) {
        render();
        return;
    }

    subject.maxAbsences = value;
    state.defaultMaxAbsences = value;
    persistState();
    render();
}

function init() {
    populateMascotOptions();
    if (elements.adminToggle) {
        elements.adminToggle.addEventListener('click', handleAdminToggle);
    }
    elements.subjectForm.addEventListener('submit', onAddSubject);
    elements.lectureForm.addEventListener('submit', onAddLecture);
    elements.applyMax.addEventListener('click', onApplyMaxAbsences);
    elements.maxAbsences.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            onApplyMaxAbsences();
        }
    });
    if (elements.mascotPalette) {
        elements.mascotPalette.addEventListener('change', onMascotPaletteChange);
    }
    if (elements.mascotAccessory) {
        elements.mascotAccessory.addEventListener('change', onMascotAccessoryChange);
    }
    render();
}

init();
