import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout, AdminLayout } from './components/Layout.jsx';
import { RequireAuth, RequireAdmin } from './components/guards.jsx';

import Home from './pages/Home.jsx';
import Catalog from './pages/Catalog.jsx';
import BookDetails from './pages/BookDetails.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import MyBooks from './pages/MyBooks.jsx';
import Profile from './pages/Profile.jsx';

import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminBooks from './pages/admin/AdminBooks.jsx';
import AdminStudents from './pages/admin/AdminStudents.jsx';
import AdminBorrowing from './pages/admin/AdminBorrowing.jsx';
import AdminFines from './pages/admin/AdminFines.jsx';
import AdminReports from './pages/admin/AdminReports.jsx';
import AdminSettings from './pages/admin/AdminSettings.jsx';

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-6xl font-black text-brand-600 dark:text-brand-400">404</p>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">The page you are looking for doesn't exist or was moved.</p>
      <a href="/" className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        Back to home
      </a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/books/:id" element={<BookDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/my-books" element={<MyBooks />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route element={<RequireAdmin />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="books" element={<AdminBooks />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="students/:id" element={<AdminStudents />} />
          <Route path="borrowing" element={<AdminBorrowing />} />
          <Route path="fines" element={<AdminFines />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
