import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import db from "@/lib/db";

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans",
});





export const metadata: Metadata = {
  title: "Arthur Party",
  description: "Arthur Anniversary App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // DB에서 현재 설정된 폰트 가져오기
  const stmt = db.prepare('SELECT active_font FROM settings WHERE id = ?');
  const settings = stmt.get('default') as { active_font: string };
  const activeFont = settings?.active_font || 'notoSansKr';

  // 선택된 폰트에 따른 클래스 결정
  let fontClass = notoSansKr.className;
  // 기존 gaegu 값을 가지고 있던 환경도 마루부리로 매끄럽게 넘어오도록 호환성 유지
  if (activeFont === 'maruburi' || activeFont === 'gaegu') fontClass = 'font-maruburi';
  if (activeFont === 'nanum-world' || activeFont === 'grandiflora') fontClass = 'font-nanum-world'; // 기존 grandiflora 선택자도 대응
  if (activeFont === 'nanum-gangbujang') fontClass = 'font-nanum-gangbujang';
  if (activeFont === 'nanum-sea') fontClass = 'font-nanum-sea';

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* Google Tag (gtag.js) - Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-Z05G23Z209"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-Z05G23Z209');
            `,
          }}
        />
        {/* End Google Analytics */}

        {/* Google Tag Manager */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-PWG8S5VN');`,
          }}
        />
        {/* End Google Tag Manager */}
        <link href="https://hangeul.pstatic.net/hangeul_static/css/maru-buri.css" rel="stylesheet" />
        <link href="https://hangeul.pstatic.net/hangeul_static/css/NanumSeGyeJeogInHanGeur.css" rel="stylesheet" />
        <link href="https://hangeul.pstatic.net/hangeul_static/css/NanumGangBuJangNimCe.css" rel="stylesheet" />
        <link href="https://hangeul.pstatic.net/hangeul_static/css/NanumSeACe.css" rel="stylesheet" />
      </head>
      <body className={`${fontClass} ${notoSansKr.variable}`}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PWG8S5VN"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          ></iframe>
        </noscript>
        {/* End Google Tag Manager (noscript) */}
        {children}
      </body>
    </html>
  );
}
