import type React from 'react';
import { ThemeProvider } from '@/hooks/useTheme';
import { AuthProvider } from '@/hooks/useAuth';
import { ToastProvider } from '../feedback/Toast';
import { CookieConsentBanner } from '../feedback/CookieConsentBanner';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          {/* WCAG Skip-to-content Link */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-toast focus:px-4 focus:py-2 focus:bg-primary focus:text-text-inverse focus:rounded focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            Skip to main content
          </a>
          {children}
          <CookieConsentBanner />
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
