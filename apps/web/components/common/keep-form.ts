import { startTransition, type FormEvent } from "react";

/**
 * React 19 clears a form's fields after its action runs, even when the server
 * answers with a validation error. For forms where people type a lot (quote,
 * checkout, tracking), this runs the same action from onSubmit instead, so
 * their input stays put. The `action` prop stays as a no-JS fallback.
 */
export function keep(action: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}
