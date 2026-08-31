import type { LanguageCode } from '../types';
import type { TranslationCatalog, TranslationNamespace, TranslationNode } from './types';

import enApps from '../translations/en/apps.json';
import enAuth from '../translations/en/auth.json';
import enCommon from '../translations/en/common.json';
import enEmergency from '../translations/en/emergency.json';
import enFamily from '../translations/en/family.json';
import enHome from '../translations/en/home.json';
import enLearn from '../translations/en/learn.json';
import enNearby from '../translations/en/nearby.json';
import enInsurance from '../translations/en/insurance.json';
import enOnboarding from '../translations/en/onboarding.json';
import enProfile from '../translations/en/profile.json';
import enSearch from '../translations/en/search.json';
import enSettings from '../translations/en/settings.json';
import enSetup from '../translations/en/setup.json';
import enTabs from '../translations/en/tabs.json';
import enMessages from '../translations/en/messages.json';
import enNav from '../translations/en/nav.json';
import enBilling from '../translations/en/billing.json';

import esApps from '../translations/es/apps.json';
import esAuth from '../translations/es/auth.json';
import esCommon from '../translations/es/common.json';
import esEmergency from '../translations/es/emergency.json';
import esFamily from '../translations/es/family.json';
import esHome from '../translations/es/home.json';
import esLearn from '../translations/es/learn.json';
import esMessages from '../translations/es/messages.json';
import esNearby from '../translations/es/nearby.json';
import esOnboarding from '../translations/es/onboarding.json';
import esProfile from '../translations/es/profile.json';
import esSearch from '../translations/es/search.json';
import esSettings from '../translations/es/settings.json';
import esSetup from '../translations/es/setup.json';
import esTabs from '../translations/es/tabs.json';
import esBilling from '../translations/es/billing.json';
import esNav from '../translations/es/nav.json';
import esInsurance from '../translations/es/insurance.json';

import frApps from '../translations/fr/apps.json';
import frAuth from '../translations/fr/auth.json';
import frCommon from '../translations/fr/common.json';
import frEmergency from '../translations/fr/emergency.json';
import frFamily from '../translations/fr/family.json';
import frHome from '../translations/fr/home.json';
import frLearn from '../translations/fr/learn.json';
import frMessages from '../translations/fr/messages.json';
import frNearby from '../translations/fr/nearby.json';
import frOnboarding from '../translations/fr/onboarding.json';
import frProfile from '../translations/fr/profile.json';
import frSearch from '../translations/fr/search.json';
import frSettings from '../translations/fr/settings.json';
import frSetup from '../translations/fr/setup.json';
import frTabs from '../translations/fr/tabs.json';
import frBilling from '../translations/fr/billing.json';
import frNav from '../translations/fr/nav.json';
import frInsurance from '../translations/fr/insurance.json';

import yoApps from '../translations/yo/apps.json';
import yoAuth from '../translations/yo/auth.json';
import yoCommon from '../translations/yo/common.json';
import yoEmergency from '../translations/yo/emergency.json';
import yoFamily from '../translations/yo/family.json';
import yoHome from '../translations/yo/home.json';
import yoLearn from '../translations/yo/learn.json';
import yoMessages from '../translations/yo/messages.json';
import yoNearby from '../translations/yo/nearby.json';
import yoOnboarding from '../translations/yo/onboarding.json';
import yoProfile from '../translations/yo/profile.json';
import yoSearch from '../translations/yo/search.json';
import yoSettings from '../translations/yo/settings.json';
import yoSetup from '../translations/yo/setup.json';
import yoTabs from '../translations/yo/tabs.json';
import yoBilling from '../translations/yo/billing.json';
import yoNav from '../translations/yo/nav.json';
import yoInsurance from '../translations/yo/insurance.json';

