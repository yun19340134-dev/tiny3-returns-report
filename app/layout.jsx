import "./globals.css";

export const metadata = {
  title: "Tiny 3 系列退货差评分析",
  description: "Tiny 3 与 Tiny 3 Lite 的 Amazon 全站点退货及差评原因汇报"
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
