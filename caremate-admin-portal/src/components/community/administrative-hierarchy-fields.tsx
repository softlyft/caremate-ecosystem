'use client';

import { useMemo, useState } from 'react';
import type { AdministrativeLevel, CommunityCountry } from '@/types/community';
import {
  CUSTOM_ADMINISTRATIVE_VALUE,
  optionsForAdministrativeLevel,
  sortedAdministrativeLevels,
} from '@/lib/community-geography';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

type Props = {
  country: CommunityCountry | undefined;
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  idPrefix?: string;
};

function selectionForLevel(
  level: AdministrativeLevel,
  country: CommunityCountry | undefined,
  hierarchy: Record<string, string>,
): { mode: 'preset' | 'custom' | 'empty'; preset: string; custom: string } {
  const current = hierarchy[level.key] ?? '';
  if (!current) return { mode: 'empty', preset: '', custom: '' };
  const options = optionsForAdministrativeLevel(country, level, hierarchy);
  if (options.includes(current)) {
    return { mode: 'preset', preset: current, custom: '' };
  }
  return { mode: 'custom', preset: CUSTOM_ADMINISTRATIVE_VALUE, custom: current };
}

export function AdministrativeHierarchyFields({
  country,
  value,
  onChange,
  idPrefix = 'administrative',
}: Props) {
  const levels = useMemo(() => sortedAdministrativeLevels(country), [country]);
  const [customByKey, setCustomByKey] = useState<Record<string, string>>({});
  const [prevCountryCode, setPrevCountryCode] = useState(country?.code);

  // Reset draft custom values when the country changes (parent also clears hierarchy).
  if (country?.code !== prevCountryCode) {
    setPrevCountryCode(country?.code);
    setCustomByKey({});
  }

  if (!country || levels.length === 0) return null;

  return (
    <>
      {levels.map((level) => {
        const parentMissing = Boolean(level.depends_on && !value[level.depends_on]?.trim());
        const options = optionsForAdministrativeLevel(country, level, value);
        const selection = selectionForLevel(level, country, value);
        const selectValue =
          selection.mode === 'custom' || customByKey[level.key] !== undefined
            ? CUSTOM_ADMINISTRATIVE_VALUE
            : selection.mode === 'preset'
              ? selection.preset
              : '';

        return (
          <div key={level.key} className="space-y-2 sm:col-span-2">
            <Label htmlFor={`${idPrefix}_${level.key}`}>
              {level.label} <span className="font-normal text-muted">(optional)</span>
            </Label>
            <Select
              id={`${idPrefix}_${level.key}`}
              disabled={parentMissing}
              value={selectValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (nextValue === CUSTOM_ADMINISTRATIVE_VALUE) {
                  const custom = customByKey[level.key] ?? value[level.key] ?? '';
                  setCustomByKey((current) => ({ ...current, [level.key]: custom }));
                  onChange({
                    ...value,
                    [level.key]: custom,
                  });
                  return;
                }
                setCustomByKey((current) => {
                  const next = { ...current };
                  delete next[level.key];
                  for (const child of levels) {
                    if (
                      child.depends_on === level.key ||
                      dependsTransitively(levels, child, level.key)
                    ) {
                      delete next[child.key];
                    }
                  }
                  return next;
                });
                if (!nextValue) {
                  const cleared = { ...value };
                  delete cleared[level.key];
                  for (const child of levels) {
                    if (
                      child.depends_on === level.key ||
                      dependsTransitively(levels, child, level.key)
                    ) {
                      delete cleared[child.key];
                    }
                  }
                  onChange(cleared);
                  return;
                }
                const next = { ...value, [level.key]: nextValue };
                for (const child of levels) {
                  if (
                    child.depends_on === level.key ||
                    dependsTransitively(levels, child, level.key)
                  ) {
                    delete next[child.key];
                  }
                }
                onChange(next);
              }}
            >
              <option value="">
                {parentMissing
                  ? `Select ${levels.find((item) => item.key === level.depends_on)?.label ?? 'parent'} first`
                  : `Select ${level.label.toLowerCase()}`}
              </option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value={CUSTOM_ADMINISTRATIVE_VALUE}>Other / type a custom value…</option>
            </Select>
            {selectValue === CUSTOM_ADMINISTRATIVE_VALUE ? (
              <Input
                id={`${idPrefix}_${level.key}_custom`}
                placeholder={`Enter ${level.label.toLowerCase()}`}
                value={customByKey[level.key] ?? value[level.key] ?? ''}
                onChange={(event) => {
                  const custom = event.target.value;
                  setCustomByKey((current) => ({ ...current, [level.key]: custom }));
                  onChange({ ...value, [level.key]: custom });
                }}
              />
            ) : null}
            {!parentMissing && options.length === 0 ? (
              <p className="text-xs text-muted">
                No fixed options yet for this level — choose Other to type a value.
              </p>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function dependsTransitively(
  levels: AdministrativeLevel[],
  child: AdministrativeLevel,
  ancestorKey: string,
): boolean {
  let current = child.depends_on;
  const visited = new Set<string>();
  while (current) {
    if (current === ancestorKey) return true;
    if (visited.has(current)) break;
    visited.add(current);
    current = levels.find((level) => level.key === current)?.depends_on;
  }
  return false;
}
