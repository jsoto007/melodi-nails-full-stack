import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import Dialog from '../../components/Dialog.jsx';
import SectionTitle from '../../components/SectionTitle.jsx';
import Tabs from '../../components/Tabs.jsx';
import { getLocalizedServiceName, useClientPortal } from '../../contexts/ClientPortalContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import { getAppointmentTypeLabel } from '../../lib/appointments.js';
import { formatStatusLabel, getStatusBadgeClasses } from '../../lib/statusStyles.js';

const PAST_STATUSES = new Set(['cancelled', 'cancelled_by_client', 'declined', 'completed', 'no_show']);

const SHORT_DATE = { month: 'short', day: 'numeric' };

export default function ClientAppointmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, language, formatDate: formatStudioDate, formatTime: formatStudioTime } = useLanguage();
  const formatDate = (value) => formatStudioDate(value, SHORT_DATE) || t('common.states.tbd');
  const formatTime = (value) => formatStudioTime(value) || t('common.states.tbd');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [actionDialog, setActionDialog] = useState(null);
  const { loading, error, appointments } = useClientPortal();

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

  const pastAppointments = useMemo(() => {
    const now = Date.now();
    return [...(appointments || [])]
      .filter((appointment) => {
        const isPastStatus = PAST_STATUSES.has(appointment.status);
        const start = appointment.scheduled_start ? new Date(appointment.scheduled_start).getTime() : null;
        if (isPastStatus) {
          return true;
        }
        if (start && start < now) {
          return true;
        }
        return false;
      })
      .sort((a, b) => {
        const aTime = a.scheduled_start ? new Date(a.scheduled_start).getTime() : 0;
        const bTime = b.scheduled_start ? new Date(b.scheduled_start).getTime() : 0;
        return bTime - aTime;
      });
  }, [appointments]);

  useEffect(() => {
    const focusId = location.state?.focus;
    if (!focusId || !appointments?.length) {
      return;
    }
    const target = appointments.find((appointment) => String(appointment.id) === String(focusId));
    if (target) {
      setSelectedAppointment(target);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, appointments]);

  const handleActionClick = (type, appointment) => {
    setActionDialog({ type, appointment });
  };

  const buildActionMessage = () => {
    if (!actionDialog) {
      return null;
    }
    if (actionDialog.type === 'reschedule') {
      return t('portal.appointment.rescheduleMessage');
    }
    if (actionDialog.type === 'cancel') {
      return t('portal.appointment.cancelMessage');
    }
    return null;
  };

  const renderAppointmentList = (items, variant) => {
    if (!items.length) {
      const message = variant === 'upcoming'
        ? t('portal.appointments.emptyUpcoming')
        : t('portal.appointments.emptyPast');
      return (
        <Card className="flex flex-col items-start gap-3 text-xs uppercase tracking-[0.3em] text-gray-500">
          <p>{message}</p>
          <Button as={Link} to="/appointments/new" variant="ghost">
            {t('portal.layout.bookAppointment')}
          </Button>
        </Card>
      );
    }
    return (
      <div className="space-y-4">
        {items.map((appointment) => {
          const serviceName = getLocalizedServiceName(appointment, language);
          return (
            <article
              key={appointment.id}
              className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/80 p-4 text-sm text-gray-700 shadow-sm sm:flex-row sm:items-center"
            >
              <div className="w-full sm:w-32">
                <p className="text-xs uppercase tracking-[0.4em] text-gray-500">{formatDate(appointment.scheduled_start)}</p>
                <p className="text-lg font-semibold text-gray-900">{formatTime(appointment.scheduled_start)}</p>
              </div>
              <div className="flex-1 space-y-1">
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
                <Button variant="ghost" onClick={() => setSelectedAppointment(appointment)}>
                  {t('portal.appointment.viewDetails')}
                </Button>
                {variant === 'upcoming' ? (
                  <>
                    <Button variant="ghost" onClick={() => handleActionClick('reschedule', appointment)}>
                      {t('portal.appointment.reschedule')}
                    </Button>
                    <Button variant="ghost" onClick={() => handleActionClick('cancel', appointment)}>
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
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <main className="space-y-6">
        <SectionTitle eyebrow={t('portal.eyebrow')} title={t('portal.appointments.title')} description={t('portal.appointments.loading')} />
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-6">
        <SectionTitle eyebrow={t('portal.eyebrow')} title={t('portal.appointments.title')} description={t('common.states.somethingWrong')} />
        <Card className="text-xs uppercase tracking-[0.3em] text-rose-600">{error}</Card>
        <Button as={Link} to="/auth" variant="secondary">
          {t('portal.errors.returnToSignIn')}
        </Button>
      </main>
    );
  }

  const tabs = [
    { id: 'upcoming', label: t('portal.appointments.tabs.upcoming') },
    { id: 'past', label: t('portal.appointments.tabs.past') }
  ];

  return (
    <div className="space-y-6">
      <SectionTitle eyebrow={t('portal.eyebrow')} title={t('portal.appointments.title')} description={t('portal.appointments.description')} />
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.appointments.cardTitle')}</p>
            <p className="text-sm text-gray-500">{t('portal.appointments.cardHint')}</p>
          </div>
          <Button as={Link} to="/appointments/new">
            {t('portal.layout.bookAppointment')}
          </Button>
        </div>
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} renderPanel={(tabId) => {
          if (tabId === 'upcoming') {
            return renderAppointmentList(upcomingAppointments, 'upcoming');
          }
          return renderAppointmentList(pastAppointments, 'past');
        }} />
      </Card>

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
            <p className="font-semibold text-gray-900">{formatDate(selectedAppointment.scheduled_start)} · {formatTime(selectedAppointment.scheduled_start)}</p>
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
    </div>
  );
}
