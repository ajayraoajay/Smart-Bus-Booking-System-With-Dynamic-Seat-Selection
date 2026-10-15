import "./ConfirmationModal.css";

export default function ConfirmationModal({
  open,
  icon = "🗑️",
  title,
  message,
  note,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  confirmVariant = "danger",
  loading = false,
  onCancel,
  onConfirm,
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={(event) => event.stopPropagation()}>
        <div className="confirm-modal-icon">{icon}</div>
        <h3 className="confirm-modal-title">{title}</h3>
        <p className="confirm-modal-message">{message}</p>
        {note && <p className="confirm-modal-note">{note}</p>}
        <div className="confirm-modal-actions">
          <button className="confirm-modal-cancel" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={`confirm-modal-confirm confirm-modal-confirm-${confirmVariant}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
