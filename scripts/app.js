const STORAGE_KEY = 'uniAttendState_v1';

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
};

const templates = {
    subject: document.getElementById('subject-template'),
    lecture: document.getElementById('lecture-template'),
};

let state = loadState();
let selectedSubjectId = state.subjects[0]?.id ?? null;

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
            return {
                maxAbsences: parsed.maxAbsences ?? 3,
                subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
            };
        } catch (error) {
            console.error('Failed to load attendance state', error);
        }
    }
    return {
        maxAbsences: 3,
        subjects: [],
    };
}

function persistState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createSubject(name, code) {
    return {
        id: generateId(),
        name,
        code,
        lectures: [],
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
        return { total: 0, attended: 0, percentage: 0, remainingAllowance: state.maxAbsences };
    }

    const total = subject.lectures.length;
    const attended = subject.lectures.filter((lecture) => lecture.status === 'present').length;
    const absent = subject.lectures.filter((lecture) => lecture.status === 'absent').length;
    const percentage = total === 0 ? 0 : Math.round((attended / total) * 100);
    const remainingAllowance = Math.max(state.maxAbsences - absent, 0);

    return { total, attended, percentage, remainingAllowance };
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

        selectButton.addEventListener('click', () => {
            selectedSubjectId = subject.id;
            render();
        });

        deleteBtn.addEventListener('click', (event) => {
            event.stopPropagation();
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
        return;
    }

    elements.emptyState.classList.add('hidden');
    elements.detailWrapper.classList.remove('hidden');

    elements.detailTitle.textContent = subject.name;
    elements.detailCode.textContent = subject.code || 'No subject code';

    const { attended, percentage, remainingAllowance } = calculateStats(subject);
    elements.attendancePercent.textContent = `${percentage}%`;
    elements.lecturesAttended.textContent = `${attended}/${subject.lectures.length}`;
    elements.remainingAllowance.textContent = `${remainingAllowance}`;

    elements.lectureList.innerHTML = '';

    const sortedLectures = sortLectures(subject.lectures);
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
            lecture.status = 'absent';
            persistState();
            render();
        });

        deleteBtn.addEventListener('click', () => {
            const confirmed = confirm('Delete this lecture entry?');
            if (!confirmed) return;
            subject.lectures = subject.lectures.filter((l) => l.id !== lecture.id);
            persistState();
            render();
        });

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

function render() {
    elements.maxAbsences.value = state.maxAbsences;
    renderSubjects();
    renderSubjectDetail();
}

function onAddSubject(event) {
    event.preventDefault();
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
        elements.maxAbsences.value = state.maxAbsences;
        return;
    }
    state.maxAbsences = value;
    persistState();
    render();
}

function init() {
    elements.subjectForm.addEventListener('submit', onAddSubject);
    elements.lectureForm.addEventListener('submit', onAddLecture);
    elements.applyMax.addEventListener('click', onApplyMaxAbsences);
    render();
}

init();
