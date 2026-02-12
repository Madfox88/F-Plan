/**
 * FocusSessionModal — Start / monitor / end a focus session.
 *
 * FOCUS_SESSIONS_RULES.md:
 * - User-initiated, time-bounded, private
 * - Optional single context link (task OR plan OR goal)
 * - Min 5 min (silently discarded), max 240 min (capped)
 * - No pause, no Pomodoro, no break timers, no notifications
 *
 * DASHBOARD_RULES.md §7:
 * - Focus Session Entry Point is the ONLY interactive Dashboard element
 * - Start / resume button
 *
 * Uses universal popup system (ModalBase.css).
 */

import { useEffect, useRef, useState } from 'react';
import type { Plan, Goal, FocusSession } from '../types/database';
import {
  startFocusSession,
  endFocusSession,
  getActiveFocusSession,
  getActivePlans,
  getGoalsByWorkspace,
} from '../lib/database';
import { FocusTimer } from './FocusTimer';
import ChevronDownIcon from '../assets/icons/angle-small-down.svg';
import './FocusSessionModal.css';

interface FocusSessionModalProps {
  isOpen: boolean;
  workspaceId: string;
  userId: string;
  onClose: () => void;
  /** Called after a session ends so Dashboard can refresh stats */
  onSessionEnd?: () => void;
}

type ContextType = 'none' | 'plan' | 'goal';

