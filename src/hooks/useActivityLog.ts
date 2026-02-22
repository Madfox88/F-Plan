import { useCallback } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useCurrentUser } from '../context/UserContext';
import { logActivity } from '../lib/database';
import type { ActivityAction, ActivityEntityType } from '../types/database';

/**
 * Hook that provides a pre-bound `log()` function with workspace + user context.
 * Fire-and-forget — never blocks UI.
 *
 * Usage:
 *   const log = useActivityLog();
 *   log('completed', 'task', task.id, task.title, { plan: planTitle });
 */
export function useActivityLog() {
  const { activeWorkspace } = useWorkspace();
  const { userId } = useCurrentUser();

  const log = useCallback(
    (
      action: ActivityAction,
      entityType: ActivityEntityType,
      entityId: string,
      entityTitle: string,
      metadata?: Record<string, unknown>
    ) => {
      if (!activeWorkspace?.id || !userId) return;
      // Fire-and-forget — don't await
      logActivity({
        workspaceId: activeWorkspace.id,
        userId,
        action,
        entityType,
        entityId,
        entityTitle,
        metadata,
      });
    },
    [activeWorkspace, userId]
  );

  return log;
}
