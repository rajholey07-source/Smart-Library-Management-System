import { useState } from 'react';
import { KeyRound, UserRound } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Input } from '../components/ui.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user.full_name);
  const [nameBusy, setNameBusy] = useState(false);

  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwBusy, setPwBusy] = useState(false);

  const saveName = async (e) => {
    e.preventDefault();
    if (name.trim().length < 3) {
      toast.error('Please enter your full name.');
      return;
    }
    setNameBusy(true);
    try {
      const data = await api.updateMyProfile({ full_name: name.trim() });
      setUser(data.user);
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setNameBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (pw.new_password.length < 8) errs.new_password = 'New password must be at least 8 characters.';
    if (pw.confirm_password !== pw.new_password) errs.confirm_password = 'Passwords do not match.';
    setPwErrors(errs);
    if (Object.keys(errs).length) return;

    setPwBusy(true);
    try {
      await api.changePassword({ current_password: pw.current_password, new_password: pw.new_password });
      toast.success('Password changed successfully.');
      setPw({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPwBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile settings</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your account details.</p>

      <div className="card mt-8 p-6">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white">
            {user.full_name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
          </span>
          <div>
            <p className="font-semibold">{user.full_name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-400">Role</dt>
            <dd className="font-medium capitalize">{user.role}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Student ID</dt>
            <dd className="font-medium">{user.student_id || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-400">Member since</dt>
            <dd className="font-medium">{new Date(user.created_at.replace(' ', 'T')).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 font-semibold"><UserRound size={17} /> Display name</h2>
        <form onSubmit={saveName} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button type="submit" disabled={nameBusy || name === user.full_name}>
            {nameBusy ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="flex items-center gap-2 font-semibold"><KeyRound size={17} /> Change password</h2>
        <form onSubmit={changePassword} className="mt-4 space-y-4" noValidate>
          <Input label="Current password" type="password" value={pw.current_password}
            onChange={(e) => setPw({ ...pw, current_password: e.target.value })} autoComplete="current-password" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="New password" type="password" value={pw.new_password} error={pwErrors.new_password}
              onChange={(e) => setPw({ ...pw, new_password: e.target.value })} autoComplete="new-password" />
            <Input label="Confirm new password" type="password" value={pw.confirm_password} error={pwErrors.confirm_password}
              onChange={(e) => setPw({ ...pw, confirm_password: e.target.value })} autoComplete="new-password" />
          </div>
          <Button type="submit" disabled={pwBusy}>{pwBusy ? 'Updating…' : 'Update password'}</Button>
        </form>
      </div>
    </div>
  );
}
