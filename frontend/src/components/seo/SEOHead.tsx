import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
  keywords?: string[];
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_TITLE = 'CHAKRIVA — Intelligent Coding Learning & Tech Interview Platform';
const DEFAULT_DESC =
  'CHAKRIVA by Shivam Singh — Intelligent coding-learning and interview-preparation platform featuring adaptive roadmaps, curated sheets, isolated code judge, and deep learner insights.';
const BASE_URL = 'https://verniq.vercel.app';
const DEFAULT_OG_IMAGE = `${BASE_URL}/catalog_screenshot.png`;

function setOrCreateMeta(selector: string, attrName: string, attrValue: string, content: string) {
  let element = document.querySelector(selector) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setOrCreateLink(rel: string, href: string) {
  let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description = DEFAULT_DESC,
  canonicalPath,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  noIndex = false,
  keywords,
  jsonLd,
}) => {
  const location = useLocation();

  useEffect(() => {
    // 1. Page Title
    const formattedTitle = title
      ? title.includes('CHAKRIVA')
        ? title
        : `${title} — CHAKRIVA`
      : DEFAULT_TITLE;
    document.title = formattedTitle;

    // 2. Canonical URL
    const canonicalUrl = `${BASE_URL}${canonicalPath ?? location.pathname}`;
    setOrCreateLink('canonical', canonicalUrl);

    // 3. Meta Description & Robots
    setOrCreateMeta('meta[name="description"]', 'name', 'description', description);
    setOrCreateMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1'
    );

    if (keywords && keywords.length > 0) {
      setOrCreateMeta('meta[name="keywords"]', 'name', 'keywords', keywords.join(', '));
    }

    // 4. Open Graph
    setOrCreateMeta('meta[property="og:title"]', 'property', 'og:title', formattedTitle);
    setOrCreateMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setOrCreateMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setOrCreateMeta('meta[property="og:image"]', 'property', 'og:image', ogImage);
    setOrCreateMeta('meta[property="og:type"]', 'property', 'og:type', ogType);

    // 5. Twitter
    setOrCreateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', formattedTitle);
    setOrCreateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setOrCreateMeta('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);

    // 6. Route-specific JSON-LD Structured Data
    const SCRIPT_ID = 'route-json-ld';
    let scriptElement = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (jsonLd) {
      if (!scriptElement) {
        scriptElement = document.createElement('script');
        scriptElement.id = SCRIPT_ID;
        scriptElement.type = 'application/ld+json';
        document.head.appendChild(scriptElement);
      }
      scriptElement.text = JSON.stringify(jsonLd);
    } else if (scriptElement) {
      scriptElement.remove();
    }

    return () => {
      // Optional cleanup on route change
    };
  }, [title, description, canonicalPath, ogImage, ogType, noIndex, keywords, jsonLd, location.pathname]);

  return null;
};

