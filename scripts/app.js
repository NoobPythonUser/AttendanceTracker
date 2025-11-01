const STORAGE_KEY = 'uniAttendState_v1';
const DEFAULT_MAX_ABSENCES = 3;
const ADMIN_PASSCODE = 'admin123';
const isAdminPortal = (document.body.dataset.role ?? 'student') === 'admin';

function getMaxAbsences(subject = null) {
    if (!subject) {
        return state.defaultMaxAbsences ?? DEFAULT_MAX_ABSENCES;
    }
    return typeof subject.maxAbsences === 'number'
        ? subject.maxAbsences
        : state.defaultMaxAbsences ?? DEFAULT_MAX_ABSENCES;
}

const elements = {
    appShell: document.querySelector('.app-shell'),
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
    adminLogout: document.getElementById('admin-logout'),
    adminGate: document.getElementById('admin-gate'),
    adminLoginForm: document.getElementById('admin-login-form'),
    adminPasscode: document.getElementById('admin-passcode'),
    adminLoginError: document.getElementById('admin-login-error'),
    subjectLockNote: document.getElementById('subject-lock-note'),
    lectureLockNote: document.getElementById('lecture-lock-note'),
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
let selectedSubjectId = state.subjects[0]?.id ?? null;
let isAdmin = false;

function unlockAdmin() {
    isAdmin = true;
    if (elements.adminGate) {
        elements.adminGate.classList.add('hidden');
        elements.adminGate.setAttribute('aria-hidden', 'true');
    }
    if (elements.appShell) {
        elements.appShell.removeAttribute('aria-hidden');
    }
    if (elements.adminLogout) {
        elements.adminLogout.classList.remove('hidden');
    }
    if (elements.adminLoginError) {
        elements.adminLoginError.classList.add('hidden');
    }
    render();
    if (elements.subjectName) {
        elements.subjectName.focus();
    }
}

function lockAdmin({ focusInput = false, suppressRender = false } = {}) {
    isAdmin = false;
    if (elements.adminGate) {
        elements.adminGate.classList.remove('hidden');
        elements.adminGate.setAttribute('aria-hidden', 'false');
    }
    if (elements.appShell) {
        elements.appShell.setAttribute('aria-hidden', 'true');
    }
    if (elements.adminLogout) {
        elements.adminLogout.classList.add('hidden');
    }
    if (elements.adminPasscode) {
        elements.adminPasscode.value = '';
    }
    if (!suppressRender) {
        render();
    }
    if (focusInput && elements.adminPasscode) {
        elements.adminPasscode.focus();
    }
}

function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

            return {
                defaultMaxAbsences,
                subjects,
            };
        } catch (error) {
            console.error('Failed to load attendance state', error);
        }
    }
    return {
        defaultMaxAbsences: DEFAULT_MAX_ABSENCES,
        subjects: [],
    };
}

function persistState() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
            defaultMaxAbsences: state.defaultMaxAbsences,
            subjects: state.subjects,
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

        deleteBtn.classList.toggle('hidden', !isAdmin);
        deleteBtn.disabled = !isAdmin;
        if (!isAdmin) {
            deleteBtn.setAttribute('aria-hidden', 'true');
        } else {
            deleteBtn.removeAttribute('aria-hidden');
        }

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

function setFormEnabled(form, enabled) {
    if (!form) return;
    const fields = form.querySelectorAll('input, button, select, textarea');
    fields.forEach((field) => {
        field.disabled = !enabled;
    });
    form.classList.toggle('locked', !enabled);
}

function applyAdminPermissions(subject) {
    const canEdit = isAdmin;
    setFormEnabled(elements.subjectForm, canEdit);
    setFormEnabled(elements.lectureForm, canEdit);

    if (elements.subjectLockNote) {
        let message;
        if (canEdit) {
            message = isAdminPortal
                ? 'Console unlocked — you can add or remove subjects.'
                : 'Admin mode active — you can add or remove subjects.';
        } else {
            message = isAdminPortal
                ? 'Unlock the admin console to add or remove subjects.'
                : 'Subject management is handled by administrators.';
        }
        elements.subjectLockNote.textContent = message;
    }

    if (elements.lectureLockNote) {
        let message;
        if (!subject) {
            if (canEdit) {
                message = 'Select a subject to start building its timetable.';
            } else {
                message = isAdminPortal
                    ? 'Unlock the admin console to manage timetables.'
                    : 'Select a subject to view its timetable.';
            }
        } else if (canEdit) {
            message = isAdminPortal
                ? `Console unlocked — add lectures to ${subject.name}'s timetable.`
                : `Admin mode active — add lectures to ${subject.name}'s timetable.`;
        } else {
            message = isAdminPortal
                ? 'Unlock the admin console to edit this timetable.'
                : 'Lecture scheduling is managed by administrators.';
        }
        elements.lectureLockNote.textContent = message;
    }
}