export function FocusSessionModal({
  isOpen,
  workspaceId,
  userId,
  onClose,
  onSessionEnd,
}: FocusSessionModalProps) {
  // Active session state
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // New session form
  const [contextType, setContextType] = useState<ContextType>('none');
  const [contextId, setContextId] = useState<string>('');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isContextTypeOpen, setIsContextTypeOpen] = useState(false);
  const [isContextValueOpen, setIsContextValueOpen] = useState(false);
  const contextTypeRef = useRef<HTMLDivElement>(null);
  const contextValueRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endMessage, setEndMessage] = useState<string | null>(null);

  // Check for active session & load plans/goals on open
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setEndMessage(null);

    const init = async () => {
      try {
        const session = await getActiveFocusSession(userId, workspaceId);
        if (session) {
          setActiveSession(session);
        } else {
          setActiveSession(null);
          const [p, g] = await Promise.all([
            getActivePlans(workspaceId),
            getGoalsByWorkspace(workspaceId),
          ]);
          setPlans(p);
          setGoals(g);
        }
      } catch {
        /* ignore – no focus_sessions table yet is fine */
      }
    };
    init();
  }, [isOpen, userId, workspaceId]);

  // Live timer
  useEffect(() => {
    if (activeSession) {
      const start = new Date(activeSession.started_at).getTime();
      const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      tick();
      timerRef.current = setInterval(tick, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      setElapsed(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [activeSession]);

  // Click-outside for dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextTypeRef.current && !contextTypeRef.current.contains(e.target as Node)) {
        setIsContextTypeOpen(false);
      }
      if (contextValueRef.current && !contextValueRef.current.contains(e.target as Node)) {
        setIsContextValueOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleStart = async () => {
    setError(null);
    setEndMessage(null);
    setLoading(true);
    try {
      const payload: Parameters<typeof startFocusSession>[0] = {
        userId,
        workspaceId,
      };
      if (contextType === 'plan' && contextId) payload.planId = contextId;
      if (contextType === 'goal' && contextId) payload.goalId = contextId;

      const session = await startFocusSession(payload);
      setActiveSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!activeSession) return;
    setError(null);
    setLoading(true);
    try {
      const result = await endFocusSession(activeSession.id);
      if (result) {
        setEndMessage(`Session ended — ${result.duration_minutes} min recorded.`);
      } else {
        setEndMessage('Session was shorter than 5 minutes and was discarded.');
      }
      setActiveSession(null);
      onSessionEnd?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setContextType('none');
    setContextId('');
    setIsContextTypeOpen(false);
    setIsContextValueOpen(false);
    setEndMessage(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const contextOptions =
    contextType === 'plan' ? plans :
    contextType === 'goal' ? goals :
    [];

  const selectedContextLabel = (() => {
    if (!contextId) return 'Select…';
    if (contextType === 'plan') return plans.find((p) => p.id === contextId)?.title || 'Select…';
    if (contextType === 'goal') return goals.find((g) => g.id === contextId)?.title || 'Select…';
    return 'Select…';
  })();

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content focus-session-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{activeSession ? 'Focus Session' : 'Start Focus Session'}</h2>
          <button className="close-button" onClick={handleClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6L18 18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          {endMessage && <div className="focus-end-message">{endMessage}</div>}

          {activeSession ? (
            /* ── Active session view ── */
            <div className="focus-active">
              <FocusTimer seconds={elapsed} active />
              <p className="focus-hint">
                {activeSession.plan_id && plans.find((p) => p.id === activeSession.plan_id)
                  ? `Focused on: ${plans.find((p) => p.id === activeSession.plan_id)?.title}`
                  : activeSession.goal_id && goals.find((g) => g.id === activeSession.goal_id)
                  ? `Focused on: ${goals.find((g) => g.id === activeSession.goal_id)?.title}`
                  : 'Free focus — no specific context'}
              </p>
              <p className="focus-hint-sub">
                Sessions under 5 minutes are automatically discarded.
              </p>
            </div>
          ) : (
            /* ── Start new session form ── */
            <>
              {!endMessage && (
                <div className="focus-setup">
                  <p className="focus-description">
                    Start a focused work session. Optionally link it to a plan or goal for tracking.
                  </p>

                  <div className="form-group">
                    <label className="form-label">Link to (optional)</label>
                    <div className="dropdown" ref={contextTypeRef}>
                      <button
                        type="button"
                        className="dropdown-trigger"
                        onClick={() => {
                          setIsContextValueOpen(false);
                          setIsContextTypeOpen(!isContextTypeOpen);
                        }}
                      >
                        <span>
                          {contextType === 'none' ? 'No context' :
                           contextType === 'plan' ? 'Plan' :
                           'Goal'}
                        </span>
                        <img src={ChevronDownIcon} alt="" className="dropdown-chevron" />
                      </button>
                      {isContextTypeOpen && (
                        <div className="dropdown-menu">
                          {([
                            { value: 'none' as ContextType, label: 'No context' },
                            { value: 'plan' as ContextType, label: 'Plan' },
                            { value: 'goal' as ContextType, label: 'Goal' },
                          ]).map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              className="dropdown-option"
                              onClick={() => {
                                setContextType(opt.value);
                                setContextId('');
                                setIsContextTypeOpen(false);
                              }}
                            >
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {contextType !== 'none' && (
                    <div className="form-group">
                      <label className="form-label">
                        {contextType === 'plan' ? 'Select plan' : 'Select goal'}
                      </label>
                      <div className="dropdown" ref={contextValueRef}>
                        <button
                          type="button"
                          className="dropdown-trigger"
                          onClick={() => {
                            setIsContextTypeOpen(false);
                            setIsContextValueOpen(!isContextValueOpen);
                          }}
                        >
                          <span>{selectedContextLabel}</span>
                          <img src={ChevronDownIcon} alt="" className="dropdown-chevron" />
                        </button>
                        {isContextValueOpen && (
                          <div className="dropdown-menu">
                            {contextOptions.length === 0 ? (
                              <div className="dropdown-empty">
                                No {contextType === 'plan' ? 'active plans' : 'goals'} found
                              </div>
                            ) : (
                              contextOptions.map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  className={`dropdown-option${contextId === item.id ? ' dropdown-option-active' : ''}`}
                                  onClick={() => {
                                    setContextId(item.id);
                                    setIsContextValueOpen(false);
                                  }}
                                >
                                  <span>{item.title}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          {activeSession ? (
            <button className="btn-primary focus-end-btn" onClick={handleEnd} disabled={loading}>
              <span>{loading ? 'Ending…' : 'End Session'}</span>
            </button>
          ) : endMessage ? (
            <button className="btn-primary" onClick={handleClose}>
              <span>Done</span>
            </button>
          ) : (
            <>
              <button className="btn-secondary" onClick={handleClose}><span>Cancel</span></button>
              <button className="btn-primary" onClick={handleStart} disabled={loading}>
                <span>{loading ? 'Starting…' : 'Start Session'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
