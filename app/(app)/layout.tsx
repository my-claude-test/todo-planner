import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

/** 인증된 화면용 셸 레이아웃 (사이드바 + 헤더). /login, /auth/* 는 이 셸 밖에서 렌더된다. */
export default function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
