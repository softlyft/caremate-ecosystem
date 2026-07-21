import type { LanguageCode } from '../types';
import { getEnglishCatalog, getTranslationCatalog } from './resources';
import type { TranslationNode, TranslationParams } from './types';

function resolveNode(node: TranslationNode | undefined, path: string[]): string | null {
  if (!node) {
    return null;
  }

  if (typeof node === 'string') {
    return path.length === 0 ? node : null;
  }

  if (path.length === 0) {
    return null;
  }

  const [head, ...rest] = path;
  return resolveNode(node[head], rest);
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_, token: string) => {
    const value = params[token];
    return value === undefined ? `{{${token}}}` : String(value);
  });
}

export function translateText(
  language: LanguageCode,
  key: string,
  params?: TranslationParams,
): string {
  const [namespace, ...rest] = key.split('.');
  if (!namespace || rest.length === 0) {
    return key;
  }

  const catalog = getTranslationCatalog(language);
  const english = getEnglishCatalog();
  const namespaceKey = namespace as keyof typeof catalog;
  const localized = resolveNode(catalog[namespaceKey], rest);
  const fallback = resolveNode(english[namespaceKey], rest);
  const resolved = localized ?? fallback;

  if (!resolved) {
    return key;
  }

  return interpolate(resolved, params);
}

export function createTranslator(language: LanguageCode) {
  return (key: string, params?: TranslationParams) => translateText(language, key, params);
}
