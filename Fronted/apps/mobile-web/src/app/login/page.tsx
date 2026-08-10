import QrLogin from '@/components/auth/QrLogin';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 sm:p-6">
      <QrLogin />
    </main>
  );
}
