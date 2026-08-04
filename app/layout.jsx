import "./globals.css";

export const metadata = {
  title: "OBSBOT 全型号退货原因管理看板",
  description: "OBSBOT Amazon 全站点、全型号退货原因与客户反馈管理看板"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
