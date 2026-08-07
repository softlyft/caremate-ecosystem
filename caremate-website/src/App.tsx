import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';

import { DocumentMeta } from '@/components/DocumentMeta';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { STATIC_PAGE_SEO, seoForPath } from '@/lib/seo';
import { ArticleDetailPage } from '@/pages/ArticleDetail';
import { ArticlesCategoryPage } from '@/pages/ArticlesCategory';
import { ArticlesIndexPage } from '@/pages/ArticlesIndex';
import { CcnPage } from '@/pages/Ccn';
import { CcnGuidePage } from '@/pages/CcnGuide';
import { DocsIndexPage } from '@/pages/DocsIndex';
import { GuidePage } from '@/pages/Guide';
import { OpenInAppPage } from '@/pages/OpenInApp';
import { PrivacyPage } from '@/pages/Privacy';
import { RefundsPage } from '@/pages/Refunds';
import { SecurityPage } from '@/pages/Security';
import { PricingPage } from '@/pages/Pricing';
import { ProviderGuidePage } from '@/pages/ProviderGuide';
import { ProvidersPage } from '@/pages/Providers';
import { TermsPage } from '@/pages/Terms';
import { WelcomePage } from '@/pages/Welcome';

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname || '/';
}

function EmergencyShareOpen() {
  const { token = '' } = useParams();
  return (
    <OpenInAppPage
      title="Emergency profile share"
      description="This link opens CareMate for signed-in viewers. Install the app if you do not have it yet."
      appPath={`emergency/share/${token}`}
    />
  );
}

function MarketingChrome({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const path = normalizePath(pathname);
  const isWelcome = path === '/';
  const staticSeo = STATIC_PAGE_SEO[path];

  return (
    <>
      {staticSeo ? <DocumentMeta seo={{ ...staticSeo, path }} /> : null}
      <SiteHeader tone={isWelcome ? 'hero' : 'light'} />
      {children}
      <SiteFooter />
    </>
  );
}

function OpenInAppRoute({
  title,
  description,
  appPath,
}: {
  title: string;
  description: string;
  appPath: string;
}) {
  const { pathname } = useLocation();
  return (
    <>
      <DocumentMeta seo={seoForPath(pathname)} />
      <OpenInAppPage title={title} description={description} appPath={appPath} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/auth/reset-password"
          element={
            <OpenInAppRoute
              title="Reset your password"
              description="Continue in the CareMate app to choose a new password."
              appPath="auth/reset-password"
            />
          }
        />
        <Route
          path="/auth/callback"
          element={
            <OpenInAppRoute
              title="Continue in CareMate"
              description="Finish signing in inside the CareMate app."
              appPath="auth/callback"
            />
          }
        />
        <Route
          path="/emergency/share/:token"
          element={
            <>
              <DocumentMeta seo={seoForPath('/emergency/share/x')} />
              <EmergencyShareOpen />
            </>
          }
        />
        <Route
          path="/billing/success"
          element={
            <OpenInAppRoute
              title="Payment received"
              description="Return to CareMate to refresh your Premium status."
              appPath="billing/success"
            />
          }
        />
        <Route
          path="/billing/cancel"
          element={
            <OpenInAppRoute
              title="Checkout cancelled"
              description="No charge was completed. You can try again from CareMate."
              appPath="billing/cancel"
            />
          }
        />
        <Route
          path="/"
          element={
            <MarketingChrome>
              <WelcomePage />
            </MarketingChrome>
          }
        />
        <Route
          path="/docs"
          element={
            <MarketingChrome>
              <DocsIndexPage />
            </MarketingChrome>
          }
        />
        <Route
          path="/docs/patient"
          element={
            <MarketingChrome>
              <GuidePage />
            </MarketingChrome>
          }
        />
        <Route
          path="/docs/community"
          element={
            <MarketingChrome>
              <CcnGuidePage />
            </MarketingChrome>
          }
        />
        <Route
          path="/docs/providers"
          element={
            <MarketingChrome>
              <ProviderGuidePage />
            </MarketingChrome>
          }
        />
        <Route path="/guide" element={<Navigate to="/docs/patient" replace />} />
        <Route path="/ccn/guide" element={<Navigate to="/docs/community" replace />} />
        <Route path="/providers/guide" element={<Navigate to="/docs/providers" replace />} />
        <Route
          path="/articles"
          element={
            <MarketingChrome>
              <ArticlesIndexPage />
            </MarketingChrome>
          }
        />
        <Route
          path="/articles/:category/:slug"
          element={
            <MarketingChrome>
              <ArticleDetailPage />
            </MarketingChrome>
          }
        />
        <Route
          path="/articles/:category"
          element={
            <MarketingChrome>
              <ArticlesCategoryPage />
            </MarketingChrome>
          }
        />
        <Route
          path="/ccn"
          element={
            <MarketingChrome>
              <CcnPage />
            </MarketingChrome>
          }
        />
        <Route
          path="/providers"
          element={
            <MarketingChrome>
              <ProvidersPage />
            </MarketingChrome>
          }
        />
        <Route
          path="/pricing"
          element={
            <MarketingChrome>
              <PricingPage />
            </MarketingChrome>
          }
        />
        <Route
          path="/security"
          element={
            <MarketingChrome>
              <SecurityPage />
            </MarketingChrome>
          }
        />
        <Route
          path="/refunds"
          element={
            <MarketingChrome>
              <RefundsPage />
            </MarketingChrome>
          }
        />
        <Route
          path="/privacy"
          element={
            <MarketingChrome>
              <PrivacyPage />
            </MarketingChrome>
          }
        />
        <Route
          path="/terms"
          element={
            <MarketingChrome>
              <TermsPage />
            </MarketingChrome>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
