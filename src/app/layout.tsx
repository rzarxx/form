import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Form Builder",
  description: "Buat dan bagikan formulir dinamis dengan cepat dan mudah.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css';
                link.integrity = 'sha512-Kc323vGBEqzTmouAECnVceyQqyqdsSiqLQISBL29aUW4U/M7pSPA/gEUZQqv1cwx4OnYxTxve5UMg5GT6L4JJg==';
                link.crossOrigin = 'anonymous';
                link.referrerPolicy = 'no-referrer';
                link.media = 'print';
                link.onload = function() { this.media = 'all'; };
                document.head.appendChild(link);
              })();
            `
          }}
        />
        <noscript>
          <link 
            rel="stylesheet" 
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" 
            integrity="sha512-Kc323vGBEqzTmouAECnVceyQqyqdsSiqLQISBL29aUW4U/M7pSPA/gEUZQqv1cwx4OnYxTxve5UMg5GT6L4JJg==" 
            crossOrigin="anonymous" 
            referrerPolicy="no-referrer" 
          />
        </noscript>
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans antialiased">
        {children}
        <Toaster theme="light" position="top-right" richColors closeButton />
        <SpeedInsights />
      </body>
    </html>
  );
}
