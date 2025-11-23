import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { I18nProvider } from '@/lib/i18n';
import { GoogleAnalytics } from '@/components/google-analytics';

export const metadata: Metadata = {
  title: 'SnackingTV',
  description: 'Bite-sized videos for your snacking pleasure.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5310736496455331" crossOrigin="anonymous"></script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap" rel="stylesheet" />
        <GoogleAnalytics />
      </head>
      <body className="font-body antialiased">
        <I18nProvider>
          <FirebaseClientProvider>
            {children}
          </FirebaseClientProvider>
        </I18nProvider>
        <Toaster />
      </body>
    </html>
  );
}
