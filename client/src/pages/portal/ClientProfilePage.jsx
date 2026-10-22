import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import Dialog from '../../components/Dialog.jsx';
import SectionTitle from '../../components/SectionTitle.jsx';
import { apiDelete, apiPatch, apiPost, apiUpload, resolveApiUrl } from '../../lib/api.js';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useClientPortal } from '../../contexts/ClientPortalContext.jsx';
import { useLanguage } from '../../contexts/LanguageContext.jsx';
import {
  getClientSideUploadError,
  getUploadErrorMessage,
  isKnownUploadErrorStatus,
  validateDocumentBeforeUpload
} from '../../lib/uploadValidation.js';

// Labels/descriptions live in portal.profile.preferences.<key> and <key>_hint.
const PREFERENCE_CONFIG = [
  { key: 'email_reminders' },
  { key: 'sms_reminders' },
  { key: 'aftercare_emails' }
];

const LONG_DATE = { month: 'long', day: 'numeric', year: 'numeric' };
const KNOWN_DOCUMENT_KINDS = new Set(['document', 'inspiration', 'inspiration_image', 'id_front', 'id_back', 'note', 'description']);

function ToggleSwitch({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-12 items-center rounded-full border border-gray-300 bg-white transition"
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-black transition ${checked ? 'translate-x-6' : 'translate-x-1'
          }`}
      />
    </button>
  );
}

const ACCEPTED_UPLOAD_TYPES = 'image/png,image/jpeg,image/jpg,image/webp,application/pdf,.pdf,.doc,.docx,.txt';
const IMAGE_NAME_PATTERN = /\.(jpe?g|png|webp)$/i;

function isImageFile(file) {
  if (!file) {
    return false;
  }
  if (file.type?.startsWith('image/')) {
    return true;
  }
  if (typeof file.name === 'string') {
    return IMAGE_NAME_PATTERN.test(file.name);
  }
  return false;
}

function isImageName(name) {
  if (!name) {
    return false;
  }
  const urlString = String(name).trim();
  if (urlString.startsWith('data:image/')) {
    return true;
  }
  // Legacy or encrypted private photos served from our backend API 
  // might not have extensions in the URL string natively
  if (urlString.includes('/api/uploads/')) {
    return true;
  }
  return IMAGE_NAME_PATTERN.test(name);
}

export default function ClientProfilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { t, language, formatDate: formatStudioDate } = useLanguage();
  const formatDate = (value) => formatStudioDate(value, LONG_DATE) || '—';
  const documentKindLabel = (kind) => {
    if (!kind) {
      return t('portal.profile.documents.kinds.document');
    }
    return KNOWN_DOCUMENT_KINDS.has(kind) ? t(`portal.profile.documents.kinds.${kind}`) : kind.replace(/_/g, ' ');
  };
  const sourceLabel = (source) =>
    source === 'you' ? t('portal.profile.documents.sourceYou') : t('portal.profile.documents.sourceSalon');
  const {
    loading,
    error,
    profile,
    documents,
    sharedDocuments,
    refresh
  } = useClientPortal();

  const profileRef = useRef(null);
  const inspirationRef = useRef(null);
  const documentsRef = useRef(null);
  const previewRefs = useRef([]);
  const inspirationUploadRef = useRef(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: ''
  });
  const [profileStatus, setProfileStatus] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [preferences, setPreferences] = useState(() => {
    const defaults = {};
    PREFERENCE_CONFIG.forEach((item) => {
      defaults[item.key] = true;
    });
    return defaults;
  });
  const [prefMessage, setPrefMessage] = useState(null);
  const [prefError, setPrefError] = useState(null);
  const [prefSaving, setPrefSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationError, setVerificationError] = useState(null);
  const [sendingVerification, setSendingVerification] = useState(false);

  const [isInspirationOpen, setIsInspirationOpen] = useState(false);
  const [inspirationFiles, setInspirationFiles] = useState([]);
  const [notes, setNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadMessage, setUploadMessage] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!deleteDialogOpen) {
      return;
    }
    setDeleteError(null);
  }, [deleteDialogOpen]);

  useEffect(() => {
    if (!profile) {
      return;
    }
    setProfileForm({
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      email: profile.email || '',
      phone: profile.phone || ''
    });
    if (profile.preferences) {
      setPreferences(profile.preferences);
    }
  }, [profile]);

  useEffect(() => {
    if (!location.state?.focus) {
      return;
    }
    const maybeRef = {
      inspiration: inspirationRef,
      documents: documentsRef,
      profile: profileRef
    }[location.state.focus];
    if (location.state.focus === 'inspiration') {
      setIsInspirationOpen(true);
    }
    if (maybeRef?.current) {
      maybeRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const handleProfileChange = (field) => (event) => {
    setProfileForm((prev) => ({ ...prev, [field]: event.target.value }));
    setProfileStatus(null);
    setProfileError(null);
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (!profile) {
      return;
    }
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileStatus(null);

    const payload = {
      first_name: profileForm.first_name.trim(),
      last_name: profileForm.last_name.trim(),
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim()
    };

    try {
      await apiPatch('/api/account/profile', payload);
      setProfileStatus(t('portal.profile.personal.saved'));
      setIsEditingProfile(false);
      refresh();
    } catch {
      setProfileError(t('portal.profile.personal.failure'));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePreferenceToggle = async (key, value) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setPrefMessage(null);
    setPrefError(null);
    setPrefSaving(true);
    try {
      await apiPatch('/api/account/preferences', { [key]: value });
      setPrefMessage(t('portal.profile.preferences.saved'));
      refresh();
    } catch {
      setPrefError(t('portal.profile.preferences.failure'));
      setPreferences((prev) => ({ ...prev, [key]: !value }));
    } finally {
      setPrefSaving(false);
    }
  };

  const handlePasswordChange = (field) => (event) => {
    setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
    setPasswordStatus(null);
    setPasswordError(null);
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordStatus(null);
    setPasswordError(null);

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError(t('portal.profile.security.mismatch'));
      setPasswordSaving(false);
      return;
    }

    try {
      await apiPost('/api/account/password', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      setPasswordStatus(t('portal.profile.security.passwordUpdated'));
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      refresh();
    } catch (err) {
      // Server text is English-only; show our own copy for the known failures.
      const serverText = String(err?.body?.error || '').toLowerCase();
      let passwordMessage = t('portal.profile.security.passwordFailure');
      if (err?.status === 403) {
        passwordMessage = t('portal.profile.security.wrongPassword');
      } else if (err?.status === 400) {
        passwordMessage = serverText.includes('differ')
          ? t('portal.profile.security.samePassword')
          : t('portal.profile.security.minLength');
      }
      setPasswordError(passwordMessage);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleSendVerification = async () => {
    if (!profile?.email) {
      return;
    }
    setSendingVerification(true);
    setVerificationStatus(null);
    setVerificationError(null);
    try {
      const response = await apiPost('/api/auth/email/verify-request', { email: profile.email });
      setVerificationStatus(
        response?.status === 'already_verified'
          ? t('portal.profile.security.alreadyVerified')
          : t('portal.profile.security.verificationSent')
      );
    } catch {
      setVerificationError(t('portal.profile.security.verificationFailure'));
    } finally {
      setSendingVerification(false);
    }
  };

  const createFileEntries = (files) => {
    return files.map((file) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return {
        id,
        placeholderId: `pending-${id}`,
        file,
        previewUrl: isImageFile(file) ? URL.createObjectURL(file) : null
      };
    });
  };

  const applyFileSelection = (files) => {
    if (!files.length) {
      return;
    }
    const limitedFiles = files.slice(0, 6);
    const validFiles = [];
    let validationReason = null;

    limitedFiles.forEach((file) => {
      const validation = validateDocumentBeforeUpload(file);
      if (validation.isValid) {
        validFiles.push(file);
        return;
      }
      if (!validationReason) {
        validationReason = validation.reason;
      }
    });

    if (!validFiles.length) {
      setUploadError(getClientSideUploadError(validationReason, language));
      return;
    }

    setUploadError(validationReason ? getClientSideUploadError(validationReason, language) : null);
    const nextFiles = createFileEntries(validFiles);
    setInspirationFiles((prev) => {
      prev.forEach((entry) => entry.previewUrl && URL.revokeObjectURL(entry.previewUrl));
      return nextFiles;
    });
    setNotes('');
    setUploadMessage(null);
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    applyFileSelection(files);
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    applyFileSelection(files);
  };

  const handleRemoveFile = (fileId) => {
    setInspirationFiles((prev) => {
      const remaining = prev.filter((entry) => entry.id !== fileId);
      const removed = prev.find((entry) => entry.id === fileId);
      if (removed?.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl);
      }
      return remaining;
    });
  };

  const handleUploadInspiration = async (event) => {
    event.preventDefault();
    if (!inspirationFiles.length) {
      setUploadError(t('portal.profile.uploads.addFile'));
      return;
    }
    for (const entry of inspirationFiles) {
      const validation = validateDocumentBeforeUpload(entry.file);
      if (!validation.isValid) {
        setUploadError(getClientSideUploadError(validation.reason, language));
        return;
      }
    }
    setIsUploading(true);
    setUploadError(null);
    setUploadMessage(null);

    const trimmedNotes = notes.trim();
    try {
      for (const entry of inspirationFiles) {
        const formData = new FormData();
        formData.append('file', entry.file);
        formData.append('kind', isImageFile(entry.file) ? 'inspiration' : 'document');
        formData.append('title', entry.file.name);
        if (trimmedNotes) {
          formData.append('notes', trimmedNotes);
        }
        await apiUpload('/api/account/documents', formData);
      }
      setUploadMessage(t('portal.profile.uploads.success'));
      setNotes('');
      setInspirationFiles((prev) => {
        prev.forEach((entry) => entry.previewUrl && URL.revokeObjectURL(entry.previewUrl));
        return [];
      });
      await refresh();
    } catch (err) {
      // Known statuses get translated copy; other server text is English-only,
      // so outside English fall back to our own message.
      const message =
        isKnownUploadErrorStatus(err) || language === 'en' ? getUploadErrorMessage(err, language) : null;
      setUploadError(message || t('portal.profile.uploads.failure'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAccount = async (event) => {
    event?.preventDefault();
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete('/api/account');
      await logout();
      navigate('/auth', { replace: true });
    } catch (err) {
      if (err?.status === 401) {
        await logout();
        navigate('/auth', { replace: true });
        return;
      }
      setDeleteError(t('portal.profile.danger.failure'));
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    previewRefs.current = inspirationFiles;
  }, [inspirationFiles]);

  useEffect(() => {
    return () => {
      previewRefs.current.forEach((entry) => entry.previewUrl && URL.revokeObjectURL(entry.previewUrl));
    };
  }, []);

  const openDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (isDeleting) {
      return;
    }
    setDeleteDialogOpen(false);
  };

  const combinedDocuments = useMemo(() => {
    const list = [...(documents || []), ...(sharedDocuments || [])];
    return list.sort((a, b) => {
      const aDate = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });
  }, [documents, sharedDocuments]);

  const profileName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.email || t('portal.profile.fallbackName');
  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.trim().toUpperCase() || 'YO';
  const memberSince = formatDate(profile?.created_at);
  const lastLogin = formatDate(profile?.last_login_at);
  const lastPasswordChange = formatDate(profile?.last_password_change_at);
  const emailVerified = !!profile?.email_verified;

  const focusInspirationUpload = () => {
    setIsInspirationOpen(true);
    inspirationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDropZoneKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      inspirationUploadRef.current?.click();
    }
  };

  if (loading) {
    return (
      <main className="space-y-8">
        <SectionTitle eyebrow={t('portal.eyebrow')} title={t('portal.profile.title')} description={t('portal.profile.loading')} />
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-8">
        <SectionTitle eyebrow={t('portal.eyebrow')} title={t('portal.profile.title')} description={t('common.states.somethingWrong')} />
        <Card className="text-xs uppercase tracking-[0.3em] text-rose-600">{error}</Card>
        <Button variant="secondary" onClick={() => navigate('/auth')}>
          {t('portal.errors.returnToSignIn')}
        </Button>
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-gray-100 via-white to-gray-100 p-6 shadow-lg ring-1 ring-black/5 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold uppercase text-white shadow-lg shadow-indigo-200">
              {initials}
            </div>
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.35em] text-gray-500">{t('portal.profile.title')}</p>
              <h1 className="text-3xl font-semibold text-gray-900">{profileName}</h1>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 shadow-sm ring-1 ring-black/5 backdrop-blur">
                  <span aria-hidden="true">✨</span> {t('portal.profile.memberSince', { date: memberSince })}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-100">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {t('portal.profile.active')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => setIsEditingProfile((prev) => !prev)}>
              {isEditingProfile ? t('portal.profile.cancelEdit') : t('portal.profile.editProfile')}
            </Button>
            <Button onClick={() => navigate('/appointments/new')}>{t('portal.profile.bookAppointment')}</Button>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/80 p-4 text-sm text-gray-600 shadow-sm ring-1 ring-black/5 backdrop-blur">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-gray-500">{t('portal.profile.fields.email')}</p>
            <p className="truncate text-base font-semibold text-gray-900">{profile?.email || '—'}</p>
          </div>
          <div className="rounded-2xl bg-white/80 p-4 text-sm text-gray-600 shadow-sm ring-1 ring-black/5 backdrop-blur">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-gray-500">{t('portal.profile.fields.phone')}</p>
            <p className="text-base font-semibold text-gray-900">{profile?.phone || '—'}</p>
          </div>
          <div className="rounded-2xl bg-white/80 p-4 text-sm text-gray-600 shadow-sm ring-1 ring-black/5 backdrop-blur">
            <p className="text-[0.65rem] uppercase tracking-[0.35em] text-gray-500">{t('portal.profile.fields.lastLogin')}</p>
            <p className="text-base font-semibold text-gray-900">{lastLogin}</p>
          </div>
        </div>
      </section>

      <Card ref={profileRef} className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.personal.title')}</p>
            <p className="text-sm text-gray-500">{t('portal.profile.personal.hint')}</p>
          </div>
          <Button variant="ghost" onClick={() => setIsEditingProfile((prev) => !prev)}>
            {isEditingProfile ? t('portal.profile.personal.exitEdit') : t('portal.profile.personal.editDetails')}
          </Button>
        </div>
        {isEditingProfile ? (
          <form className="space-y-5" onSubmit={handleProfileSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.fields.firstName')}</span>
                <input
                  value={profileForm.first_name}
                  onChange={handleProfileChange('first_name')}
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-black"
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.fields.lastName')}</span>
                <input
                  value={profileForm.last_name}
                  onChange={handleProfileChange('last_name')}
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-black"
                  required
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.fields.email')}</span>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={handleProfileChange('email')}
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-black"
                  required
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.fields.phone')}</span>
                <input
                  value={profileForm.phone}
                  onChange={handleProfileChange('phone')}
                  className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-black"
                />
              </label>
            </div>
            {profileStatus ? <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">{profileStatus}</p> : null}
            {profileError ? <p className="text-xs uppercase tracking-[0.3em] text-rose-600">{profileError}</p> : null}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? t('common.states.saving') : t('portal.profile.personal.save')}
              </Button>
              <Button variant="ghost" onClick={() => setIsEditingProfile(false)} disabled={isSavingProfile}>
                {t('common.actions.cancel')}
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 p-4 text-gray-700 ring-1 ring-gray-200">
              <dt className="text-[0.65rem] uppercase tracking-[0.35em] text-gray-500">{t('portal.profile.fields.firstName')}</dt>
              <dd className="text-base font-semibold">{profile?.first_name || '—'}</dd>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 text-gray-700 ring-1 ring-gray-200">
              <dt className="text-[0.65rem] uppercase tracking-[0.35em] text-gray-500">{t('portal.profile.fields.lastName')}</dt>
              <dd className="text-base font-semibold">{profile?.last_name || '—'}</dd>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 text-gray-700 ring-1 ring-gray-200">
              <dt className="text-[0.65rem] uppercase tracking-[0.35em] text-gray-500">{t('portal.profile.fields.email')}</dt>
              <dd className="text-base font-semibold">{profile?.email || '—'}</dd>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 text-gray-700 ring-1 ring-gray-200">
              <dt className="text-[0.65rem] uppercase tracking-[0.35em] text-gray-500">{t('portal.profile.fields.phone')}</dt>
              <dd className="text-base font-semibold">{profile?.phone || '—'}</dd>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 text-gray-700 ring-1 ring-gray-200">
              <dt className="text-[0.65rem] uppercase tracking-[0.35em] text-gray-500">{t('portal.profile.memberSinceLabel')}</dt>
              <dd className="text-base font-semibold">{memberSince}</dd>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 text-gray-700 ring-1 ring-gray-200">
              <dt className="text-[0.65rem] uppercase tracking-[0.35em] text-gray-500">{t('portal.profile.fields.lastLogin')}</dt>
              <dd className="text-base font-semibold">{lastLogin}</dd>
            </div>
          </dl>
        )}
      </Card>

      <Card className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.security.title')}</p>
            <p className="text-sm text-gray-500">{t('portal.profile.security.hint')}</p>
          </div>
          {passwordStatus ? (
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">{passwordStatus}</p>
          ) : null}
          {passwordError ? (
            <p className="text-xs uppercase tracking-[0.3em] text-rose-600">{passwordError}</p>
          ) : null}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.security.verificationTitle')}</p>
            <p className="mt-1 text-sm text-gray-700">
              {emailVerified ? t('portal.profile.security.verified') : t('portal.profile.security.unverified')}
            </p>
            <p className="mt-2 text-[0.7rem] uppercase tracking-[0.25em] text-gray-500">
              {t('portal.profile.security.lastPasswordChange', { date: lastPasswordChange })}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" variant={emailVerified ? 'secondary' : 'primary'} onClick={handleSendVerification} disabled={sendingVerification || !profile?.email}>
                {sendingVerification
                  ? t('common.states.sending')
                  : emailVerified
                    ? t('portal.profile.security.resendCode')
                    : t('portal.profile.security.sendVerification')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  navigate(
                    `/verify-email${profile?.email ? `?email=${encodeURIComponent(profile.email)}` : ''}`
                  )
                }
              >
                {t('portal.profile.security.enterCode')}
              </Button>
            </div>
            {verificationStatus ? (
              <p className="mt-3 text-xs uppercase tracking-[0.3em] text-emerald-600">{verificationStatus}</p>
            ) : null}
            {verificationError ? (
              <p className="mt-3 text-xs uppercase tracking-[0.3em] text-rose-600">{verificationError}</p>
            ) : null}
          </div>
          <form className="space-y-3 rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200" onSubmit={handlePasswordSubmit}>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.security.passwordTitle')}</p>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.security.currentPassword')}</span>
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={handlePasswordChange('current_password')}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-black"
                required
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.security.newPassword')}</span>
              <input
                type="password"
                value={passwordForm.new_password}
                onChange={handlePasswordChange('new_password')}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-black"
                required
                minLength={8}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.security.confirmPassword')}</span>
              <input
                type="password"
                value={passwordForm.confirm_password}
                onChange={handlePasswordChange('confirm_password')}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-black"
                required
                minLength={8}
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={passwordSaving}>
                {passwordSaving ? t('common.states.saving') : t('portal.profile.security.updatePassword')}
              </Button>
              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gray-500">
                {t('portal.profile.security.minLength')}
              </p>
            </div>
          </form>
        </div>
      </Card>

      <Card ref={documentsRef} className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.documents.title')}</p>
            <p className="text-sm text-gray-500">{t('portal.profile.documents.hint')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={focusInspirationUpload}>
              {t('portal.profile.documents.uploadFiles')}
            </Button>
            <Button variant="secondary" onClick={() => navigate('/appointments/new')}>
              {t('portal.profile.bookAppointment')}
            </Button>
          </div>
        </div>
        {combinedDocuments.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {combinedDocuments.map((document) => (
              <article
                key={document.id}
                className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white/80 p-4 text-sm text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                  {isImageName(document.file_url || document.title) ? (
                    <img
                      src={resolveApiUrl(document.file_url)}
                      alt={document.title || t('portal.profile.documents.uploadedFile')}
                      className="h-36 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center text-3xl" aria-hidden="true">
                      📄
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{document.title}</p>
                    <p className="text-[0.6rem] uppercase tracking-[0.35em] text-gray-500">
                      {documentKindLabel(document.kind)}
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-gray-600">
                    {sourceLabel(document.source)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{document.notes}</p>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[0.65rem] uppercase tracking-[0.35em] text-gray-500">
                  <span>{formatDate(document.created_at)}</span>
                  <Button
                    as="a"
                    variant="ghost"
                    href={resolveApiUrl(document.file_url)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('portal.profile.documents.viewDownload')}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 px-6 py-10 text-center text-gray-500">
            <div className="text-3xl" aria-hidden="true">📁</div>
            <p className="mt-2 text-sm font-semibold text-gray-700">{t('portal.profile.documents.emptyTitle')}</p>
            <p className="text-xs text-gray-500">{t('portal.profile.documents.emptyHint')}</p>
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.preferences.title')}</p>
            <p className="text-sm text-gray-500">{t('portal.profile.preferences.hint')}</p>
          </div>
          {prefSaving ? <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('common.states.saving')}</p> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {PREFERENCE_CONFIG.map((preference) => (
            <div
              key={preference.key}
              className="flex items-start justify-between rounded-2xl bg-gray-50 p-4 ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:ring-black/10"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-900">{t(`portal.profile.preferences.${preference.key}`)}</p>
                <p className="text-xs text-gray-500">{t(`portal.profile.preferences.${preference.key}_hint`)}</p>
              </div>
              <ToggleSwitch
                label={t(`portal.profile.preferences.${preference.key}`)}
                checked={!!preferences[preference.key]}
                disabled={prefSaving}
                onChange={(value) => handlePreferenceToggle(preference.key, value)}
              />
            </div>
          ))}
        </div>
        {prefMessage ? <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">{prefMessage}</p> : null}
        {prefError ? <p className="text-xs uppercase tracking-[0.3em] text-rose-600">{prefError}</p> : null}
      </Card>

      <Card ref={inspirationRef} className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.uploads.title')}</p>
            <p className="text-sm text-gray-500">{t('portal.profile.uploads.hint')}</p>
          </div>
          <Button variant="ghost" onClick={() => setIsInspirationOpen((prev) => !prev)}>
            {isInspirationOpen ? t('portal.profile.uploads.hide') : t('portal.profile.uploads.open')}
          </Button>
        </div>
        {isInspirationOpen ? (
          <form className="space-y-4" onSubmit={handleUploadInspiration}>
            <div>
              <input
                ref={inspirationUploadRef}
                type="file"
                id="inspiration-upload"
                multiple
                accept={ACCEPTED_UPLOAD_TYPES}
                onChange={handleFileChange}
                className="sr-only"
              />
              <div
                role="button"
                tabIndex={0}
                aria-label={t('portal.profile.uploads.dropZoneLabel')}
                onClick={() => inspirationUploadRef.current?.click()}
                onKeyDown={handleDropZoneKeyDown}
                className="mt-1 cursor-pointer rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 p-6 text-center shadow-inner transition hover:border-indigo-400 hover:bg-white"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <label htmlFor="inspiration-upload" className="flex flex-col items-center gap-2">
                  <span className="text-3xl" aria-hidden="true">📤</span>
                  <span className="text-sm font-semibold text-gray-800">{t('portal.profile.uploads.dropTitle')}</span>
                  <span className="text-xs text-gray-500">{t('portal.profile.uploads.dropHint')}</span>
                </label>
                <p className="mt-3 text-[0.7rem] text-gray-500">
                  {inspirationFiles.length
                    ? t('portal.profile.uploads.ready', { count: inspirationFiles.length })
                    : t('portal.profile.uploads.noneSelected')}
                </p>
              </div>
              {inspirationFiles.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {inspirationFiles.map((file) => (
                    <div
                      key={file.id}
                      className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold uppercase tracking-[0.3em] text-gray-500">{file.file.name}</p>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          aria-label={t('portal.profile.uploads.removeFile', { name: file.file.name })}
                          className="text-[0.6rem] uppercase tracking-[0.4em] text-gray-400 hover:text-rose-500"
                        >
                          {t('common.actions.remove')}
                        </button>
                      </div>
                      {file.previewUrl ? (
                        <img src={file.previewUrl} alt={file.file.name} className="mt-2 h-28 w-full rounded-xl object-cover" />
                      ) : (
                        <div className="mt-2 flex h-28 items-center justify-center rounded-xl bg-gray-100 text-[0.7rem] text-gray-500">
                          {t('portal.profile.uploads.previewUnavailable')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <label className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.uploads.notesLabel')}</span>
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-black"
              />
            </label>
            {uploadError ? <p className="text-xs uppercase tracking-[0.3em] text-rose-600">{uploadError}</p> : null}
            {uploadMessage ? <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">{uploadMessage}</p> : null}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isUploading || !inspirationFiles.length}>
                {isUploading ? t('portal.profile.uploads.uploading') : t('portal.profile.uploads.submit')}
              </Button>
              <p className="text-xs text-gray-500">{t('portal.profile.uploads.keepLatest')}</p>
            </div>
          </form>
        ) : null}
        {documents?.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {documents.map((document) => (
              <article
                key={document.id}
                className="rounded-2xl border border-gray-200 bg-white/80 p-3 text-sm text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                  {isImageName(document.file_url || document.title) ? (
                    <img
                      src={resolveApiUrl(document.file_url)}
                      alt={document.title || t('portal.profile.documents.uploadedFile')}
                      className="h-32 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center text-2xl" aria-hidden="true">
                      📄
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{document.title}</p>
                    <p className="text-[0.55rem] uppercase tracking-[0.4em] text-gray-500">{documentKindLabel(document.kind)}</p>
                  </div>
                  <span className="text-[0.6rem] font-semibold uppercase tracking-[0.4em] text-gray-500">
                    {sourceLabel(document.source)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{document.notes}</p>
                <div className="mt-3 flex items-center justify-between text-[0.6rem] uppercase tracking-[0.3em] text-gray-500">
                  <span>{formatDate(document.created_at)}</span>
                  <a href={resolveApiUrl(document.file_url)} target="_blank" rel="noreferrer" className="font-semibold text-gray-900 underline">
                    {t('portal.profile.documents.viewFile')}
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-xs uppercase tracking-[0.3em] text-gray-500">{t('portal.profile.uploads.empty')}</p>
        )}
      </Card>

      <Card className="space-y-4 border-rose-200/80 bg-rose-50/80 text-rose-900 ring-1 ring-rose-200">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-rose-700">{t('portal.profile.danger.title')}</p>
            <p className="text-sm text-rose-800">{t('portal.profile.danger.hint')}</p>
          </div>
          <Button variant="secondary" onClick={openDeleteDialog}>
            {t('portal.profile.danger.deleteAccount')}
          </Button>
        </div>
      </Card>

      <Dialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        title={t('portal.profile.danger.dialogTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={closeDeleteDialog} disabled={isDeleting}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              form="delete-account-form"
              type="submit"
              variant="secondary"
              disabled={isDeleting}
            >
              {isDeleting ? t('portal.profile.danger.deleting') : t('portal.profile.danger.deleteAccount')}
            </Button>
          </>
        }
      >
        <form
          id="delete-account-form"
          className="space-y-4"
          onSubmit={handleDeleteAccount}
        >
          <p className="text-sm text-gray-600">
            {t('portal.profile.danger.confirmText')}
          </p>
          {deleteError ? <p className="text-xs uppercase tracking-[0.3em] text-rose-600">{deleteError}</p> : null}
        </form>
      </Dialog>
    </main>
  );
}
