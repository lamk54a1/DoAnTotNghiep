import type { Metadata } from "next";
import "./globals.css";
import Header from "../components/Layout/Header";
import Footer from "../components/Layout/Footer";
import ChatbotWidget from "../components/Chatbot/ChatbotWidget";
import { ReduxProvider } from "../store/Provider"; 
import { ConfigProvider, App } from 'antd'; // Thêm App ở đây

export const metadata: Metadata = {
  metadataBase: new URL('https://veslnafc.xyz'),
  title: {
    default: 'SLNA Ticketing | Đặt vé Sông Lam Nghệ An',
    template: '%s | SLNA Ticketing',
  },
  description: 'Đặt vé bóng đá Sông Lam Nghệ An trực tuyến, chọn chỗ trên sơ đồ sân Vinh, thanh toán VietQR và nhận vé điện tử QR nhanh chóng.',
  applicationName: 'SLNA Ticketing',
  keywords: ['SLNA', 'Sông Lam Nghệ An', 'vé bóng đá', 'vé SLNA', 'sân Vinh', 'SLNA Ticketing'],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: '/',
    siteName: 'SLNA Ticketing',
    title: 'SLNA Ticketing | Đặt vé Sông Lam Nghệ An',
    description: 'Chọn chỗ trên sơ đồ sân Vinh, thanh toán VietQR và nhận vé điện tử QR trên hệ thống SLNA Ticketing.',
    images: [
      {
        url: '/images/slna-ticketing-og.png',
        width: 1200,
        height: 630,
        alt: 'SLNA Ticketing - Cổng đặt vé bóng đá Sông Lam Nghệ An',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SLNA Ticketing | Đặt vé Sông Lam Nghệ An',
    description: 'Chọn chỗ, thanh toán VietQR và nhận vé điện tử QR cho các trận đấu của Sông Lam Nghệ An.',
    images: ['/images/slna-ticketing-og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'sports',
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900" suppressHydrationWarning>
        <ReduxProvider>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#003078', // Màu xanh SLNA
                borderRadius: 12,
                fontFamily: '"Segoe UI", Arial, Helvetica, sans-serif',
              },
            }}
          >
            {/* THÊM THẺ APP CỦA ANTD BỌC QUANH CONTENT */}
            <App>
              <Header />
              <div className="flex-grow pt-[72px]">
                {children}
              </div>
              <ChatbotWidget />
              <Footer />
            </App>
          </ConfigProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
