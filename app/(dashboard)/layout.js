import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Toaster } from 'react-hot-toast';

export default async function DashboardLayout({ children }) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <DashboardShell user={session.user}>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#111827',
            color: '#f9fafb',
            border: '1px solid #1f2937',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#111827',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#111827',
            },
          },
        }}
      />
    </DashboardShell>
  );
}
