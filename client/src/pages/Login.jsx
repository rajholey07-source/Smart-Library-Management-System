import { useState } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Library, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Input } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const location = useLocation();
  const isAdminLogin = params.get('admin') === '1' || location.state?.admin;
  const from = location.state?.from;

  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) errs.email = 'Enter a valid email address.';
    if (form.password.length < 1) errs.password = 'Password is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const user = await login(form.email.trim(), form.password, form.remember);
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}!`);
      if (user.role === 'admin') navigate('/admin', { replace: true });
      else navigate(from || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Sign in failed.');
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
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          {isAdminLogin ? 'Librarian sign in' : 'Welcome back'}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {isAdminLogin ? 'Sign in with your staff account to open the admin console.' : 'Sign in to borrow books and manage your loans.'}
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@student.edu"
          value={form.email}
          error={errors.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          error={errors.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) => setForm({ ...form, remember: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={() => toast.info('Please visit the library desk with your student ID to reset your password.')}
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Forgot password?
          </button>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : (<><LogIn size={16} /> Sign in</>)}
        </Button>
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          No account yet?{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:underline dark:text-brand-400">Create one</Link>
        </p>
      </form>
    </div>
  );
}