import haApps from '../translations/ha/apps.json';
import haAuth from '../translations/ha/auth.json';
import haCommon from '../translations/ha/common.json';
import haEmergency from '../translations/ha/emergency.json';
import haFamily from '../translations/ha/family.json';
import haHome from '../translations/ha/home.json';
import haLearn from '../translations/ha/learn.json';
import haMessages from '../translations/ha/messages.json';
import haNearby from '../translations/ha/nearby.json';
import haOnboarding from '../translations/ha/onboarding.json';
import haProfile from '../translations/ha/profile.json';
import haSearch from '../translations/ha/search.json';
import haSettings from '../translations/ha/settings.json';
import haSetup from '../translations/ha/setup.json';
import haTabs from '../translations/ha/tabs.json';
import haBilling from '../translations/ha/billing.json';
import haNav from '../translations/ha/nav.json';
import haInsurance from '../translations/ha/insurance.json';

import igApps from '../translations/ig/apps.json';
import igAuth from '../translations/ig/auth.json';
import igCommon from '../translations/ig/common.json';
import igEmergency from '../translations/ig/emergency.json';
import igFamily from '../translations/ig/family.json';
import igHome from '../translations/ig/home.json';
import igLearn from '../translations/ig/learn.json';
import igMessages from '../translations/ig/messages.json';
import igNearby from '../translations/ig/nearby.json';
import igOnboarding from '../translations/ig/onboarding.json';
import igProfile from '../translations/ig/profile.json';
import igSearch from '../translations/ig/search.json';
import igSettings from '../translations/ig/settings.json';
import igSetup from '../translations/ig/setup.json';
import igTabs from '../translations/ig/tabs.json';
import igBilling from '../translations/ig/billing.json';
import igNav from '../translations/ig/nav.json';
import igInsurance from '../translations/ig/insurance.json';

import swApps from '../translations/sw/apps.json';
import swAuth from '../translations/sw/auth.json';
import swCommon from '../translations/sw/common.json';
import swEmergency from '../translations/sw/emergency.json';
import swFamily from '../translations/sw/family.json';
import swHome from '../translations/sw/home.json';
import swLearn from '../translations/sw/learn.json';
import swMessages from '../translations/sw/messages.json';
import swNearby from '../translations/sw/nearby.json';
import swOnboarding from '../translations/sw/onboarding.json';
import swProfile from '../translations/sw/profile.json';
import swSearch from '../translations/sw/search.json';
import swSettings from '../translations/sw/settings.json';
import swSetup from '../translations/sw/setup.json';
import swTabs from '../translations/sw/tabs.json';
import swBilling from '../translations/sw/billing.json';
import swNav from '../translations/sw/nav.json';
import swInsurance from '../translations/sw/insurance.json';

import twApps from '../translations/tw/apps.json';
import twAuth from '../translations/tw/auth.json';
import twCommon from '../translations/tw/common.json';
import twEmergency from '../translations/tw/emergency.json';
import twFamily from '../translations/tw/family.json';
import twHome from '../translations/tw/home.json';
import twLearn from '../translations/tw/learn.json';
import twMessages from '../translations/tw/messages.json';
import twNearby from '../translations/tw/nearby.json';
import twOnboarding from '../translations/tw/onboarding.json';
import twProfile from '../translations/tw/profile.json';
import twSearch from '../translations/tw/search.json';
import twSettings from '../translations/tw/settings.json';
import twSetup from '../translations/tw/setup.json';
import twTabs from '../translations/tw/tabs.json';
import twBilling from '../translations/tw/billing.json';
import twNav from '../translations/tw/nav.json';
import twInsurance from '../translations/tw/insurance.json';

