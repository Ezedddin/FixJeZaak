import { db } from '../db.js';
import { toJson } from '../utils/json.js';

/** Action types the agent is currently allowed to prepare. Extend this
 * allowlist when adding new consequential actions (submit_objection,
 * send_email, ...) — the agent can never invent a new action type. */
export const ALLOWED_ACTION_TYPES = ['prepare_objection'] as const;
export type ActionType = (typeof ALLOWED_ACTION_TYPES)[number];

/**
 * Creates (or replaces) the case's pending action. This is the single
 * choke point every consequential-action tool must go through — it always
 * lands in "pending_approval", never anything further. The only way an
 * Action can move to "approved" is the explicit REST endpoint in
 * routes/actions.ts, which the agent has no access to.
 */
export async function createPendingAction(
  caseId: string,
  type: ActionType,
  payload: Record<string, unknown>,
) {
  const action = await db.action.create({
    data: { caseId, type, status: 'pending_approval', payload: toJson(payload) },
  });
  await db.case.update({ where: { id: caseId }, data: { status: 'awaiting_approval' } });
  return action;
}
