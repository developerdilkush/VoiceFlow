import { forwardRef, useId } from 'react';

function Wrap({ label, error, hint, id, children }) {
  return (
    <div>
      {label && <label htmlFor={id} className="label">{label}</label>}
      {children}
      {error ? <p className="err" role="alert">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}
export const Input = forwardRef(function Input({ label, error, hint, className = '', ...rest }, ref) {
  const id = useId();
  return <Wrap {...{ label, error, hint, id }}><input id={id} ref={ref} aria-invalid={!!error} className={`input ${error ? 'border-danger' : ''} ${className}`} {...rest} /></Wrap>;
});
export const Select = forwardRef(function Select({ label, error, hint, children, className = '', ...rest }, ref) {
  const id = useId();
  return <Wrap {...{ label, error, hint, id }}><select id={id} ref={ref} aria-invalid={!!error} className={`input ${className}`} {...rest}>{children}</select></Wrap>;
});
export const Textarea = forwardRef(function Textarea({ label, error, hint, className = '', ...rest }, ref) {
  const id = useId();
  return <Wrap {...{ label, error, hint, id }}><textarea id={id} ref={ref} aria-invalid={!!error} className={`input py-2.5 min-h-[120px] resize-y ${error ? 'border-danger' : ''} ${className}`} {...rest} /></Wrap>;
});
export const Checkbox = forwardRef(function Checkbox({ label, error, ...rest }, ref) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex items-start gap-3 min-h-[44px] py-2 cursor-pointer">
        <input id={id} ref={ref} type="checkbox" className="mt-1 h-5 w-5 shrink-0 rounded border-line accent-[var(--accent)]" {...rest} />
        <span className="text-sm">{label}</span>
      </label>
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  );
});
