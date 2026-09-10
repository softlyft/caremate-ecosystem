/** Prefer returning this from Server Actions for expected failures (do not throw). */
export type ActionResult<T = void> = T extends void
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

export type RequestOrgConnectionResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; needsResendConfirm: true; rejectionReason: string | null };

export function actionOk(): { ok: true };
export function actionOk<T>(data: T): { ok: true; data: T };
export function actionOk<T>(data?: T) {
  return data === undefined ? ({ ok: true } as const) : ({ ok: true, data } as const);
}

export function actionFail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export function actionNeedsResendConfirm(
  rejectionReason: string | null,
): { ok: false; needsResendConfirm: true; rejectionReason: string | null } {
  return { ok: false, needsResendConfirm: true, rejectionReason };
}
