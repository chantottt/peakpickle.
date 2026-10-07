import {
  cloneElement,
  isValidElement,
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react';
import { AlertCircle, Check, CircleHelp, LoaderCircle, Search, X } from 'lucide-react';
import { capitalize, initials } from '../../utils/format';
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'lime' | 'danger' | 'ghost';
    busy?: boolean;
  }
>(function Button(
  { variant = 'primary', busy, className = '', children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`button button-${variant} ${className}`}
      disabled={disabled || busy}
      {...props}
    >
      {busy && <LoaderCircle size={16} className="spin" />}
      {children}
    </button>
  );
});
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return <input ref={ref} className={`input ${className}`} {...props} />;
  },
);
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', ...props }, ref) {
    return <select ref={ref} className={`input select ${className}`} {...props} />;
  },
);
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea(props, ref) {
  return <textarea ref={ref} className="input" {...props} />;
});
export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const control = isValidElement<{
    id?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
  }>(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': !!error,
        'aria-describedby': error || hint ? descriptionId : undefined,
      })
    : children;
  return (
    <div className={`field ${error ? 'field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {control}
      {error ? (
        <small id={descriptionId} className="field-error" role="alert">
          {error}
        </small>
      ) : (
        hint && (
          <small id={descriptionId} className="muted">
            {hint}
          </small>
        )
      )}
    </div>
  );
}
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action && <div className="page-actions">{action}</div>}
    </div>
  );
}
export function StatCard({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  icon: ReactNode;
}) {
  return (
    <Card className="stat-card">
      <div className="stat-top">
        <span className="muted">{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong className="stat-value">{value}</strong>
      {note && <span className="stat-note">{note}</span>}
    </Card>
  );
}
export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={`status-${status}`}>
      <span className="status-dot" />
      {capitalize(status)}
    </Badge>
  );
}
export function Avatar({ name, id, large = false }: { name: string; id: string; large?: boolean }) {
  const colors = ['olive', 'blue', 'peach', 'purple'];
  const variant = colors[parseInt(id.slice(-2), 16) % colors.length];
  return (
    <span className={`avatar avatar-${variant} ${large ? 'avatar-large' : ''}`} aria-label={name}>
      {initials(name)}
    </span>
  );
}
export function SearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search-bar">
      <Search size={17} />
      <input
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
export function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
export function LoadingSpinner() {
  return (
    <span className="loading-inline" role="status">
      <LoaderCircle className="spin" size={20} /> Loading…
    </span>
  );
}
export function Skeleton() {
  return (
    <div className="skeleton-grid" role="status" aria-label="Loading page">
      <div className="skeleton skeleton-wide" />
      {['one', 'two', 'three', 'four'].map((id) => (
        <div className="skeleton" key={id} />
      ))}
      <span className="sr-only">Loading PeakPickle data…</span>
    </div>
  );
}
export function EmptyState({
  title = 'Nothing here yet',
  description = 'Try changing your filters.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <CircleHelp size={25} />
      </span>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      {action}
    </div>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={28} />
      <h3>We couldn’t load this page.</h3>
      <p>{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary">
          Try again
        </Button>
      )}
    </div>
  );
}
export function DataState({
  loading,
  error,
  hasData,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  hasData: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (loading && !hasData) return <Skeleton />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  return <>{children}</>;
}
export function Table({
  headers,
  children,
  className = '',
}: {
  headers: string[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`table-container ${className}`}>
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, a[href], [tabindex="0"]',
        ) || [],
      );
    focusable()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
      if (event.key === 'Tab') {
        const elements = focusable();
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal ${wide ? 'modal-wide' : ''}`}
      >
        <div className="modal-heading">
          <h2 id={titleId}>{title}</h2>
          <Button variant="ghost" aria-label="Close dialog" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function ConfirmDialog({
  title,
  onClose,
  onConfirm,
  busy,
  confirmLabel = 'Delete',
}: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  confirmLabel?: string;
}) {
  return (
    <Modal title={title} onClose={busy ? () => {} : onClose}>
      <div className="confirm-content">
        <span className="delete-symbol">
          <AlertCircle size={30} />
        </span>
        <p>This action cannot be undone.</p>
      </div>
      <div className="form-actions">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" busy={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
export function FormError({ message }: { message?: string }) {
  return message ? (
    <p className="form-error" role="alert">
      <AlertCircle size={17} />
      {message}
    </p>
  ) : null;
}
export function SuccessMark() {
  return <Check size={16} />;
}
