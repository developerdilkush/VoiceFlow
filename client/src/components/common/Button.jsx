import { Loader2 } from 'lucide-react';

const styles = { primary: 'btn-primary', secondary: 'btn-secondary', danger: 'btn-danger', ghost: 'btn-ghost' };
export function Button({ variant = 'primary', loading = false, icon: Icon, children, className = '', disabled, type = 'button', ...rest }) {
  return (
    <button type={type} className={`${styles[variant]} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {children}
    </button>
  );
}
