import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { apiDelete, apiGet, apiPatch, apiPost } from '../lib/api.js';

const ASSET_KIND_OPTIONS = [
  { value: 'note', label: 'Admin note' },
  { value: 'inspiration_image', label: 'Reference image' },
  { value: 'document', label: 'Document' }
];

const INITIAL_CATEGORY = { name: '', description: '', is_active: true };
const INITIAL_GALLERY_DRAFT = { category_id: '', uploaded_by_admin_id: '', image_url: '', alt: '', caption: '', is_published: true };

function toDateTimeLocal(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (input) => input.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function fromDateTimeLocal(value) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function createInitialAssetDraft() {
  return {
    kind: 'note',
    file_url: '',
    note_text: '',
    is_visible_to_client: false
  };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const [admins, setAdmins] = useState([]);
  const [categories, setCategories] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [categoryDrafts, setCategoryDrafts] = useState({});
  const [newCategory, setNewCategory] = useState(INITIAL_CATEGORY);
  const [galleryDraft, setGalleryDraft] = useState(INITIAL_GALLERY_DRAFT);
  const [appointmentDrafts, setAppointmentDrafts] = useState({});
  const [assetDrafts, setAssetDrafts] = useState({});

  const [savingCategoryId, setSavingCategoryId] = useState(null);
  const [savingAppointmentId, setSavingAppointmentId] = useState(null);
  const [updatingAssetKey, setUpdatingAssetKey] = useState(null);

  const [overview, setOverview] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [activityTracking, setActivityTracking] = useState([]);
  const [analytics, setAnalytics] = useState({ appointments_by_status: {}, gallery_items_by_category: {} });
  const [settings, setSettings] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [userRoleDrafts, setUserRoleDrafts] = useState({});

  const categoryOptions = useMemo(
    () => categories.map((category) => ({ value: category.id, label: category.name })),
    [categories]
  );
  const adminOptions = useMemo(() => admins.map((admin) => ({ value: admin.id, label: admin.name })), [admins]);

  useEffect(() => {
    let ignore = false;

    async function checkSession() {
      try {
        const session = await apiGet('/api/auth/session');
        if (ignore) {
          return;
        }
        if (session?.role !== 'admin') {
          navigate('/auth', { replace: true });
          return;
        }
        setCurrentAdmin(session.account);
        await refreshAdminData();
      } catch (err) {
        if (!ignore) {
          if (err.status === 401) {
            navigate('/auth', { replace: true });
          } else {
            setError('Unable to verify admin session.');
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    async function refreshAdminData() {
      try {
        setLoading(true);
        const [dashboard, adminsResponse, categoriesResponse, appointmentsResponse] = await Promise.all([
          apiGet('/api/dashboard/admin'),
          apiGet('/api/admin/admins'),
          apiGet('/api/admin/categories'),
          apiGet('/api/admin/appointments')
        ]);

        if (ignore) {
          return;
        }

        setAdmins(adminsResponse || []);
        setCategories(categoriesResponse || []);
        setAppointments(appointmentsResponse || []);

        hydrateCategoryDrafts(categoriesResponse);
        hydrateGalleryDraft(categoriesResponse, adminsResponse);
        hydrateAppointments(appointmentsResponse);

        setOverview(dashboard.overview || null);
        const recentUserList = dashboard.user_management?.recent_users || [];
        setRecentUsers(recentUserList);
        setAvailableRoles(dashboard.user_management?.available_roles || []);
        setUserRoleDrafts(
          recentUserList.reduce((acc, user) => {
            acc[user.id] = user.role;
            return acc;
          }, {})
        );
        setActivityTracking(dashboard.activity_tracking || []);
        setAnalytics(dashboard.analytics || { appointments_by_status: {}, gallery_items_by_category: {} });
        setSettings(dashboard.system_settings || []);
        setError(null);
      } catch (err) {
        if (!ignore) {
          setError('Unable to load admin dashboard.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      ignore = true;
    };
  }, [navigate]);

  const hydrateCategoryDrafts = (categoryData) => {
    const drafts = {};
    (categoryData || []).forEach((category) => {
      drafts[category.id] = {
        name: category.name,
        description: category.description || '',
        is_active: category.is_active
      };
    });
    setCategoryDrafts(drafts);
  };

  const hydrateGalleryDraft = (categoryData, adminData) => {
    setGalleryDraft((prev) => ({
      ...prev,
      category_id: prev.category_id || categoryData?.[0]?.id || '',
      uploaded_by_admin_id: prev.uploaded_by_admin_id || adminData?.[0]?.id || ''
    }));
  };

  const hydrateAppointments = (appointmentData) => {
    const appointmentForms = {};
    const assetForms = {};
    (appointmentData || []).forEach((appointment) => {
      appointmentForms[appointment.id] = {
        status: appointment.status || 'pending',
        scheduled_start: toDateTimeLocal(appointment.scheduled_start),
        duration_minutes: appointment.duration_minutes ?? '',
        client_description: appointment.client_description || '',
        assigned_admin_id: appointment.assigned_admin?.id || ''
      };
      assetForms[appointment.id] = createInitialAssetDraft();
    });
    setAppointmentDrafts(appointmentForms);
    setAssetDrafts(assetForms);
  };

  const refreshCategories = async () => {
    try {
      const response = await apiGet('/api/admin/categories');
      setCategories(response || []);
      hydrateCategoryDrafts(response);
      hydrateGalleryDraft(response, admins);
    } catch {
      setFeedback({ tone: 'offline', message: 'Unable to refresh categories.' });
    }
  };

  const refreshAppointments = async () => {
    try {
      const response = await apiGet('/api/admin/appointments');
      setAppointments(response || []);
      hydrateAppointments(response);
    } catch {
      setFeedback({ tone: 'offline', message: 'Unable to refresh appointments.' });
    }
  };

  const refreshRecentUsers = async () => {
    try {
      const dashboard = await apiGet('/api/dashboard/admin');
      const recentUserList = dashboard.user_management?.recent_users || [];
      setRecentUsers(recentUserList);
      setAvailableRoles(dashboard.user_management?.available_roles || []);
      setUserRoleDrafts(
        recentUserList.reduce((acc, user) => {
          acc[user.id] = user.role;
          return acc;
        }, {})
      );
    } catch {
      setFeedback({ tone: 'offline', message: 'Unable to refresh users.' });
    }
  };

  const handleLogout = async () => {
    try {
      await apiPost('/api/auth/logout', {});
    } catch {
      // Ignore logout errors
    } finally {
      navigate('/auth', { replace: true });
    }
  };

  const handleNewCategoryChange = (field) => (event) => {
    setNewCategory((prev) => ({
      ...prev,
      [field]: field === 'is_active' ? event.target.checked : event.target.value
    }));
  };

  const handleCategoryDraftChange = (categoryId, field) => (event) => {
    const value = field === 'is_active' ? event.target.checked : event.target.value;
    setCategoryDrafts((prev) => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        [field]: value
      }
    }));
  };

  const handleGalleryDraftChange = (field) => (event) => {
    const value = field === 'is_published' ? event.target.checked : event.target.value;
    setGalleryDraft((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAppointmentDraftChange = (appointmentId, field) => (event) => {
    const value =
      field === 'duration_minutes'
        ? event.target.value.replace(/\D/g, '')
        : field === 'assigned_admin_id'
        ? event.target.value
        : event.target.value;
    setAppointmentDrafts((prev) => ({
      ...prev,
      [appointmentId]: {
        ...prev[appointmentId],
        [field]: value
      }
    }));
  };

  const handleAssetDraftChange = (appointmentId, field) => (event) => {
    const value = field === 'is_visible_to_client' ? event.target.checked : event.target.value;
    setAssetDrafts((prev) => ({
      ...prev,
      [appointmentId]: {
        ...prev[appointmentId],
        [field]: value
      }
    }));
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    if (!newCategory.name.trim()) {
      setFeedback({ tone: 'offline', message: 'Category name is required.' });
      return;
    }
    try {
      await apiPost('/api/admin/categories', {
        name: newCategory.name.trim(),
        description: newCategory.description.trim() || null,
        is_active: newCategory.is_active
      });
      setFeedback({ tone: 'success', message: 'Category created.' });
      setNewCategory(INITIAL_CATEGORY);
      await refreshCategories();
    } catch {
      setFeedback({ tone: 'offline', message: 'Unable to create category.' });
    }
  };

  const handleCategorySave = async (category) => {
    const draft = categoryDrafts[category.id];
    if (!draft || !draft.name.trim()) {
      setFeedback({ tone: 'offline', message: 'Name is required.' });
      return;
    }
    setSavingCategoryId(category.id);
    try {
      await apiPatch(`/api/admin/categories/${category.id}`, {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        is_active: draft.is_active
      });
      setFeedback({ tone: 'success', message: 'Category updated.' });
      await refreshCategories();
    } catch {
      setFeedback({ tone: 'offline', message: 'Unable to update category.' });
    } finally {
      setSavingCategoryId(null);
    }
  };

  const handleCategoryVisibility = async (category, isActive) => {
    setSavingCategoryId(category.id);
    try {
      await apiPatch(`/api/admin/categories/${category.id}`, { is_active: isActive });
      setFeedback({ tone: 'success', message: `Category ${isActive ? 'activated' : 'hidden'}.` });
      await refreshCategories();
    } catch {
      setFeedback({ tone: 'offline', message: 'Unable to update category.' });
    } finally {
      setSavingCategoryId(null);
    }
  };

  const handleCategoryDelete = async (categoryId) => {
    if (!window.confirm('Delete this category? Existing gallery items will also be removed.')) {
      return;
    }
    setSavingCategoryId(categoryId);
    try {
      await apiDelete(`/api/admin/categories/${categoryId}`);
      setFeedback({ tone: 'success', message: 'Category deleted.' });
      await refreshCategories();
    } catch {
      setFeedback({ tone: 'offline', message: 'Unable to delete category.' });
    } finally {
      setSavingCategoryId(null);
    }
  };

  const handleGallerySubmit = async (event) => {
    event.preventDefault();
    if (!galleryDraft.category_id || !galleryDraft.uploaded_by_admin_id || !galleryDraft.image_url.trim() || !galleryDraft.alt.trim()) {
      setFeedback({ tone: 'offline', message: 'Complete required gallery fields.' });
      return;
    }
    try {
      await apiPost('/api/admin/gallery', {
        category_id: Number(galleryDraft.category_id),
        uploaded_by_admin_id: Number(galleryDraft.uploaded_by_admin_id),
        image_url: galleryDraft.image_url.trim(),
        alt: galleryDraft.alt.trim(),
        caption: galleryDraft.caption.trim() || null,
        is_published: galleryDraft.is_published
      });
      setFeedback({ tone: 'success', message: 'Gallery item published.' });
      setGalleryDraft((prev) => ({
        ...prev,
        image_url: '',
        alt: '',
        caption: ''
      }));
    } catch {
      setFeedback({ tone: 'offline', message: 'Unable to create gallery item.' });
    }
  };

  const handleAppointmentSave = async (appointmentId) => {
    const draft = appointmentDrafts[appointmentId];
    if (!draft) {
      return;
    }
    setSavingAppointmentId(appointmentId);
    try {
      await apiPatch(`/api/admin/appointments/${appointmentId}`, {
        status: draft.status?.trim() || 'pending',
        scheduled_start: draft.scheduled_start ? fromDateTimeLocal(draft.scheduled_start) : null,
        duration_minutes: draft.duration_minutes ? Number(draft.duration_minutes) : null,
        client_description: draft.client_description?.trim() || null,
        assigned_admin_id: draft.assigned_admin_id ? Number(draft.assigned_admin_id) : null
      });
      setFeedback({ tone: 'success', message: 'Appointment updated.' });
      await refreshAppointments();
    } catch {
      setFeedback({ tone: 'offline', message: 'Unable to update appointment.' });
    } finally {
      setSavingAppointmentId(null);
    }
  };

  const handleAssetCreate = async (appointmentId) => {
    const draft = assetDrafts[appointmentId];
    if (!draft || !draft.kind) {
      setFeedback({ tone: 'offline', message: 'Select an asset type.' });
      return;
    }
    if (!draft.file_url.trim() && !draft.note_text.trim()) {
      setFeedback({ tone: 'offline', message: 'Provide a file URL or note text.' });
      return;
    }
    const cacheKey = `${appointmentId}:new`;
    setUpdatingAssetKey(cacheKey);
    try {
      await apiPost(`/api/admin/appointments/${appointmentId}/assets`, {
        kind: draft.kind,
        file_url: draft.file_url.trim() || null,
        note_text: draft.note_text.trim() || null,
        is_visible_to_client: draft.is_visible_to_client,
        uploaded_by_admin_id: currentAdmin.id
      });
      setFeedback({ tone: 'success', message: 'Asset attached.' });
      setAssetDrafts((prev) => ({
        ...prev,
        [appointmentId]: {
          ...createInitialAssetDraft(),
          kind: draft.kind,
          is_visible_to_client: draft.is_visible_to_client
        }
      }));
      await refreshAppointments();
    } catch {
      setFeedback({ tone: 'offline', message: 'Unable to attach asset.' });
    } finally {
      setUpdatingAssetKey(null);
    }
  };

  const handleAssetVisibilityToggle = async (appointmentId, asset) => {
    const cacheKey = `${appointmentId}:${asset.id}`;
    setUpdatingAssetKey(cacheKey);
    try {
      await apiPatch(`/api/admin/appointments/${appointmentId}/assets/${asset.id}`, {
        is_visible_to_client: !asset.is_visible_to_client
      });
      setFeedback({
        tone: 'success',
        message: `Asset ${!asset.is_visible_to_client ? 'shared with client' : 'hidden from client'}.`
      });
      await refreshAppointments();
    } catch {
      setFeedback({ tone: 'offline', message: 'Unable to update asset visibility.' });
    } finally {
      setUpdatingAssetKey(null);
    }
  };

  const handleUserRoleChange = async (userId, role) => {
    setUserRoleDrafts((prev) => ({
      ...prev,
      [userId]: role
    }));
    try {
      await apiPatch(`/api/admin/users/${userId}/role`, { role });
      setFeedback({ tone: 'success', message: 'Role updated.' });
      await refreshRecentUsers();
    } catch {
      setFeedback({ tone: 'offline', message: 'Unable to update role.' });
    }
  };

  if (loading && !currentAdmin) {
    return (
      <main className="bg-gray-50 py-16 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6">
          <SectionTitle eyebrow="Admin" title="Studio control center" description="Loading secure tools..." />
        </div>
      </main>
    );
  }

  if (!currentAdmin) {
    return null;
  }

  return (
    <main className="bg-gray-50 py-16 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionTitle
            eyebrow="Admin"
            title="Studio control center"
            description="Manage categories, publish portfolio updates, and track appointment assets without leaving the dashboard."
          />
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
              Signed in as {currentAdmin.name}
            </p>
            <Button type="button" variant="secondary" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
        {feedback ? (
          <div
            className={`rounded-2xl border px-6 py-4 text-xs uppercase tracking-[0.3em] ${
              feedback.tone === 'success'
                ? 'border-gray-200 bg-white text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200'
                : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-rose-500 bg-rose-50 px-6 py-4 text-xs uppercase tracking-[0.3em] text-rose-700 dark:border-rose-400 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        ) : null}
        {overview ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(overview).map(([key, value]) => (
              <Card key={key} className="space-y-2 bg-white/70 dark:bg-gray-900/80">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">{key.replace(/_/g, ' ')}</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</p>
              </Card>
            ))}
          </div>
        ) : null}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Categories & gallery
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Organize portfolio pieces by style. Categories feed both the public gallery tabs and the admin upload
                form.
              </p>
            </div>
            <form className="space-y-3 rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-700" onSubmit={handleCreateCategory}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Add category
              </h4>
              <input
                type="text"
                placeholder="Name"
                value={newCategory.name}
                onChange={handleNewCategoryChange('name')}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={newCategory.description}
                onChange={handleNewCategoryChange('description')}
                rows={2}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
              />
              <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={newCategory.is_active}
                  onChange={handleNewCategoryChange('is_active')}
                  className="h-4 w-4 rounded border border-gray-400 text-gray-900 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:focus:ring-gray-400"
                />
                Active
              </label>
              <Button type="submit" variant="secondary">
                Create category
              </Button>
            </form>
            <div className="space-y-4">
              {categories.map((category) => {
                const draft = categoryDrafts[category.id] || {
                  name: category.name,
                  description: category.description || '',
                  is_active: category.is_active
                };
                return (
                  <div key={category.id} className="space-y-3 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                        {category.gallery_item_count} items
                      </p>
                      <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={category.is_active}
                          onChange={(event) => handleCategoryVisibility(category, event.target.checked)}
                          disabled={savingCategoryId === category.id}
                          className="h-4 w-4 rounded border border-gray-400 text-gray-900 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:focus:ring-gray-400"
                        />
                        {category.is_active ? 'Visible' : 'Hidden'}
                      </label>
                    </div>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={handleCategoryDraftChange(category.id, 'name')}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                    />
                    <textarea
                      value={draft.description}
                      onChange={handleCategoryDraftChange(category.id, 'description')}
                      rows={2}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                    />
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        onClick={() => handleCategorySave(category)}
                        disabled={savingCategoryId === category.id}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleCategoryDelete(category.id)}
                        disabled={savingCategoryId === category.id}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <form className="space-y-3 rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-700" onSubmit={handleGallerySubmit}>
              <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Publish gallery item
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">Category</label>
                  <select
                    value={galleryDraft.category_id}
                    onChange={handleGalleryDraftChange('category_id')}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                    required
                  >
                    {categoryOptions.length ? null : <option value="">Add a category first</option>}
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">Admin</label>
                  <select
                    value={galleryDraft.uploaded_by_admin_id}
                    onChange={handleGalleryDraftChange('uploaded_by_admin_id')}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                    required
                  >
                    {adminOptions.length ? null : <option value="">Invite an admin</option>}
                    {adminOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <input
                type="url"
                placeholder="Image URL"
                value={galleryDraft.image_url}
                onChange={handleGalleryDraftChange('image_url')}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                required
              />
              <input
                type="text"
                placeholder="Alt text"
                value={galleryDraft.alt}
                onChange={handleGalleryDraftChange('alt')}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                required
              />
              <textarea
                placeholder="Caption (optional)"
                value={galleryDraft.caption}
                onChange={handleGalleryDraftChange('caption')}
                rows={2}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
              />
              <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={galleryDraft.is_published}
                  onChange={handleGalleryDraftChange('is_published')}
                  className="h-4 w-4 rounded border border-gray-400 text-gray-900 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:focus:ring-gray-400"
                />
                Visible in gallery
              </label>
              <Button type="submit">Publish item</Button>
            </form>
          </Card>
          <Card className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Appointments & assets
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Review pending sessions, adjust scheduling, and control which assets are visible to clients.
              </p>
            </div>
            {appointments.map((appointment) => {
              const draft = appointmentDrafts[appointment.id] || {
                status: appointment.status,
                scheduled_start: '',
                duration_minutes: '',
                client_description: appointment.client_description || '',
                assigned_admin_id: appointment.assigned_admin?.id || ''
              };
              const assetDraft = assetDrafts[appointment.id] || createInitialAssetDraft();
              return (
                <div key={appointment.id} className="space-y-4 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                        Ref {appointment.reference_code || appointment.id}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-200">
                        {appointment.client?.display_name} · {appointment.client?.email}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                      <p>Status: {appointment.status}</p>
                      <p>{appointment.has_identity_documents ? 'ID verified' : 'ID pending'}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Status</label>
                      <input
                        type="text"
                        value={draft.status}
                        onChange={handleAppointmentDraftChange(appointment.id, 'status')}
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                        Scheduled start
                      </label>
                      <input
                        type="datetime-local"
                        value={draft.scheduled_start}
                        onChange={handleAppointmentDraftChange(appointment.id, 'scheduled_start')}
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="15"
                        value={draft.duration_minutes}
                        onChange={handleAppointmentDraftChange(appointment.id, 'duration_minutes')}
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                        Assigned admin
                      </label>
                      <select
                        value={draft.assigned_admin_id}
                        onChange={handleAppointmentDraftChange(appointment.id, 'assigned_admin_id')}
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
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
                  <div>
                    <label className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Client notes</label>
                    <textarea
                      value={draft.client_description}
                      onChange={handleAppointmentDraftChange(appointment.id, 'client_description')}
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => handleAppointmentSave(appointment.id)}
                      disabled={savingAppointmentId === appointment.id}
                    >
                      Save appointment
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Booked {new Date(appointment.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-3 rounded-2xl border border-dashed border-gray-300 p-4 dark:border-gray-700">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                      Add admin asset
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Type</label>
                        <select
                          value={assetDraft.kind}
                          onChange={handleAssetDraftChange(appointment.id, 'kind')}
                          className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                        >
                          {ASSET_KIND_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                          Share with client
                        </label>
                        <label className="mt-2 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                          <input
                            type="checkbox"
                            checked={assetDraft.is_visible_to_client}
                            onChange={handleAssetDraftChange(appointment.id, 'is_visible_to_client')}
                            className="h-4 w-4 rounded border border-gray-400 text-gray-900 focus:ring-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:focus:ring-gray-400"
                          />
                          {assetDraft.is_visible_to_client ? 'Visible' : 'Hidden'}
                        </label>
                      </div>
                    </div>
                    <input
                      type="url"
                      placeholder="File URL (optional)"
                      value={assetDraft.file_url}
                      onChange={handleAssetDraftChange(appointment.id, 'file_url')}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                    />
                    <textarea
                      placeholder="Note text (optional)"
                      value={assetDraft.note_text}
                      onChange={handleAssetDraftChange(appointment.id, 'note_text')}
                      rows={2}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-400"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleAssetCreate(appointment.id)}
                      disabled={updatingAssetKey === `${appointment.id}:new`}
                    >
                      Attach asset
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                      Assets ({appointment.assets.length})
                    </h4>
                    <div className="space-y-3">
                      {appointment.assets.map((asset) => (
                        <div
                          key={asset.id}
                          className="space-y-2 rounded-xl border border-gray-200 p-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">{asset.kind}</p>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => handleAssetVisibilityToggle(appointment.id, asset)}
                              disabled={updatingAssetKey === `${appointment.id}:${asset.id}`}
                            >
                              {asset.is_visible_to_client ? 'Hide from client' : 'Share with client'}
                            </Button>
                          </div>
                          {asset.file_url ? (
                            <a
                              href={asset.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="block truncate text-xs text-gray-500 underline dark:text-gray-300"
                            >
                              {asset.file_url}
                            </a>
                          ) : null}
                          {asset.note_text ? (
                            <p className="text-xs text-gray-500 dark:text-gray-300">{asset.note_text}</p>
                          ) : null}
                          <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500">
                            {asset.uploaded_by_admin
                              ? `Admin · ${asset.uploaded_by_admin.name}`
                              : asset.uploaded_by_client
                              ? `Client · ${asset.uploaded_by_client.display_name}`
                              : 'Uploaded file'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
            Recent users
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentUsers.map((user) => (
              <div
                key={user.id}
                className="space-y-2 rounded-xl border border-gray-200 p-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
              >
                <div>
                  <p className="font-medium">{user.display_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                </div>
                <div>
                  <label className="text-[11px] uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500">
                    Role
                  </label>
                  <select
                    value={userRoleDrafts[user.id] ?? user.role}
                    onChange={(event) => handleUserRoleChange(user.id, event.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-2 py-1 text-xs uppercase tracking-[0.2em] text-gray-700 focus:border-gray-900 focus:outline-none focus:ring-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-gray-400"
                  >
                    {availableRoles.length ? null : <option value={user.role}>{user.role}</option>}
                    {availableRoles.map((role) => (
                      <option key={role} value={role} className="uppercase">
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
            Analytics snapshot
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Appointments by status
              </h4>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
                {Object.entries(analytics.appointments_by_status || {}).map(([status, count]) => (
                  <li key={status} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                    <span className="uppercase tracking-[0.25em] text-xs text-gray-500 dark:text-gray-400">{status}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Gallery items by category
              </h4>
              <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
                {Object.entries(analytics.gallery_items_by_category || {}).map(([category, count]) => (
                  <li key={category} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
                    <span className="uppercase tracking-[0.25em] text-xs text-gray-500 dark:text-gray-400">{category}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Activity</h3>
          <div className="space-y-3">
            {activityTracking.map((log) => (
              <div key={log.id} className="rounded-xl border border-gray-200 p-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200">
                <p className="font-medium">{log.action}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{log.details}</p>
                <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500">
                  {log.admin?.name} · {log.ip_address || 'n/a'} · {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                </p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">System settings</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {settings.map((setting) => (
              <div key={setting.id} className="rounded-xl border border-gray-200 p-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200">
                <p className="font-medium uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">{setting.key}</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{setting.value}</p>
                <p className="text-[11px] uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500">{setting.is_editable ? 'Editable' : 'Locked'}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </main>
  );
}
