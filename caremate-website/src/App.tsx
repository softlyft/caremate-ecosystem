import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { CcnPage } from '@/pages/Ccn';
import { CcnGuidePage } from '@/pages/CcnGuide';
import { GuidePage } from '@/pages/Guide';
import { PrivacyPage } from '@/pages/Privacy';
import { ProviderGuidePage } from '@/pages/ProviderGuide';
import { ProvidersPage } from '@/pages/Providers';
import { TermsPage } from '@/pages/Terms';
import { WelcomePage } from '@/pages/Welcome';

function Shell() {
  const { pathname } = useLocation();
  const isWelcome = pathname === '/';

  return (
    <>
      <SiteHeader tone={isWelcome ? 'hero' : 'light'} />
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/ccn" element={<CcnPage />} />
        <Route path="/ccn/guide" element={<CcnGuidePage />} />
        <Route path="/providers" element={<ProvidersPage />} />
        <Route path="/providers/guide" element={<ProviderGuidePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <SiteFooter />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
