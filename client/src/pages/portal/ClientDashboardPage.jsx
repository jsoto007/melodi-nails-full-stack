import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import Dialog from '../../components/Dialog.jsx';
import Lightbox from '../../components/Lightbox.jsx';
import SectionTitle from '../../components/SectionTitle.jsx';
import { apiPost, resolveApiUrl } from '../../lib/api.js';
import { getLocalizedServiceName, useClientPortal } from '../../contexts/ClientPortalContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { getAppointmentTypeLabel } from '../../lib/appointments.js';
import { formatStatusLabel, getStatusBadgeClasses } from '../../lib/statusStyles.js';

const PAST_STATUSES = new Set(['cancelled', 'cancelled_by_client', 'declined', 'completed', 'no_show']);
const SHORT_DATE = { month: 'short', day: 'numeric' };
const FRIENDLY_DATE = { weekday: 'long', month: 'long', day: 'numeric' };

export default function ClientDashboardPage() {
  const navigate = useNavigate();
  const { t, language, formatDate, formatTime } = useLanguage();
  const notificationsRef = useRef(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);
  const [ideaModalOpen, setIdeaModalOpen] = useState(false);
  const [ideaNotes, setIdeaNotes] = useState('');
  const [ideaSubmitting, setIdeaSubmitting] = useState(false);
  const [ideaStatus, setIdeaStatus] = useState(null);
  const [ideaError, setIdeaError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const { loading, error, profile, appointments, notifications, documents } = useClientPortal();

  const upcomingAppointments = useMemo(() => {
    const now = Date.now();
    return [...(appointments || [])]
      .filter((appointment) => {
        const isPast = PAST_STATUSES.has(appointment.status);
        if (isPast) {
          return false;
        }
        const start = appointment.scheduled_start ? new Date(appointment.scheduled_start).getTime() : null;
        if (start && start < now) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const aTime = a.scheduled_start ? new Date(a.scheduled_start).getTime() : Infinity;
        const bTime = b.scheduled_start ? new Date(b.scheduled_start).getTime() : Infinity;
        return aTime - bTime;
      });
  }, [appointments]);

  const nextAppointment = upcomingAppointments[0] ?? null;

  const quickActions = useMemo(() => {
    const shareInspiration = () => {
      navigate('/portal/profile', { state: { focus: 'inspiration' } });
    };
    const shareIdea = () => {
      setIdeaModalOpen(true);
    };
    const viewDocuments = () => {
      navigate('/portal/profile', { state: { focus: 'documents' } });
    };
    const checkNotifications = () => {
      notificationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    return [
      { id: 'shareInspiration', label: t('portal.dashboard.quickActions.shareInspiration'), description: t('portal.dashboard.quickActions.shareInspirationHint'), action: shareInspiration },
      { id: 'shareIdea', label: t('portal.dashboard.quickActions.shareIdea'), description: t('portal.dashboard.quickActions.shareIdeaHint'), action: shareIdea },
      { id: 'viewDocuments', label: t('portal.dashboard.quickActions.viewDocuments'), description: t('portal.dashboard.quickActions.viewDocumentsHint'), action: viewDocuments },
      { id: 'checkNotifications', label: t('portal.dashboard.quickActions.checkNotifications'), description: t('portal.dashboard.quickActions.checkNotificationsHint'), action: checkNotifications }
    ];
  }, [navigate, notificationsRef, t]);

  const recentUploads = useMemo(() => {
    if (!documents || !documents.length) {
      return [];
    }
    return documents.filter((doc) => doc.kind === 'inspiration' && doc.file_url).slice(0, 6);
  }, [documents]);

  const handleIdeaSubmit = async (event) => {
    event.preventDefault();
    if (!profile) {
      return;
    }
    if (!ideaNotes.trim()) {
      setIdeaError(t('portal.dashboard.idea.empty'));
      return;
    }
    setIdeaSubmitting(true);
    setIdeaError(null);
    setIdeaStatus(null);

    try {
      await apiPost('/api/consultations', {
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.display_name,
        email: profile.email,
        phone: profile.phone,
        placement: 'client_portal',
        description: ideaNotes.trim(),
        preferred_date: null
      });
      setIdeaStatus(t('portal.dashboard.idea.success'));
      setIdeaNotes('');
    } catch {
      setIdeaError(t('portal.dashboard.idea.failure'));
    } finally {
      setIdeaSubmitting(false);
    }
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleAction = (type, appointment) => {
    setActionDialog({ type, appointment });
  };

  const renderAppointmentCard = (appointment, variant) => {
    const leftDate = formatDate(appointment.scheduled_start, SHORT_DATE) || t('common.states.tbd');
    const leftTime = formatTime(appointment.scheduled_start) || t('common.states.tbd');
    const serviceName = getLocalizedServiceName(appointment, language);
    return (
      <article
        key={appointment.id}
        className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/80 p-4 text-sm text-gray-700 shadow-sm sm:flex-row sm:items-center"
      >
        <div className="w-full sm:w-32">
          <p className="text-xs uppercase tracking-[0.4em] text-gray-500">{leftDate}</p>
          <p className="text-lg font-semibold text-gray-900">{leftTime}</p>
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gray-500">
            {getAppointmentTypeLabel(appointment, language)}
          </p>
          {appointment.assigned_admin ? (
            <p className="text-sm font-semibold text-gray-900">{appointment.assigned_admin.name}</p>
          ) : null}
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em]">
            <Badge className={getStatusBadgeClasses(appointment.status)}>
              {formatStatusLabel(appointment.status, language)}
            </Badge>
            {serviceName ? <span className="text-gray-500">{serviceName}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em]">
          <Button variant="ghost" onClick={() => handleViewDetails(appointment)}>
            {t('portal.appointment.viewDetails')}
          </Button>
          {variant === 'upcoming' ? (
            <>
              <Button variant="ghost" onClick={() => handleAction('reschedule', appointment)}>
                {t('portal.appointment.reschedule')}
              </Button>
              <Button variant="ghost" onClick={() => handleAction('cancel', appointment)}>
                {t('portal.appointment.cancel')}
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => navigate('/appointments/new')}>
              {t('portal.appointment.rebook')}
            </Button>
          )}
        </div>
      </article>
    );
  };

  const buildActionMessage = () => {
    if (!actionDialog) {
      return null;
    }
    const { type } = actionDialog;
    if (type === 'reschedule') {
      return t('portal.appointment.rescheduleMessage');
    }
    if (type === 'cancel') {
      return t('portal.appointment.cancelMessage');
    }
    return null;
  };

  if (loading) {
    return (
      <main className="space-y-8">
        <SectionTitle eyebrow={t('portal.eyebrow')} title={t('portal.dashboard.title')} description={t('portal.dashboard.loading')} />
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-8">
        <SectionTitle eyebrow={t('portal.eyebrow')} title={t('portal.dashboard.title')} description={t('common.states.somethingWrong')} />
        <Card className="text-xs uppercase tracking-[0.3em] text-rose-600">{error}</Card>
        <Button as={Link} to="/auth" variant="secondary">
          {t('portal.errors.returnToSignIn')}
        </Button>
      </main>
    );
  }

  const welcomeName = profile?.first_name || profile?.display_name || '';
  const welcomeText = welcomeName
    ? t('portal.dashboard.welcome', { name: welcomeName })
    : t('portal.dashboard.welcomeNoName');

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow={t('portal.eyebrow')}
        title={t('portal.dashboard.title')}
        description={t('portal.dashboard.description')}
      />

      <Card>
        <div className="grid gap-6 md:grid-cols-[1fr_280px] md:items-center">
          <div className="space-y-3">
            <p className="text-[0.6rem] uppercase tracking-[0.4em] text-gray-500">{welcomeText}</p>
            <h1 className="text-2xl font-semibold text-gray-900">{t('portal.dashboard.headline')}</h1>
          </div>
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 p-4 text-sm text-gray-700">
            {nextAppointment ? (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">{t('portal.dashboard.nextAppointment')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(nextAppointment.scheduled_start, SHORT_DATE) || t('common.states.tbd')} ·{' '}
                  {formatTime(nextAppointment.scheduled_start) || t('common.states.tbd')}
                </p>
                <Button variant="ghost" onClick={() => handleViewDetails(nextAppointment)}>
                  {t('portal.appointment.viewDetails')}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">{t('portal.dashboard.noUpcoming')}</p>
                <p className="text-sm text-gray-600">{t('portal.dashboard.noUpcomingHint')}</p>
                <Button as={Link} to="/appointments/new">
                  {t('portal.layout.bookAppointment')}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.dashboard.upcomingTitle')}</p>
              <p className="text-sm text-gray-500">{t('portal.dashboard.upcomingHint')}</p>
            </div>
            <Button as={Link} to="/portal/appointments" variant="ghost">
              {t('portal.dashboard.viewAll')}
            </Button>
          </div>
          {nextAppointment ? (
            renderAppointmentCard(nextAppointment, 'upcoming')
          ) : (
            <div className="space-y-2 text-xs uppercase tracking-[0.3em] text-gray-500">
              <p>{t('portal.dashboard.noUpcomingLong')}</p>
              <Button as={Link} to="/appointments/new" variant="ghost">
                {t('portal.layout.bookAppointment')}
              </Button>
            </div>
          )}
        </Card>

        <Card ref={notificationsRef} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.dashboard.notificationsTitle')}</p>
              <p className="text-sm text-gray-500">{t('portal.dashboard.notificationsHint')}</p>
            </div>
            <Button as={Link} to="/portal/profile" variant="ghost">
              {t('portal.dashboard.viewAll')}
            </Button>
          </div>
          {notifications?.items?.length ? (
            <div className="space-y-3">
              {notifications.items.slice(0, 3).map((notification) => (
                <article key={notification.id} className="rounded-2xl border border-gray-200 bg-white/80 p-3 text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">{notification.title}</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
                    {formatDate(notification.created_at, SHORT_DATE)}
                  </p>
                  <p className="mt-1 text-[0.75rem] text-gray-600">{notification.body}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.dashboard.noNotifications')}</p>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.dashboard.quickActionsTitle')}</p>
            <p className="text-sm text-gray-500">{t('portal.dashboard.quickActionsHint')}</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/appointments/new')}>
            {t('portal.layout.bookAppointment')}
          </Button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={action.action}
              title={action.description}
              className="flex w-full items-center justify-between gap-2 rounded-full border border-gray-200 bg-gray-50/70 px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-gray-700 transition hover:border-black hover:text-black"
            >
              <span>{action.label}</span>
              <span className="text-[0.6rem] text-gray-400">→</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.dashboard.recentUploadsTitle')}</p>
            <p className="text-sm text-gray-500">{t('portal.dashboard.recentUploadsHint')}</p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/portal/profile', { state: { focus: 'inspiration' } })}>
            {t('portal.dashboard.uploadInspiration')}
          </Button>
        </div>
        {recentUploads.length ? (
          <div className="mt-6 flex gap-4 overflow-x-auto pb-4">
            {recentUploads.map((upload) => (
              <button
                key={upload.id}
                type="button"
                onClick={() => setPreviewImage(upload)}
                className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white text-left"
              >
                <img
                  src={resolveApiUrl(upload.file_url)}
                  alt={upload.title || t('portal.profile.documents.uploadedFile')}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-900/80 to-transparent p-2 text-[0.6rem] uppercase tracking-[0.3em] text-white">
                  {formatDate(upload.created_at, SHORT_DATE)}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.dashboard.noUploads')}</p>
        )}
      </Card>

      <Dialog open={ideaModalOpen} onClose={() => setIdeaModalOpen(false)} title={t('portal.dashboard.idea.title')} footer={
        <>
          <Button variant="ghost" onClick={() => setIdeaModalOpen(false)} disabled={ideaSubmitting}>
            {t('common.actions.cancel')}
          </Button>
          <Button onClick={handleIdeaSubmit} disabled={ideaSubmitting}>
            {ideaSubmitting ? t('common.states.sending') : t('portal.dashboard.idea.send')}
          </Button>
        </>
      }>
        <p className="text-sm text-gray-600">{t('portal.dashboard.idea.prompt')}</p>
        <textarea
          aria-label={t('portal.dashboard.idea.fieldLabel')}
          rows={4}
          value={ideaNotes}
          onChange={(event) => setIdeaNotes(event.target.value)}
          className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-black"
        />
        {ideaError ? <p className="text-xs uppercase tracking-[0.3em] text-rose-600">{ideaError}</p> : null}
        {ideaStatus ? <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">{ideaStatus}</p> : null}
      </Dialog>

      <Dialog
        open={!!actionDialog}
        onClose={() => setActionDialog(null)}
        title={
          actionDialog?.type === 'reschedule' || actionDialog?.type === 'cancel'
            ? t(`portal.appointment.dialogTitles.${actionDialog.type}`)
            : t('portal.appointment.note')
        }
        footer={<Button onClick={() => setActionDialog(null)}>{t('common.actions.close')}</Button>}
      >
        <p className="text-sm text-gray-600">{buildActionMessage()}</p>
      </Dialog>

      <Dialog
        open={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        title={t('portal.appointment.detailsTitle')}
        footer={<Button onClick={() => setSelectedAppointment(null)}>{t('common.actions.close')}</Button>}
      >
        {selectedAppointment ? (
          <div className="space-y-3 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">{formatDate(selectedAppointment.scheduled_start, FRIENDLY_DATE) || t('common.states.tbd')}</p>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">
              {getAppointmentTypeLabel(selectedAppointment, language)}
            </p>
            {selectedAppointment.assigned_admin ? (
              <p>{t('portal.appointment.nailTech', { name: selectedAppointment.assigned_admin.name })}</p>
            ) : null}
            <p>
              {t('portal.appointment.status')}{' '}
              <span className={getStatusBadgeClasses(selectedAppointment.status)}>
                {formatStatusLabel(selectedAppointment.status, language)}
              </span>
            </p>
            {selectedAppointment.service?.notes ? <p>{t('portal.appointment.notes', { notes: selectedAppointment.service.notes })}</p> : null}
          </div>
        ) : null}
      </Dialog>

      <Lightbox open={!!previewImage} image={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
}
