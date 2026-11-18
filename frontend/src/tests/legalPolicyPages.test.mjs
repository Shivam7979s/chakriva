import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_DIR = path.resolve('frontend');

test('CHAKRIVA Legal & Regulatory Disclosures — DPDP Act, Judge AUP & Gateway Compliance Audit', async (t) => {
  await t.test('1. React Router Route Declarations in App.tsx', () => {
    const appTsx = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'App.tsx'), 'utf8');

    // Primary legal paths
    assert.ok(appTsx.includes('path="/privacy"'), 'Route /privacy must be defined');
    assert.ok(appTsx.includes('path="/terms"'), 'Route /terms must be defined');
    assert.ok(appTsx.includes('path="/cookies"'), 'Route /cookies must be defined');
    assert.ok(appTsx.includes('path="/refunds"'), 'Route /refunds must be defined');

    // Backward-compatible and canonical aliases
    assert.ok(appTsx.includes('path="/cancellation-refund"'), 'Alias /cancellation-refund must be defined');
    assert.ok(appTsx.includes('path="/legal"'), 'Alias /legal must be defined');
    assert.ok(appTsx.includes('path="/legal/privacy"'), 'Alias /legal/privacy must be defined');
    assert.ok(appTsx.includes('path="/legal/terms"'), 'Alias /legal/terms must be defined');
    assert.ok(appTsx.includes('path="/legal/cookies"'), 'Alias /legal/cookies must be defined');
    assert.ok(appTsx.includes('path="/legal/refunds"'), 'Alias /legal/refunds must be defined');

    // Imports present
    assert.ok(appTsx.includes('PrivacyPolicyView'), 'PrivacyPolicyView must be imported');
    assert.ok(appTsx.includes('TermsOfServiceView'), 'TermsOfServiceView must be imported');
    assert.ok(appTsx.includes('CookiePolicyView'), 'CookiePolicyView must be imported');
    assert.ok(appTsx.includes('RefundPolicyView'), 'RefundPolicyView must be imported');
  });

  await t.test('2. Footer Implementations across Public & Authenticated Shells', () => {
    // 2.1 PublicLayout Footer
    const footerTsx = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'components', 'ui', 'layout', 'Footer.tsx'), 'utf8');
    assert.ok(footerTsx.includes('to="/privacy"'), 'Footer.tsx must link to /privacy');
    assert.ok(footerTsx.includes('to="/terms"'), 'Footer.tsx must link to /terms');
    assert.ok(footerTsx.includes('to="/cookies"'), 'Footer.tsx must link to /cookies');
    assert.ok(footerTsx.includes('to="/refunds"'), 'Footer.tsx must link to /refunds');
    assert.ok(footerTsx.includes('grievance@chakriva.com'), 'Footer.tsx must include grievance desk link');
    assert.ok(footerTsx.includes('DPDP Act 2023 Compliant'), 'Footer.tsx must declare DPDP compliance');

    // 2.2 LandingFooter
    const landingFooterTsx = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'components', 'landing', 'LandingFooter.tsx'), 'utf8');
    assert.ok(landingFooterTsx.includes('to="/privacy"'), 'LandingFooter.tsx must link to /privacy');
    assert.ok(landingFooterTsx.includes('to="/terms"'), 'LandingFooter.tsx must link to /terms');
    assert.ok(landingFooterTsx.includes('to="/cookies"'), 'LandingFooter.tsx must link to /cookies');
    assert.ok(landingFooterTsx.includes('to="/refunds"'), 'LandingFooter.tsx must link to /refunds');
    assert.ok(landingFooterTsx.includes('grievance@chakriva.com'), 'LandingFooter.tsx must include grievance desk link');

    // 2.3 ChakrivaLandingView
    const chakrivaLandingTsx = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'routes', 'ChakrivaLandingView.tsx'), 'utf8');
    assert.ok(chakrivaLandingTsx.includes('to="/privacy"'), 'ChakrivaLandingView must link to /privacy');
    assert.ok(chakrivaLandingTsx.includes('to="/terms"'), 'ChakrivaLandingView must link to /terms');
    assert.ok(chakrivaLandingTsx.includes('to="/cookies"'), 'ChakrivaLandingView must link to /cookies');
    assert.ok(chakrivaLandingTsx.includes('to="/refunds"'), 'ChakrivaLandingView must link to /refunds');
    assert.ok(!chakrivaLandingTsx.includes('href="#privacy"'), 'ChakrivaLandingView must not retain dead #privacy anchor');

    // 2.4 AuraLandingView
    const auraLandingTsx = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'routes', 'AuraLandingView.tsx'), 'utf8');
    assert.ok(auraLandingTsx.includes('to="/privacy"'), 'AuraLandingView must link to /privacy');
    assert.ok(auraLandingTsx.includes('to="/terms"'), 'AuraLandingView must link to /terms');
    assert.ok(auraLandingTsx.includes('to="/cookies"'), 'AuraLandingView must link to /cookies');
    assert.ok(auraLandingTsx.includes('to="/refunds"'), 'AuraLandingView must link to /refunds');

    // 2.5 MobileMoreDrawer
    const mobileDrawerTsx = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'components', 'ui', 'navigation', 'MobileMoreDrawer.tsx'), 'utf8');
    assert.ok(mobileDrawerTsx.includes('to="/privacy"'), 'MobileMoreDrawer must link to /privacy');
    assert.ok(mobileDrawerTsx.includes('to="/terms"'), 'MobileMoreDrawer must link to /terms');
    assert.ok(mobileDrawerTsx.includes('to="/cookies"'), 'MobileMoreDrawer must link to /cookies');
    assert.ok(mobileDrawerTsx.includes('to="/refunds"'), 'MobileMoreDrawer must link to /refunds');
  });

  await t.test('3. Privacy Policy — DPDP Act 2023 Statutory Compliance Verification', () => {
    const privacyTsx = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'routes', 'PrivacyPolicyView.tsx'), 'utf8');

    // Required statutory disclosures
    assert.ok(privacyTsx.includes('Digital Personal Data Protection Act, 2023') || privacyTsx.includes('DPDP Act 2023'), 'Must cite DPDP Act 2023');
    assert.ok(privacyTsx.includes('Data Fiduciary'), 'Must define Data Fiduciary');
    assert.ok(privacyTsx.includes('Data Principal'), 'Must define Data Principal');

    // Required data collection points
    assert.ok(privacyTsx.includes('Full Name') || privacyTsx.includes('email'), 'Must disclose identity data collection');
    assert.ok(privacyTsx.includes('OAuth 2.0') && privacyTsx.includes('GitHub') && privacyTsx.includes('Google'), 'Must disclose GitHub/Google OAuth data');
    assert.ok(
      privacyTsx.toLowerCase().includes('ebbinghaus') && privacyTsx.toLowerCase().includes('streak'),
      'Must disclose problem-solving & Ebbinghaus retention stats'
    );
    assert.ok(privacyTsx.includes('Submitted Code') || privacyTsx.includes('source code'), 'Must disclose submitted code');

    // Third-party processors
    assert.ok(privacyTsx.includes('Supabase Inc.'), 'Must disclose Supabase as primary database processor');
    assert.ok(privacyTsx.includes('Row Level Security'), 'Must mention Row Level Security (RLS)');
    assert.ok(privacyTsx.includes('Docker'), 'Must disclose isolated Docker judge execution');

    // User rights & Grievance Officer
    assert.ok(privacyTsx.includes('Right to Access Information'), 'Must enumerate right to access');
    assert.ok(
      privacyTsx.includes('Right to Correction &amp; Erasure') || privacyTsx.includes('Right to Correction'),
      'Must enumerate right to erasure'
    );
    assert.ok(privacyTsx.includes('Right to Nominate'), 'Must enumerate right to nominate');
    assert.ok(privacyTsx.includes('grievance@chakriva.com'), 'Must list designated grievance officer email');
    assert.ok(privacyTsx.includes('Data Protection Board of India'), 'Must mention DPBI escalation path');
  });

  await t.test('4. Cookie & Local Storage Policy — Strictly Necessary vs Analytics & Banner Rule', () => {
    const cookieTsx = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'routes', 'CookiePolicyView.tsx'), 'utf8');

    // Token architecture
    assert.ok(cookieTsx.includes('sb-*-auth-token'), 'Must disclose Supabase auth session token');
    assert.ok(cookieTsx.includes('chakriva_theme'), 'Must disclose theme preference storage');
    assert.ok(cookieTsx.includes('chakriva_editor_settings'), 'Must disclose Monaco editor preference storage');
    assert.ok(cookieTsx.includes('Strictly Necessary'), 'Must explain strictly necessary classification');

    // The Banner Rule
    assert.ok(cookieTsx.includes('Banner Rule') || cookieTsx.includes('banner'), 'Must document the banner rule');
    assert.ok(cookieTsx.includes('Google Analytics') || cookieTsx.includes('PostHog') || cookieTsx.includes('Mixpanel'), 'Must disclose conditional analytics requirements');

    // Storage inspector presence
    assert.ok(cookieTsx.includes('Storage Inspector') || cookieTsx.includes('localStorage'), 'Must include browser storage inspector');

    // Cookie consent banner component
    const bannerTsx = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'components', 'ui', 'feedback', 'CookieConsentBanner.tsx'), 'utf8');
    assert.ok(bannerTsx.includes('chakriva_cookie_consent_v1'), 'CookieConsentBanner must persist consent key');
    assert.ok(bannerTsx.includes('Strictly Necessary'), 'CookieConsentBanner must respect strictly necessary separation');
  });

  await t.test('5. Terms of Service — Judge AUP, Code Ownership & Catalog Protection', () => {
    const termsTsx = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'routes', 'TermsOfServiceView.tsx'), 'utf8');

    // Acceptable Use Policy (AUP) for Code Judge
    assert.ok(termsTsx.includes('fork bombs') || termsTsx.includes('Fork bombs'), 'Must prohibit fork bombs');
    assert.ok(termsTsx.includes('crypto miners') || termsTsx.includes('Cryptocurrency mining'), 'Must prohibit crypto mining');
    assert.ok(termsTsx.includes('reverse shells') || termsTsx.includes('network sockets') || termsTsx.includes('scanning'), 'Must prohibit network scanning / sockets');
    assert.ok(termsTsx.includes('break out') || termsTsx.includes('containment') || termsTsx.includes('sandbox'), 'Must prohibit container escapes');
    assert.ok(termsTsx.includes('account ban') || termsTsx.includes('termination'), 'Must state abuse results in immediate ban');
    assert.ok(termsTsx.includes('Information Technology Act, 2000'), 'Must cite IT Act 2000 sanctions');

    // Intellectual Property & Code Ownership
    assert.ok(termsTsx.includes('You Own 100% of the Code You Write') || termsTsx.includes('users retain'), 'Must explicitly state user retains code ownership');
    assert.ok(termsTsx.includes('Chakriva Labs') && termsTsx.includes('Proprietary Assets'), 'Must clarify Chakriva Labs owns UI, metadata, and DAGs');
    assert.ok(termsTsx.includes('3,392+'), 'Must cite 3,392+ problem catalog');

    // Anti-scraping & Account Termination
    assert.ok(termsTsx.includes('scrape') || termsTsx.includes('Scraping'), 'Must prohibit scraping problem catalog');
    assert.ok(termsTsx.includes('credential') || termsTsx.includes('Sharing'), 'Must prohibit credential sharing');
  });

  await t.test('6. Pricing, Cancellation & Refund Policy — Payment Gateway KYC Ready', () => {
    const refundTsx = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'routes', 'RefundPolicyView.tsx'), 'utf8');

    // Indian Payment Gateway KYC requirements
    assert.ok(refundTsx.includes('Razorpay') || refundTsx.includes('Cashfree') || refundTsx.includes('PhonePe'), 'Must cite payment gateway KYC alignment');
    assert.ok(refundTsx.includes('Chakriva Labs Private Limited'), 'Must state legal merchant entity');
    assert.ok(refundTsx.includes('billing@chakriva.com'), 'Must list billing support contact');

    // Exact Cancellation Terms
    assert.ok(refundTsx.includes('Cancel Anytime') || refundTsx.includes('cancellation'), 'Must specify cancel anytime terms');
    assert.ok(refundTsx.includes('end of your paid billing cycle') || refundTsx.includes('end of the billing cycle'), 'Must specify access continues until billing cycle end');

    // Exact Refund Terms
    assert.ok(refundTsx.includes('7-Day') || refundTsx.includes('7 calendar days'), 'Must specify 7-day refund window');
    assert.ok(refundTsx.includes('10%') || termsMentionFairUse(refundTsx), 'Must specify 10% content consumption threshold');
    assert.ok(refundTsx.includes('UPI') && refundTsx.includes('Credit / Debit Cards'), 'Must state settlement modes and timelines');
    assert.ok(refundTsx.includes('Reserve Bank of India') || refundTsx.includes('RBI'), 'Must cite RBI / gateway settlement standards');
  });

  await t.test('7. Registration & Authentication Notice Verification', () => {
    const registerTsx = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'routes', 'RegisterView.tsx'), 'utf8');
    assert.ok(registerTsx.includes('to="/terms"'), 'RegisterView must link to Terms of Service');
    assert.ok(registerTsx.includes('to="/privacy"'), 'RegisterView must link to DPDP Privacy Policy');

    const loginTsx = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'routes', 'LoginView.tsx'), 'utf8');
    assert.ok(loginTsx.includes('to="/privacy"'), 'LoginView must provide link to Privacy Policy');
    assert.ok(loginTsx.includes('to="/terms"'), 'LoginView must provide link to Terms of Service');
  });
});

function termsMentionFairUse(text) {
  return text.includes('10%') && text.includes('fair-use');
}