import zhApps from '../translations/zh/apps.json';
import zhAuth from '../translations/zh/auth.json';
import zhCommon from '../translations/zh/common.json';
import zhEmergency from '../translations/zh/emergency.json';
import zhFamily from '../translations/zh/family.json';
import zhHome from '../translations/zh/home.json';
import zhLearn from '../translations/zh/learn.json';
import zhMessages from '../translations/zh/messages.json';
import zhNearby from '../translations/zh/nearby.json';
import zhOnboarding from '../translations/zh/onboarding.json';
import zhProfile from '../translations/zh/profile.json';
import zhSearch from '../translations/zh/search.json';
import zhSettings from '../translations/zh/settings.json';
import zhSetup from '../translations/zh/setup.json';
import zhTabs from '../translations/zh/tabs.json';
import zhBilling from '../translations/zh/billing.json';
import zhNav from '../translations/zh/nav.json';
import zhInsurance from '../translations/zh/insurance.json';

import hiApps from '../translations/hi/apps.json';
import hiAuth from '../translations/hi/auth.json';
import hiCommon from '../translations/hi/common.json';
import hiEmergency from '../translations/hi/emergency.json';
import hiFamily from '../translations/hi/family.json';
import hiHome from '../translations/hi/home.json';
import hiLearn from '../translations/hi/learn.json';
import hiMessages from '../translations/hi/messages.json';
import hiNearby from '../translations/hi/nearby.json';
import hiOnboarding from '../translations/hi/onboarding.json';
import hiProfile from '../translations/hi/profile.json';
import hiSearch from '../translations/hi/search.json';
import hiSettings from '../translations/hi/settings.json';
import hiSetup from '../translations/hi/setup.json';
import hiTabs from '../translations/hi/tabs.json';
import hiBilling from '../translations/hi/billing.json';
import hiNav from '../translations/hi/nav.json';
import hiInsurance from '../translations/hi/insurance.json';

