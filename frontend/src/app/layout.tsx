import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Header from "../components/Layout/Header";
import Footer from "../components/Layout/Footer";
import { ReduxProvider } from "../store/Provider"; 
import { ConfigProvider, App } from 'antd'; // Thêm App ở đây

const montserrat = Montserrat({
  subsets: ["vietnamese"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800", "900"],
});

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
    <html lang="vi" className={`${montserrat.variable} h-full antialiased`}>
      <body className={`${montserrat.className} min-h-full flex flex-col bg-gray-50 text-gray-900`}>
        <ReduxProvider>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#003078', // Màu xanh SLNA
                borderRadius: 12,
                fontFamily: 'var(--font-montserrat)',
              },
            }}
          >
            {/* THÊM THẺ APP CỦA ANTD BỌC QUANH CONTENT */}
            <App>
              <Header />
              <div className="flex-grow pt-16">
                {children}
              </div>
              <Footer />
            </App>
          </ConfigProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}