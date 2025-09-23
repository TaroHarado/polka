export const metadata = {
  title: 'predibnb', 
  icons: {
    icon: [
      { url: '/icon.png' }, 

    ],

  },
};

import './globals.css';
import { ToastsProvider } from '@/hooks/useToasts';
import { WalletProvider } from '@/hooks/WalletContext';

export default function RootLayout({ children }){
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ToastsProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </ToastsProvider>
      </body>
    </html>
  );
}
