const DEFAULT_APPOINTMENT_TYPE_LABEL = 'Tattoo session';
const MAX_LABEL_LENGTH = 60;

function normalizeDescription(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  const firstLine = trimmed.split(/\r?\n/)[0].trim();
  if (!firstLine) {
    return '';
  }
  const singleSpaced = firstLine.replace(/\s+/g, ' ');
  if (singleSpaced.length <= MAX_LABEL_LENGTH) {
    return singleSpaced;
  }
  return `${singleSpaced.slice(0, MAX_LABEL_LENGTH - 3).trim()}...`;
}

export function getAppointmentTypeLabel(appointment) {
  if (!appointment) {
    return DEFAULT_APPOINTMENT_TYPE_LABEL;
  }
  const sessionName = appointment.session_option?.name?.trim();
  if (sessionName) {
    return sessionName;
  }
  const descriptionLabel = normalizeDescription(appointment.client_description);
  if (descriptionLabel) {
    return descriptionLabel;
  }
  return DEFAULT_APPOINTMENT_TYPE_LABEL;
}
