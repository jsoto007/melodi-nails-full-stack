import { useLanguage } from '../contexts/LanguageContext.jsx';
import Button from './Button.jsx';
import Dialog from './Dialog.jsx';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  busy = false,
  children
}) {
  const { t } = useLanguage();
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      footer={[
        <Button key="cancel" type="button" variant="ghost" onClick={onClose} disabled={busy}>
          {cancelLabel ?? t('common.actions.cancel')}
        </Button>,
        <Button key="confirm" type="button" onClick={onConfirm} disabled={busy}>
          {confirmLabel ?? t('common.actions.confirm')}
        </Button>
      ]}
    >
      <p>{description}</p>
      {children}
    </Dialog>
  );
}
