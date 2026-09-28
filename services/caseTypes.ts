import { useEffect, useState } from 'react';

import { backendClient, type CaseTypeInfo } from './backendClient';

const cache = new Map<string, CaseTypeInfo>();

/** Loads (and caches) how a case category works on the backend: which fields
 * to collect, which are required, and what letter the app drafts. */
export async function loadCaseType(caseType: string): Promise<CaseTypeInfo | null> {
  const cached = cache.get(caseType);
  if (cached) return cached;
  try {
    const info = await backendClient.getCaseType(caseType);
    cache.set(caseType, info);
    return info;
  } catch {
    return null;
  }
}

export function useCaseType(caseType: string | null | undefined) {
  const [info, setInfo] = useState<CaseTypeInfo | null>(caseType ? cache.get(caseType) ?? null : null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!caseType) return;
    let active = true;
    setFailed(false);
    void loadCaseType(caseType).then((result) => {
      if (!active) return;
      setInfo(result);
      setFailed(result === null);
    });
    return () => {
      active = false;
    };
  }, [caseType, attempt]);

  return { info, failed, retry: () => setAttempt((n) => n + 1) };
}

export function fieldLabelFor(info: CaseTypeInfo | null, key: string): string {
  return info?.fields.find((f) => f.key === key)?.label ?? key;
}
