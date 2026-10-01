import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Library, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Input } from '../components/ui.jsx';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    full_name: '', email: '', student_id: '', password: '', confirm_password: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const errs = {};
    if (form.full_name.trim().length < 3) errs.full_name = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (form.student_id.trim().length < 3) errs.student_id = 'Student ID must be at least 3 characters.';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (form.confirm_password !== form.password) errs.confirm_password = 'Passwords do not match.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await register({
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        student_id: form.student_id.trim(),
        password: form.password,
        confirm_password: form.confirm_password,
      });
      toast.success('Account created — welcome to the library!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <div className="mb-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white">
          <Library size={26} />
        </span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Create your library account</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Free for all enrolled students. Borrow up to 5 books at a time.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
        <Input label="Full name" placeholder="Ada Lovelace" value={form.full_name}
          error={errors.full_name} onChange={set('full_name')} autoComplete="name" />
        <Input label="Email" type="email" placeholder="you@student.edu" value={form.email}
          error={errors.email} onChange={set('email')} autoComplete="email" />
        <Input label="Student ID" placeholder="CS2024017" value={form.student_id}
          error={errors.student_id} onChange={set('student_id')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Password" type="password" placeholder="Min. 8 characters" value={form.password}
            error={errors.password} onChange={set('password')} autoComplete="new-password" />
          <Input label="Confirm password" type="password" placeholder="Repeat password" value={form.confirm_password}
            error={errors.confirm_password} onChange={set('confirm_password')} autoComplete="new-password" />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Creating account…' : (<><UserPlus size={16} /> Create account</>)}
        </Button>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Already a member?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
