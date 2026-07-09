import type { Metadata } from "next";
import "./globals.css";
import Header from "../components/Layout/Header";
import Footer from "../components/Layout/Footer";
import ChatbotWidget from "../components/Chatbot/ChatbotWidget";
import { ReduxProvider } from "../store/Provider"; 
import { ConfigProvider, App } from 'antd'; // Thêm App ở đây

export const metadata: Metadata = {
  title: "SLNA Ticketing - Hệ thống bán vé trực tuyến",
  description: "Cổng thông tin vé bóng đá chính thức của Sông Lam Nghệ An",
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
              <div className="flex-grow pt-16">
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