function updateAdminIndicator() {
    if (elements.adminToggle) {
        elements.adminToggle.textContent = isAdmin ? 'Exit Admin Mode' : 'Enter Admin Mode';
        elements.adminToggle.setAttribute('aria-pressed', String(isAdmin));
    }

    if (elements.adminStatus) {
        if (isAdminPortal) {
            elements.adminStatus.textContent = isAdmin ? 'Console unlocked' : 'Console locked';
        } else {
            elements.adminStatus.textContent = isAdmin ? 'Admin mode active' : 'Student view';
        }
        elements.adminStatus.classList.toggle('active', isAdmin);
    }

    if (elements.adminLogout) {
        elements.adminLogout.classList.toggle('hidden', !isAdmin);
    }
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

function handleAdminLogin(event) {
    event.preventDefault();
    if (!elements.adminPasscode) {
        return;
    }

    const attempt = elements.adminPasscode.value.trim();
    elements.adminPasscode.value = '';

    if (!attempt) {
        if (elements.adminLoginError) {
            elements.adminLoginError.textContent = 'Passcode required to unlock the console.';
            elements.adminLoginError.classList.remove('hidden');
        }
        elements.adminPasscode.focus();
        return;
    }

    if (attempt === ADMIN_PASSCODE) {
        if (elements.adminLoginError) {
            elements.adminLoginError.classList.add('hidden');
            elements.adminLoginError.textContent = 'Incorrect passcode. Try again.';
        }
        unlockAdmin();
    } else {
        if (elements.adminLoginError) {
            elements.adminLoginError.textContent = 'Incorrect passcode. Try again.';
            elements.adminLoginError.classList.remove('hidden');
        }
        if (elements.adminGate) {
            elements.adminGate.setAttribute('aria-hidden', 'false');
        }
        elements.adminPasscode.focus();
    }
}

function updateMaxAbsenceControls(subject) {
    if (!elements.maxAbsences || !elements.applyMax) {
        return;
    }
    const hasSubject = Boolean(subject);
    const canEdit = hasSubject && isAdmin;
    elements.maxAbsences.disabled = !hasSubject || !isAdmin;
    elements.applyMax.disabled = !canEdit;

    if (hasSubject) {
        if (isAdmin) {
            elements.maxAbsences.title = `Set how many lectures can be missed in ${subject.name}`;
            elements.applyMax.title = `Save the absence limit for ${subject.name}`;
        } else {
            elements.maxAbsences.title = 'Absence limits are managed by administrators.';
            elements.applyMax.title = 'Admin access required to change the absence limit.';
        }
    } else {
        elements.maxAbsences.title = 'Select a subject to view its absence limit';
        elements.applyMax.title = 'Select a subject first';
    }
}

function render() {
    if (isAdminPortal && !isAdmin && elements.adminGate) {
        elements.adminGate.classList.remove('hidden');
        elements.adminGate.setAttribute('aria-hidden', 'false');
        if (elements.appShell) {
            elements.appShell.setAttribute('aria-hidden', 'true');
        }
    }
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
    if (!isAdmin) {
        alert('Admin access required to change absence limits.');
        render();
        return;
    }
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
    if (isAdminPortal) {
        lockAdmin({ focusInput: true, suppressRender: true });
    }
    if (elements.adminToggle) {
        elements.adminToggle.addEventListener('click', handleAdminToggle);
    }
    if (elements.adminLoginForm) {
        elements.adminLoginForm.addEventListener('submit', handleAdminLogin);
    }
    if (elements.adminPasscode) {
        elements.adminPasscode.addEventListener('input', () => {
            if (elements.adminLoginError) {
                elements.adminLoginError.classList.add('hidden');
                elements.adminLoginError.textContent = 'Incorrect passcode. Try again.';
            }
        });
    }
    if (elements.adminLogout) {
        elements.adminLogout.addEventListener('click', () => {
            lockAdmin({ focusInput: true });
        });
    }
    if (elements.subjectForm) {
        elements.subjectForm.addEventListener('submit', onAddSubject);
    }
    if (elements.lectureForm) {
        elements.lectureForm.addEventListener('submit', onAddLecture);
    }
    if (elements.applyMax) {
        elements.applyMax.addEventListener('click', onApplyMaxAbsences);
    }
    if (elements.maxAbsences) {
        elements.maxAbsences.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                onApplyMaxAbsences();
            }
        });
    }
    if (isAdminPortal && elements.adminPasscode) {
        elements.adminPasscode.focus();
    }
    render();
}

init();
