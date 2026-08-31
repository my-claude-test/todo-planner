import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '할일 + 계획 관리',
  description: '단기 실행(할일)과 중장기 목표(주간/1년)를 하나의 구조로 연결',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