function mergeNodes(base: TranslationNode, overlay: TranslationNode): TranslationNode {
  if (typeof base === 'string' || typeof overlay === 'string') {
    return overlay;
  }

  const merged: Record<string, TranslationNode> = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const existing = merged[key];
    if (existing && typeof existing === 'object' && typeof value === 'object') {
      merged[key] = mergeNodes(existing, value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function buildCatalog(parts: TranslationCatalog): TranslationCatalog {
  return parts;
}

const ENGLISH_CATALOG = buildCatalog({
  common: enCommon,
  tabs: enTabs,
  onboarding: enOnboarding,
  settings: enSettings,
  home: enHome,
  learn: enLearn,
  nearby: enNearby,
  insurance: enInsurance,
  profile: enProfile,
  auth: enAuth,
  emergency: enEmergency,
  family: enFamily,
  setup: enSetup,
  apps: enApps,
  search: enSearch,
  messages: enMessages,
  nav: enNav,
  billing: enBilling,
});

type CatalogParts = Partial<Record<TranslationNamespace, TranslationNode>>;

const LANGUAGE_OVERLAYS: Partial<Record<LanguageCode, CatalogParts>> = {
  fr: {
    common: frCommon,
    tabs: frTabs,
    onboarding: frOnboarding,
    settings: frSettings,
    home: frHome,
    learn: frLearn,
    nearby: frNearby,
    profile: frProfile,
    auth: frAuth,
    emergency: frEmergency,
    family: frFamily,
    setup: frSetup,
    apps: frApps,
    search: frSearch,
    messages: frMessages,
    insurance: frInsurance,
    nav: frNav,
    billing: frBilling,
  },
  es: {
    common: esCommon,
    tabs: esTabs,
    onboarding: esOnboarding,
    settings: esSettings,
    home: esHome,
    learn: esLearn,
    nearby: esNearby,
    profile: esProfile,
    auth: esAuth,
    emergency: esEmergency,
    family: esFamily,
    setup: esSetup,
    apps: esApps,
    search: esSearch,
    messages: esMessages,
    insurance: esInsurance,
    nav: esNav,
    billing: esBilling,
  },
  yo: {
    common: yoCommon,
    tabs: yoTabs,
    onboarding: yoOnboarding,
    settings: yoSettings,
    home: yoHome,
    learn: yoLearn,
    nearby: yoNearby,
    profile: yoProfile,
    auth: yoAuth,
    emergency: yoEmergency,
    family: yoFamily,
    setup: yoSetup,
    apps: yoApps,
    search: yoSearch,
    messages: yoMessages,
    insurance: yoInsurance,
    nav: yoNav,
    billing: yoBilling,
  },
  ha: {
    common: haCommon,
    tabs: haTabs,
    onboarding: haOnboarding,
    settings: haSettings,
    home: haHome,
    learn: haLearn,
    nearby: haNearby,
    profile: haProfile,
    auth: haAuth,
    emergency: haEmergency,
    family: haFamily,
    setup: haSetup,
    apps: haApps,
    search: haSearch,
    messages: haMessages,
    insurance: haInsurance,
    nav: haNav,
    billing: haBilling,
  },
  ig: {
    common: igCommon,
    tabs: igTabs,
    onboarding: igOnboarding,
    settings: igSettings,
    home: igHome,
    learn: igLearn,
    nearby: igNearby,
    profile: igProfile,
    auth: igAuth,
    emergency: igEmergency,
    family: igFamily,
    setup: igSetup,
    apps: igApps,
    search: igSearch,
    messages: igMessages,
    insurance: igInsurance,
    nav: igNav,
    billing: igBilling,
  },
  sw: {
    common: swCommon,
    tabs: swTabs,
    onboarding: swOnboarding,
    settings: swSettings,
    home: swHome,
    learn: swLearn,
    nearby: swNearby,
    profile: swProfile,
    auth: swAuth,
    emergency: swEmergency,
    family: swFamily,
    setup: swSetup,
    apps: swApps,
    search: swSearch,
    messages: swMessages,
    insurance: swInsurance,
    nav: swNav,
    billing: swBilling,
  },
  tw: {
    common: twCommon,
    tabs: twTabs,
    onboarding: twOnboarding,
    settings: twSettings,
    home: twHome,
    learn: twLearn,
    nearby: twNearby,
    profile: twProfile,
    auth: twAuth,
    emergency: twEmergency,
    family: twFamily,
    setup: twSetup,
    apps: twApps,
    search: twSearch,
    messages: twMessages,
    insurance: twInsurance,
    nav: twNav,
    billing: twBilling,
  },
  zh: {
    common: zhCommon,
    tabs: zhTabs,
    onboarding: zhOnboarding,
    settings: zhSettings,
    home: zhHome,
    learn: zhLearn,
    nearby: zhNearby,
    profile: zhProfile,
    auth: zhAuth,
    emergency: zhEmergency,
    family: zhFamily,
    setup: zhSetup,
    apps: zhApps,
    search: zhSearch,
    messages: zhMessages,
    insurance: zhInsurance,
    nav: zhNav,
    billing: zhBilling,
  },
  hi: {
    common: hiCommon,
    tabs: hiTabs,
    onboarding: hiOnboarding,
    settings: hiSettings,
    home: hiHome,
    learn: hiLearn,
    nearby: hiNearby,
    profile: hiProfile,
    auth: hiAuth,
    emergency: hiEmergency,
    family: hiFamily,
    setup: hiSetup,
    apps: hiApps,
    search: hiSearch,
    messages: hiMessages,
    insurance: hiInsurance,
    nav: hiNav,
    billing: hiBilling,
  },
};

export function getTranslationCatalog(language: LanguageCode): TranslationCatalog {
  const overlay = LANGUAGE_OVERLAYS[language];
  if (!overlay) {
    return ENGLISH_CATALOG;
  }

  const namespaces = Object.keys(ENGLISH_CATALOG) as TranslationNamespace[];
  const catalog = {} as TranslationCatalog;
  for (const namespace of namespaces) {
    const base = ENGLISH_CATALOG[namespace];
    const part = overlay[namespace];
    catalog[namespace] = part ? mergeNodes(base, part) : base;
  }
  return catalog;
}

export function getEnglishCatalog(): TranslationCatalog {
  return ENGLISH_CATALOG;
}
