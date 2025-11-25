import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import SectionTitle from '../../components/SectionTitle.jsx';
import { useAdminDashboard } from './AdminDashboardContext.jsx';

const NEW_APPOINTMENT_TEMPLATE = {
  client_id: '',
  guest_name: '',
  guest_email: '',
  guest_phone: '',
  status: 'pending',
  scheduled_start: '',
  duration_minutes: '',
  assigned_admin_id: '',
  client_description: ''
};

const NEW_APPOINTMENT_FIELD_IDS = {
  clientId: 'new-appointment-client-id',
  status: 'new-appointment-status',
  guestName: 'new-appointment-guest-name',
  guestEmail: 'new-appointment-guest-email',
  scheduledStart: 'new-appointment-scheduled-start',
  duration: 'new-appointment-duration',
  assignedAdmin: 'new-appointment-assigned-admin',
  guestPhone: 'new-appointment-guest-phone',
  description: 'new-appointment-description'
};

const WEEK_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const WEEK_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday'
};

const MINIMUM_APPOINTMENT_DURATION_MINUTES = 60;
const SLOT_INTERVAL_MINUTES = 60;

function formatLocalDateTime(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const pad = (input) => input.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toDateTimeLocal(value) {
  return formatLocalDateTime(value) || '';
}

function fromDateTimeLocal(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return formatLocalDateTime(value);
}

function formatClosureDate(value) {
  if (!value) {
    return '';
  }
  const [year, month, day] = value.split('-').map((segment) => Number(segment));
  if (![year, month, day].every(Number.isFinite)) {
    return value;
  }
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function buildAppointmentUpdatePayload(draft) {
  return {
    status: draft.status?.trim() || 'pending',
    scheduled_start: draft.scheduled_start ? fromDateTimeLocal(draft.scheduled_start) : null,
    duration_minutes: draft.duration_minutes ? Number(draft.duration_minutes) : null,
    assigned_admin_id: draft.assigned_admin_id ? Number(draft.assigned_admin_id) : null,
    client_description: draft.client_description?.trim() || null
  };
}

function buildAppointmentCreatePayload(draft) {
  return {
    status: draft.status?.trim() || 'pending',
    client_id: draft.client_id ? Number(draft.client_id) : undefined,
    guest_name: draft.guest_name?.trim() || undefined,
    guest_email: draft.guest_email?.trim() || undefined,
    guest_phone: draft.guest_phone?.trim() || undefined,
    scheduled_start: draft.scheduled_start ? fromDateTimeLocal(draft.scheduled_start) : null,
    duration_minutes: draft.duration_minutes ? Number(draft.duration_minutes) : null,
    assigned_admin_id: draft.assigned_admin_id ? Number(draft.assigned_admin_id) : null,
    client_description: draft.client_description?.trim() || undefined
  };
}

function isHourAligned(value) {
  if (!value) {
    return true;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date.getMinutes() === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0;
}

function alignScheduledStartInput(value) {
  if (!value) {
    return '';
  }
  if (isHourAligned(value)) {
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  date.setMinutes(0, 0, 0);
  return toDateTimeLocal(date.toISOString());
}

function alignDurationInput(value) {
  if (!value) {
    return '';
  }
  const minutes = Number(value);
  if (Number.isNaN(minutes) || minutes <= 0) {
    return '';
  }
  const aligned = Math.max(
    MINIMUM_APPOINTMENT_DURATION_MINUTES,
    Math.ceil(minutes / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES
  );
  return String(aligned);
}

function ensureMinimumDurationMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return SLOT_INTERVAL_MINUTES;
  }
  return Math.max(SLOT_INTERVAL_MINUTES, Math.ceil(minutes / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES);
}

function normaliseOperatingHours(hours) {
  const incoming = new Map();
  ensureArray(hours).forEach((entry) => {
    if (entry?.day) {
      const durationMinutes = ensureMinimumDurationMinutes(entry.minimum_duration_minutes);
      incoming.set(entry.day, {
        day: entry.day,
        is_open: Boolean(entry.is_open),
        open_time: entry.open_time || '10:00',
        close_time: entry.close_time || '18:00',
        minimum_duration_minutes: durationMinutes,
        minimum_duration_hours_input: String(durationMinutes / 60),
      });
    }
  });
  return WEEK_ORDER.map((day) => {
    if (incoming.has(day)) {
      return { ...incoming.get(day) };
    }
    const defaults =
      day === 'saturday'
        ? { open_time: '10:00', close_time: '16:00' }
        : day === 'sunday'
        ? { open_time: '10:00', close_time: '14:00', is_open: false }
        : { open_time: '10:00', close_time: '18:00', is_open: true };
    const minutes = SLOT_INTERVAL_MINUTES;
    return {
      day,
      is_open: defaults.is_open ?? true,
      open_time: defaults.open_time,
      close_time: defaults.close_time,
      minimum_duration_minutes: minutes,
      minimum_duration_hours_input: String(minutes / 60),
    };
  });
}

function ensureArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value;
}

function buildDraftFromAppointment(appointment) {
  return {
    status: appointment.status || 'pending',
    scheduled_start: toDateTimeLocal(appointment.scheduled_start),
    duration_minutes: appointment.duration_minutes ?? '',
    assigned_admin_id: appointment.assigned_admin?.id ? String(appointment.assigned_admin.id) : '',
    client_description: appointment.client_description || ''
  };
}

function IconCalendar(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
      <path d="M8 2.5v4" />
      <path d="M16 2.5v4" />
      <path d="M3.5 9.5h17" />
    </svg>
  );
}

function IconPlus(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconEye(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconPencil(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 20h4l10.5-10.5a2.828 2.828 0 0 0-4-4L4 16v4z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}

function IconTrash(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

function IconClock(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function ActionIconButton({ icon: Icon, label, onClick, tone = 'default', active = false }) {
  const toneClasses =
    tone === 'danger'
      ? 'text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/50'
      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900';
  const activeClasses = active
    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800/70 dark:text-gray-100'
    : 'bg-transparent';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${toneClasses} ${activeClasses} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 dark:focus-visible:outline-gray-100`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export default function AdminCalendar() {
  const {
    state: { appointments, appointmentsPagination, admins, schedule },
    actions: {
      setFeedback,
      createAppointment,
      updateAppointment,
      deleteAppointment,
      updateSchedule,
      createClosure,
      updateClosure,
      deleteClosure,
      loadMoreAppointments
    }
  } = useAdminDashboard();
  const navigate = useNavigate();

  const [appointmentDrafts, setAppointmentDrafts] = useState({});
  const [newAppointmentDraft, setNewAppointmentDraft] = useState(NEW_APPOINTMENT_TEMPLATE);
  const [hoursDraft, setHoursDraft] = useState(normaliseOperatingHours(schedule.operating_hours));
  const [closureDateInput, setClosureDateInput] = useState('');
  const [closureReasonInput, setClosureReasonInput] = useState('');
  const [closureFormError, setClosureFormError] = useState('');
  const [editingClosureId, setEditingClosureId] = useState(null);
  const [editingClosureDate, setEditingClosureDate] = useState('');
  const [editingClosureReason, setEditingClosureReason] = useState('');
  const [editingClosureError, setEditingClosureError] = useState('');
  const [closureBusy, setClosureBusy] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [appointmentSearchQuery, setAppointmentSearchQuery] = useState('');
  const [appointmentSortOption, setAppointmentSortOption] = useState('schedule-asc');

  useEffect(() => {
    const drafts = {};
    appointments.forEach((appointment) => {
      drafts[appointment.id] = buildDraftFromAppointment(appointment);
    });
    setAppointmentDrafts(drafts);
  }, [appointments]);

  useEffect(() => {
    setHoursDraft(normaliseOperatingHours(schedule.operating_hours));
  }, [schedule.operating_hours]);

  const closures = useMemo(() => ensureArray(schedule.closures), [schedule.closures]);
  const closureDaysSet = useMemo(() => new Set(ensureArray(schedule.days_off)), [schedule.days_off]);

  const adminOptions = useMemo(
    () => admins.map((admin) => ({ value: String(admin.id), label: admin.name })),
    [admins]
  );

  const filteredAppointments = useMemo(() => {
    const query = appointmentSearchQuery.trim().toLowerCase();
    const scheduleTime = (appointment) =>
      appointment.scheduled_start ? new Date(appointment.scheduled_start).getTime() : null;
    const createdTime = (appointment) => (appointment.created_at ? new Date(appointment.created_at).getTime() : 0);
    const matchesQuery = (appointment) => {
      if (!query) {
        return true;
      }
      const fields = [
        appointment.client?.display_name,
        appointment.guest_name,
        appointment.guest_email,
        appointment.guest_phone,
        appointment.reference_code,
        appointment.status,
        appointment.assigned_admin?.name,
        appointment.assigned_admin?.display_name,
        appointment.assigned_admin?.email
      ]
        .filter(Boolean)
        .map((value) => value.toString().toLowerCase());
      return fields.some((field) => field.includes(query));
    };
    const compareScheduleAsc = (a, b) => {
      const aTime = scheduleTime(a);
      const bTime = scheduleTime(b);
      if (aTime === null && bTime === null) {
        return createdTime(b) - createdTime(a);
      }
      if (aTime === null) {
        return 1;
      }
      if (bTime === null) {
        return -1;
      }
      if (aTime === bTime) {
        return createdTime(b) - createdTime(a);
      }
      return aTime - bTime;
    };
    const compareScheduleDesc = (a, b) => {
      const aTime = scheduleTime(a);
      const bTime = scheduleTime(b);
      if (aTime === null && bTime === null) {
        return createdTime(b) - createdTime(a);
      }
      if (aTime === null) {
        return 1;
      }
      if (bTime === null) {
        return -1;
      }
      if (aTime === bTime) {
        return createdTime(b) - createdTime(a);
      }
      return bTime - aTime;
    };
    const compareStatusAsc = (a, b) => {
      const result = (a.status || 'pending').localeCompare(b.status || 'pending');
      if (result !== 0) {
        return result;
      }
      return compareScheduleAsc(a, b);
    };
    const compareStatusDesc = (a, b) => {
      const result = (b.status || 'pending').localeCompare(a.status || 'pending');
      if (result !== 0) {
        return result;
      }
      return compareScheduleAsc(a, b);
    };
    const comparator =
      {
        'schedule-asc': compareScheduleAsc,
        'schedule-desc': compareScheduleDesc,
        'status-asc': compareStatusAsc,
        'status-desc': compareStatusDesc
      }[appointmentSortOption] || compareScheduleAsc;

    return appointments.filter(matchesQuery).slice().sort(comparator);
  }, [appointmentSearchQuery, appointmentSortOption, appointments]);

  const hasSearchQuery = Boolean(appointmentSearchQuery.trim());
  const totalAppointments = appointmentsPagination.total || appointments.length;

  const handleAppointmentDraftChange = (appointmentId, field, value) => {
    setAppointmentDrafts((prev) => ({
      ...prev,
      [appointmentId]: {
        ...prev[appointmentId],
        [field]: value
      }
    }));
  };

  const handleCreateDraftChange = (field, value) => {
    setNewAppointmentDraft((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleHoursDraftChange = (day, field, value) => {
    setHoursDraft((prev) =>
      prev.map((entry) => {
        if (entry.day !== day) {
          return entry;
        }
        if (field === 'is_open') {
          return { ...entry, is_open: value };
        }
        if (field === 'minimum_duration_minutes') {
          // Store the raw hours input as a string; we’ll normalize to minutes on save.
          return { ...entry, minimum_duration_hours_input: value };
        }
        return { ...entry, [field]: value };
      })
    );
  };

  const requestAppointmentUpdate = (appointmentId) => {
    const draft = appointmentDrafts[appointmentId];
    if (!draft) {
      return;
    }
    const normalizedStart = alignScheduledStartInput(draft.scheduled_start);
    const normalizedDuration = alignDurationInput(draft.duration_minutes);
    const normalizedDraft = {
      ...draft,
      scheduled_start: normalizedStart,
      duration_minutes: normalizedDuration
    };
    if (normalizedStart !== draft.scheduled_start || normalizedDuration !== draft.duration_minutes) {
      setAppointmentDrafts((prev) => ({
        ...prev,
        [appointmentId]: normalizedDraft
      }));
    }
    const payload = buildAppointmentUpdatePayload(normalizedDraft);
    if (!payload.status) {
      setFeedback({ tone: 'offline', message: 'Status is required.' });
      return;
    }
    setConfirmation({
      type: 'update',
      appointmentId,
      payload,
      title: 'Update appointment',
      description: `Apply scheduling changes to appointment #${appointmentId}?`
    });
  };

  const requestAppointmentDelete = (appointment) => {
    setConfirmation({
      type: 'delete',
      appointmentId: appointment.id,
      title: 'Delete appointment',
      description: `This will remove appointment ${appointment.reference_code || `#${appointment.id}`}.`
    });
  };

  const requestAppointmentCreate = () => {
    const normalizedStart = alignScheduledStartInput(newAppointmentDraft.scheduled_start);
    const normalizedDuration = alignDurationInput(newAppointmentDraft.duration_minutes);
    const normalizedDraft = {
      ...newAppointmentDraft,
      scheduled_start: normalizedStart,
      duration_minutes: normalizedDuration
    };
    if (normalizedStart !== newAppointmentDraft.scheduled_start || normalizedDuration !== newAppointmentDraft.duration_minutes) {
      setNewAppointmentDraft(normalizedDraft);
    }
    const payload = buildAppointmentCreatePayload(normalizedDraft);
    if (!payload.client_id && (!payload.guest_name || !payload.guest_email)) {
      setFeedback({ tone: 'offline', message: 'Provide client ID or guest name and email.' });
      return;
    }
    setConfirmation({
      type: 'create',
      payload,
      title: 'Create appointment',
      description: 'Add this appointment to the calendar?'
    });
  };

  const requestScheduleUpdate = () => {
    const normalizedOperatingHours = hoursDraft.map((entry) => {
      const raw = entry.minimum_duration_hours_input;
      const parsed = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
      // Convert hours to minutes; enforce a minimum of SLOT_INTERVAL_MINUTES.
      const minutesSource = Number.isFinite(parsed) && parsed > 0 ? parsed * SLOT_INTERVAL_MINUTES : entry.minimum_duration_minutes;
      const finalMinutes = ensureMinimumDurationMinutes(minutesSource);
      return {
        day: entry.day,
        is_open: entry.is_open,
        open_time: entry.open_time,
        close_time: entry.close_time,
        minimum_duration_minutes: finalMinutes
      };
    });

    setConfirmation({
      type: 'schedule',
      payload: {
        operating_hours: normalizedOperatingHours,
        days_off: ensureArray(schedule.days_off)
      },
      title: 'Update studio schedule',
      description: 'Save these operating hours and days off?'
    });
  };

  const handleAddClosure = async () => {
    if (!closureDateInput) {
      setClosureFormError('Pick a date for this closure.');
      return;
    }
    setClosureFormError('');
    setClosureBusy(true);
    try {
      await createClosure({
        date: closureDateInput,
        reason: closureReasonInput.trim() || undefined
      });
      setClosureDateInput('');
      setClosureReasonInput('');
    } catch (error) {
      setClosureFormError(error?.message || 'Unable to save closure.');
    } finally {
      setClosureBusy(false);
    }
  };

  const handleStartEditClosure = (closure) => {
    setEditingClosureId(closure.id);
    setEditingClosureDate(closure.date);
    setEditingClosureReason(closure.reason || '');
    setEditingClosureError('');
  };

  const handleCancelEditClosure = () => {
    setEditingClosureId(null);
    setEditingClosureDate('');
    setEditingClosureReason('');
    setEditingClosureError('');
  };

  const handleSaveClosureEdit = async () => {
    if (!editingClosureId) {
      return;
    }
    if (!editingClosureDate) {
      setEditingClosureError('Date is required.');
      return;
    }
    setEditingClosureError('');
    setClosureBusy(true);
    try {
      await updateClosure(editingClosureId, {
        date: editingClosureDate,
        reason: editingClosureReason.trim() || null
      });
      handleCancelEditClosure();
    } catch (error) {
      setEditingClosureError(error?.message || 'Unable to update closure.');
    } finally {
      setClosureBusy(false);
    }
  };

  const requestClosureDelete = (closure) => {
    setConfirmation({
      type: 'closureDelete',
      closureId: closure.id,
      closureDate: closure.date,
      title: 'Remove scheduled closure',
      description: `Remove the closure on ${formatClosureDate(closure.date)}?`
    });
  };

  const handleConfirm = async () => {
    if (!confirmation) {
      return;
    }
    const activeConfirmation = confirmation;
    const editingTargetId = editingAppointmentId;
    const shouldCloseEditor =
      (activeConfirmation.type === 'update' || activeConfirmation.type === 'delete') &&
      editingTargetId === activeConfirmation.appointmentId;
    setConfirmBusy(true);
    setConfirmation(null);
    if (shouldCloseEditor) {
      setEditingAppointmentId(null);
    }
    try {
      if (activeConfirmation.type === 'create') {
        await createAppointment(activeConfirmation.payload);
        setNewAppointmentDraft(NEW_APPOINTMENT_TEMPLATE);
      } else if (activeConfirmation.type === 'update') {
        await updateAppointment(activeConfirmation.appointmentId, activeConfirmation.payload);
      } else if (activeConfirmation.type === 'delete') {
        await deleteAppointment(activeConfirmation.appointmentId);
      } else if (activeConfirmation.type === 'closureDelete') {
        await deleteClosure(activeConfirmation.closureId);
        handleCancelEditClosure();
      } else if (activeConfirmation.type === 'schedule') {
        await updateSchedule(activeConfirmation.payload);
      }
    } catch (err) {
      setFeedback({
        tone: 'offline',
        message:
          activeConfirmation.type === 'create'
            ? 'Unable to create appointment.'
            : activeConfirmation.type === 'update'
            ? 'Unable to update appointment.'
            : activeConfirmation.type === 'delete'
            ? 'Unable to delete appointment.'
            : activeConfirmation.type === 'closureDelete'
            ? 'Unable to remove closure.'
            : 'Unable to update studio schedule.'
      });
      if (shouldCloseEditor && activeConfirmation.type === 'update') {
        const latestAppointment = appointments.find((entry) => entry.id === activeConfirmation.appointmentId);
        if (latestAppointment) {
          resetAppointmentDraft(latestAppointment);
        }
        setEditingAppointmentId(activeConfirmation.appointmentId);
      }
    } finally {
      setConfirmBusy(false);
    }
  };


  const resetAppointmentDraft = (appointment) => {
    setAppointmentDrafts((prev) => ({
      ...prev,
      [appointment.id]: buildDraftFromAppointment(appointment)
    }));
  };

  const handleEditClick = (appointment) => {
    if (editingAppointmentId === appointment.id) {
      resetAppointmentDraft(appointment);
      setEditingAppointmentId(null);
      return;
    }
    if (editingAppointmentId !== null && editingAppointmentId !== appointment.id) {
      const previous = appointments.find((entry) => entry.id === editingAppointmentId);
      if (previous) {
        resetAppointmentDraft(previous);
      }
    }
    setEditingAppointmentId(appointment.id);
  };

  const handleCancelEdit = (appointment) => {
    resetAppointmentDraft(appointment);
    setEditingAppointmentId(null);
  };

  const renderEmptyState = (message) => (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
      <IconCalendar className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      <p>{message}</p>
    </div>
  );

  const handleCreateSubmit = (event) => {
    event.preventDefault();
    requestAppointmentCreate();
  };

  const renderCreatePanel = () => (
    <form className="space-y-6" onSubmit={handleCreateSubmit}>
      <div className="flex items-center gap-3 text-gray-700 dark:text-gray-200">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
          <IconPlus className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em]">Create appointment</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Schedule time for a client or guest.</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor={NEW_APPOINTMENT_FIELD_IDS.clientId}
            className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
          >
            Client ID
          </label>
          <input
            id={NEW_APPOINTMENT_FIELD_IDS.clientId}
            type="number"
            min="1"
            value={newAppointmentDraft.client_id}
            onChange={(event) => handleCreateDraftChange('client_id', event.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
            placeholder="Existing client?"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={NEW_APPOINTMENT_FIELD_IDS.status}
            className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
          >
            Status
          </label>
          <input
            id={NEW_APPOINTMENT_FIELD_IDS.status}
            type="text"
            value={newAppointmentDraft.status}
            onChange={(event) => handleCreateDraftChange('status', event.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={NEW_APPOINTMENT_FIELD_IDS.guestName}
            className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
          >
            Guest name
          </label>
          <input
            id={NEW_APPOINTMENT_FIELD_IDS.guestName}
            type="text"
            value={newAppointmentDraft.guest_name}
            onChange={(event) => handleCreateDraftChange('guest_name', event.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
            placeholder="Required if no client ID"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={NEW_APPOINTMENT_FIELD_IDS.guestEmail}
            className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
          >
            Guest email
          </label>
          <input
            id={NEW_APPOINTMENT_FIELD_IDS.guestEmail}
            type="email"
            value={newAppointmentDraft.guest_email}
            onChange={(event) => handleCreateDraftChange('guest_email', event.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
            placeholder="Required if no client ID"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={NEW_APPOINTMENT_FIELD_IDS.scheduledStart}
            className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
          >
            Start
          </label>
          <input
            id={NEW_APPOINTMENT_FIELD_IDS.scheduledStart}
            type="datetime-local"
            step="3600"
            value={newAppointmentDraft.scheduled_start}
            onChange={(event) => handleCreateDraftChange('scheduled_start', event.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={NEW_APPOINTMENT_FIELD_IDS.duration}
            className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
          >
            Duration (min)
          </label>
          <input
            id={NEW_APPOINTMENT_FIELD_IDS.duration}
            type="number"
            min="60"
            step="60"
            value={newAppointmentDraft.duration_minutes}
            onChange={(event) => handleCreateDraftChange('duration_minutes', event.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
          />
        </div>
        <div className="space-y-2">
          <label
            htmlFor={NEW_APPOINTMENT_FIELD_IDS.assignedAdmin}
            className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
          >
            Assign admin
          </label>
          <select
            id={NEW_APPOINTMENT_FIELD_IDS.assignedAdmin}
            value={newAppointmentDraft.assigned_admin_id}
            onChange={(event) => handleCreateDraftChange('assigned_admin_id', event.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
          >
            <option value="">Unassigned</option>
            {adminOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label
            htmlFor={NEW_APPOINTMENT_FIELD_IDS.guestPhone}
            className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
          >
            Guest phone
          </label>
          <input
            id={NEW_APPOINTMENT_FIELD_IDS.guestPhone}
            type="tel"
            value={newAppointmentDraft.guest_phone}
            onChange={(event) => handleCreateDraftChange('guest_phone', event.target.value)}
            className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label
          htmlFor={NEW_APPOINTMENT_FIELD_IDS.description}
          className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
        >
          Notes
        </label>
        <textarea
          id={NEW_APPOINTMENT_FIELD_IDS.description}
          rows={3}
          value={newAppointmentDraft.client_description}
          onChange={(event) => handleCreateDraftChange('client_description', event.target.value)}
          placeholder="Client or session notes (optional)"
          className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">A confirmation dialog appears before saving.</p>
        <Button type="submit">
          <IconPlus className="h-4 w-4" />
          Add to calendar
        </Button>
      </div>
    </form>
  );

  const renderAppointmentList = () => {
    const showingTotal = totalAppointments || filteredAppointments.length;
    const showingLabel = hasSearchQuery
      ? `Showing ${filteredAppointments.length} of ${showingTotal} appointments`
      : `Showing ${filteredAppointments.length} appointments`;

    if (!filteredAppointments.length) {
      return renderEmptyState(hasSearchQuery ? 'No appointments match your search.' : 'No appointments scheduled yet.');
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full max-w-md">
            <label htmlFor="admin-calendar-search" className="sr-only">
              Search appointments
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm">🔍</span>
              <input
                id="admin-calendar-search"
                type="search"
                value={appointmentSearchQuery}
                onChange={(event) => setAppointmentSearchQuery(event.target.value)}
                placeholder="Search by client, contact, reference, or status"
                className="w-full rounded-2xl border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="admin-calendar-sort"
              className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
            >
              Sort
            </label>
            <select
              id="admin-calendar-sort"
              value={appointmentSortOption}
              onChange={(event) => setAppointmentSortOption(event.target.value)}
              className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
            >
              <option value="schedule-asc">Upcoming (chronological)</option>
              <option value="schedule-desc">Latest first</option>
              <option value="status-asc">Status A → Z</option>
              <option value="status-desc">Status Z → A</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400">{showingLabel}</p>
          </div>
        </div>
        <div className="flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <div className="max-h-[720px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-800">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6"
                        >
                          Client
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
                        >
                          Schedule
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
                        >
                          Status
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100"
                        >
                          Assigned
                        </th>
                        <th
                          scope="col"
                          className="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pr-6"
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {filteredAppointments.map((appointment) => {
                        const draft = appointmentDrafts[appointment.id] || buildDraftFromAppointment(appointment);
                        const scheduledDate = appointment.scheduled_start ? new Date(appointment.scheduled_start) : null;
                        const formattedDate = scheduledDate
                          ? scheduledDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                          : 'Awaiting schedule';
                        const clientName = appointment.client?.display_name || appointment.guest_name || 'Guest client';
                        const contact =
                          appointment.client?.email || appointment.guest_email || appointment.guest_phone || 'No contact info';
                        const reference = appointment.reference_code || `#${appointment.id}`;
                        const assigned =
                          appointment.assigned_admin?.name ||
                          appointment.assigned_admin?.display_name ||
                          appointment.assigned_admin?.email ||
                          'Unassigned';
                        const scheduledDateKey = scheduledDate ? scheduledDate.toISOString().slice(0, 10) : null;
                        const isDayOff = scheduledDateKey ? closureDaysSet.has(scheduledDateKey) : false;
                        const baseId = `appointment-${appointment.id}`;
                        const statusId = `${baseId}-status`;
                        const startId = `${baseId}-start`;
                        const durationId = `${baseId}-duration`;
                        const adminId = `${baseId}-assigned-admin`;
                        const notesId = `${baseId}-notes`;
                        const isEditing = editingAppointmentId === appointment.id;

                        return [
                          <tr key={appointment.id} className="bg-white dark:bg-gray-950">
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                              <div className="flex items-center">
                                <div className="mr-4 flex h-11 w-11 items-center justify-center rounded-full bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
                                  <IconCalendar className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="font-semibold text-gray-900 dark:text-gray-100">{clientName}</div>
                                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{contact}</div>
                                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">Ref {reference}</div>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                              <div className="text-gray-900 dark:text-gray-100">{formattedDate}</div>
                              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Duration {appointment.duration_minutes ? `${appointment.duration_minutes} min` : '—'}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-950/50 dark:text-green-200">
                                {appointment.status || 'pending'}
                              </span>
                              {isDayOff ? (
                                <span className="ml-2 inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-200">
                                  Day off
                                </span>
                              ) : null}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                              <div className="text-gray-900 dark:text-gray-100">{assigned}</div>
                            </td>
                            <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => navigate(`${appointment.id}`)}
                                  aria-label={`View appointment ${reference} details`}
                                  className="px-3 py-2"
                                >
                                  <IconEye className="h-4 w-4" />
                                  <span className="hidden text-xs uppercase tracking-[0.3em] sm:inline">Details</span>
                                </Button>
                                <ActionIconButton
                                  icon={IconPencil}
                                  label={isEditing ? 'Close editor' : 'Edit appointment'}
                                  onClick={() => handleEditClick(appointment)}
                                  active={isEditing}
                                />
                                <ActionIconButton
                                  icon={IconTrash}
                                  label={`Delete appointment ${reference}`}
                                  onClick={() => requestAppointmentDelete(appointment)}
                                  tone="danger"
                                />
                              </div>
                            </td>
                          </tr>,
                          isEditing ? (
                            <tr key={`${appointment.id}-edit`} className="bg-gray-50 dark:bg-gray-900">
                              <td colSpan={5} className="px-4 py-5 sm:px-6">
                                <div className="space-y-4">
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                      <label
                                        htmlFor={statusId}
                                        className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
                                      >
                                        Status
                                      </label>
                                      <input
                                        id={statusId}
                                        type="text"
                                        value={draft.status ?? ''}
                                        onChange={(event) =>
                                          handleAppointmentDraftChange(appointment.id, 'status', event.target.value)
                                        }
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label
                                        htmlFor={startId}
                                        className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
                                      >
                                        Start
                                      </label>
                                      <input
                                        id={startId}
                                        type="datetime-local"
                                        step="3600"
                                        value={draft.scheduled_start ?? ''}
                                        onChange={(event) =>
                                          handleAppointmentDraftChange(appointment.id, 'scheduled_start', event.target.value)
                                        }
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label
                                        htmlFor={durationId}
                                        className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
                                      >
                                        Duration (min)
                                      </label>
                                      <input
                                        id={durationId}
                                        type="number"
                                        min="60"
                                        step="60"
                                        value={draft.duration_minutes ?? ''}
                                        onChange={(event) =>
                                          handleAppointmentDraftChange(appointment.id, 'duration_minutes', event.target.value)
                                        }
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label
                                        htmlFor={adminId}
                                        className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
                                      >
                                        Assigned admin
                                      </label>
                                      <select
                                        id={adminId}
                                        value={draft.assigned_admin_id ?? ''}
                                        onChange={(event) =>
                                          handleAppointmentDraftChange(appointment.id, 'assigned_admin_id', event.target.value)
                                        }
                                        className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
                                      >
                                        <option value="">Unassigned</option>
                                        {adminOptions.map((option) => (
                                          <option key={option.value} value={option.value}>
                                            {option.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <label
                                      htmlFor={notesId}
                                      className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
                                    >
                                      Notes
                                    </label>
                                    <textarea
                                      id={notesId}
                                      rows={3}
                                      value={draft.client_description ?? ''}
                                      onChange={(event) =>
                                        handleAppointmentDraftChange(appointment.id, 'client_description', event.target.value)
                                      }
                                      className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
                                    />
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      Last update{' '}
                                      {appointment.updated_at
                                        ? new Date(appointment.updated_at).toLocaleString([], {
                                            dateStyle: 'medium',
                                            timeStyle: 'short'
                                          })
                                        : 'n/a'}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Button type="button" onClick={() => requestAppointmentUpdate(appointment.id)}>
                                        <IconPencil className="h-4 w-4" />
                                        Save changes
                                      </Button>
                                      <Button type="button" variant="ghost" onClick={() => handleCancelEdit(appointment)}>
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ) : null
                        ];
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          {appointmentsPagination.page < appointmentsPagination.pages ? (
            <div className="mt-4 flex justify-center">
              <Button type="button" variant="ghost" onClick={() => loadMoreAppointments()}>
                Load more appointments
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  const appointmentCountLabel =
    totalAppointments === 1 ? '1 appointment scheduled' : `${totalAppointments} appointments scheduled`;

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Admin"
        title="Calendar & availability"
        description="Keep the studio schedule organised with a single, focused control centre."
      />

      <Card className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
              <IconCalendar className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Studio calendar
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{appointmentCountLabel}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              aria-expanded={showCreateForm}
              aria-controls="admin-calendar-create"
              variant={showCreateForm ? 'secondary' : 'primary'}
            >
              <IconPlus className="h-4 w-4" />
              {showCreateForm ? 'Close form' : 'New appointment'}
            </Button>
          </div>
        </div>
        {showCreateForm ? (
          <div
            id="admin-calendar-create"
            className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950"
          >
            {renderCreatePanel()}
          </div>
        ) : null}
        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          {renderAppointmentList()}
        </div>
      </Card>

      <Card className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900">
              <IconClock className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Studio availability
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Manage weekly hours and closures.</p>
            </div>
          </div>
          <Button type="button" onClick={requestScheduleUpdate}>
            <IconPencil className="h-4 w-4" />
            Save availability
          </Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
              Operating hours
            </h3>
            <div className="space-y-3">
              {hoursDraft.map((entry) => {
                const minimumHoursValue =
                  typeof entry.minimum_duration_hours_input === 'string'
                    ? entry.minimum_duration_hours_input
                    : entry.minimum_duration_minutes
                    ? String(
                        Math.max(entry.minimum_duration_minutes ?? SLOT_INTERVAL_MINUTES, SLOT_INTERVAL_MINUTES) / 60
                      )
                    : '';
                return (
                  <div
                    key={entry.day}
                    className="flex flex-wrap items-center gap-3 rounded-3xl bg-gray-50 p-4 dark:bg-gray-900"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        id={`hours-${entry.day}`}
                        type="checkbox"
                        checked={entry.is_open}
                        onChange={(event) => handleHoursDraftChange(entry.day, 'is_open', event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-950 dark:focus:ring-gray-100"
                      />
                      <label
                        htmlFor={`hours-${entry.day}`}
                        className="text-sm font-semibold text-gray-800 dark:text-gray-100"
                      >
                        {WEEK_LABELS[entry.day]}
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor={`open-${entry.day}`} className="sr-only">
                        {WEEK_LABELS[entry.day]} open time
                      </label>
                      <input
                        id={`open-${entry.day}`}
                        type="time"
                        value={entry.open_time}
                        onChange={(event) => handleHoursDraftChange(entry.day, 'open_time', event.target.value)}
                        disabled={!entry.is_open}
                        className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
                      />
                      <span className="text-xs uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">to</span>
                      <label htmlFor={`close-${entry.day}`} className="sr-only">
                        {WEEK_LABELS[entry.day]} close time
                      </label>
                      <input
                        id={`close-${entry.day}`}
                        type="time"
                        value={entry.close_time}
                        onChange={(event) => handleHoursDraftChange(entry.day, 'close_time', event.target.value)}
                        disabled={!entry.is_open}
                        className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`minimum-${entry.day}`}
                        className="text-xs tracking-[0.3em] text-gray-500 dark:text-gray-400"
                      >
                        Min booking (hrs)
                      </label>
                      <input
                        id={`minimum-${entry.day}`}
                        type="number"
                        min="1"
                        step="1"
                        value={minimumHoursValue}
                        onChange={(event) => {
                          // Allow the user to freely type or clear the field; we normalize on save.
                          handleHoursDraftChange(entry.day, 'minimum_duration_minutes', event.target.value);
                        }}
                        disabled={!entry.is_open}
                        className="w-20 rounded-xl border border-gray-200 bg-white px-3 py-1 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
              Scheduled closures
            </h3>
            <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                <div className="space-y-2">
                  <label
                    htmlFor="closure-date"
                    className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
                  >
                    Date
                  </label>
                  <input
                    id="closure-date"
                    type="date"
                    value={closureDateInput}
                    onChange={(event) => setClosureDateInput(event.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="closure-reason"
                    className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
                  >
                    Reason (optional)
                  </label>
                  <input
                    id="closure-reason"
                    type="text"
                    value={closureReasonInput}
                    onChange={(event) => setClosureReasonInput(event.target.value)}
                    placeholder="Staffing, holiday, or prep"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddClosure}
                    disabled={!closureDateInput || closureBusy}
                  >
                    <IconPlus className="h-4 w-4" />
                    Add closure
                  </Button>
                </div>
              </div>
              {closureFormError ? (
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-rose-500 dark:text-rose-400">
                  {closureFormError}
                </p>
              ) : null}
              <div className="mt-4 space-y-3">
                {closures.length ? (
                  closures.map((closure) => (
                    <div
                      key={closure.id}
                      className="space-y-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {formatClosureDate(closure.date)}
                          </p>
                          {closure.reason ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{closure.reason}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleStartEditClosure(closure)}
                            disabled={closureBusy}
                            className="text-[11px] tracking-[0.2em]"
                          >
                            <IconPencil className="h-3 w-3" />
                            <span className="hidden uppercase tracking-[0.3em] sm:inline">Edit</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => requestClosureDelete(closure)}
                            disabled={closureBusy}
                            className="text-[11px] uppercase tracking-[0.3em] text-rose-500"
                          >
                            <IconTrash className="h-3 w-3" />
                            <span className="hidden uppercase tracking-[0.3em] sm:inline">Delete</span>
                          </Button>
                        </div>
                      </div>
                      {editingClosureId === closure.id ? (
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <label
                              htmlFor={`closure-edit-date-${closure.id}`}
                              className="text-[11px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
                            >
                              Date
                            </label>
                            <input
                              id={`closure-edit-date-${closure.id}`}
                              type="date"
                              value={editingClosureDate}
                              onChange={(event) => setEditingClosureDate(event.target.value)}
                              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <label
                              htmlFor={`closure-edit-reason-${closure.id}`}
                              className="text-[11px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400"
                            >
                              Reason (optional)
                            </label>
                            <input
                              id={`closure-edit-reason-${closure.id}`}
                              type="text"
                              value={editingClosureReason}
                              onChange={(event) => setEditingClosureReason(event.target.value)}
                              placeholder="Staffing, holiday, or prep"
                              className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-gray-400"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              onClick={handleSaveClosureEdit}
                              disabled={closureBusy}
                              className="text-[11px] tracking-[0.3em]"
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={handleCancelEditClosure}
                              disabled={closureBusy}
                              className="text-[11px] tracking-[0.3em]"
                            >
                              Cancel
                            </Button>
                          </div>
                          {editingClosureError ? (
                            <p className="col-span-full text-xs uppercase tracking-[0.3em] text-rose-500 dark:text-rose-400">
                              {editingClosureError}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-gray-300 px-4 py-2 text-xs uppercase tracking-[0.3em] text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <IconCalendar className="h-4 w-4" />
                    No closures yet
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmation)}
        title={confirmation?.title ?? 'Confirm'}
        description={confirmation?.description ?? ''}
        confirmLabel={
          confirmation?.type === 'delete'
            ? 'Delete'
            : confirmation?.type === 'create'
            ? 'Create'
            : confirmation?.type === 'closureDelete'
            ? 'Delete closure'
            : 'Save'
        }
        onConfirm={handleConfirm}
        onClose={() => {
          if (!confirmBusy) {
            setConfirmation(null);
          }
        }}
        busy={confirmBusy}
      >
        {confirmation?.type === 'update' && confirmation?.appointmentId ? (
          <p>
            Appointment <strong>#{confirmation.appointmentId}</strong> will be updated with the new details.
          </p>
        ) : null}
        {confirmation?.type === 'create' ? (
          <p>
            Status set to <strong>{confirmation.payload.status}</strong>.{' '}
            {confirmation.payload.scheduled_start
              ? `Scheduled start: ${new Date(confirmation.payload.scheduled_start).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}.`
              : 'No start date provided.'}
          </p>
        ) : null}
        {confirmation?.type === 'delete' ? (
          <p>This action cannot be undone.</p>
        ) : null}
        {confirmation?.type === 'schedule' ? (
          <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
            {confirmation.payload.operating_hours
              .filter((entry) => entry.is_open)
              .map((entry) => (
                <li key={entry.day}>
                  {WEEK_LABELS[entry.day]}: {entry.open_time} - {entry.close_time}
                </li>
              ))}
            {confirmation.payload.days_off.length ? (
              <li>Days off: {confirmation.payload.days_off.join(', ')}</li>
            ) : null}
          </ul>
        ) : null}
        {confirmation?.type === 'closureDelete' && confirmation?.closureDate ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Removing the closure scheduled for <strong>{formatClosureDate(confirmation.closureDate)}</strong>.
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
