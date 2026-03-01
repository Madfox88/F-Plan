import { useEffect, useState, useCallback, useMemo } from 'react';
import type { ActivityLogEntryWithUser, ActivityEntityType } from '../../types/database';
import { getActivityLog, getEntityActivityLog } from '../../lib/db';
import { useWorkspace } from '../../context/WorkspaceContext';
import { DatePicker } from '../ui/DatePicker';
import './ActivityFeed.css';

/* ── Helpers ── */

const ACTION_VERBS: Record<string, string> = {
  created: 'created',
  completed: 'completed',
  reopened: 'reopened',
  edited: 'edited',
  deleted: 'deleted',
  hidden: 'hid',
  unhidden: 'unhid',
  moved: 'moved',
  renamed: 'renamed',
  linked: 'linked',
  unlinked: 'unlinked',
};

const ENTITY_LABELS: Record<string, string> = {
  goal: 'goal',
  plan: 'plan',
  task: 'task',
  tag: 'tag',
  stage: 'stage',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ── Single Entry ── */

function ActivityEntry({ entry }: { entry: ActivityLogEntryWithUser }) {
  const verb = ACTION_VERBS[entry.action] || entry.action;
  const entityLabel = ENTITY_LABELS[entry.entity_type] || entry.entity_type;
  const meta = entry.metadata as Record<string, string>;

  return (
    <div className="activity-entry">
      <div className="activity-dot" data-action={entry.action} />
      <div className="activity-content">
        <div className="activity-message">
          <strong>{entry.user_display_name}</strong>{' '}
          {verb}{' '}
          <span className="activity-entity-badge" data-type={entry.entity_type}>{entityLabel}</span>{' '}
          <span className="activity-entity">{entry.entity_title}</span>
          {entry.action === 'renamed' && meta?.from && meta?.to && (
            <span className="activity-diff">
              {' '}— <span className="activity-diff-from">{meta.from}</span> → <span className="activity-diff-to">{meta.to}</span>
            </span>
          )}
          {meta?.plan && (
            <span className="activity-diff"> in {meta.plan}</span>
          )}
        </div>
        <div className="activity-meta">
          <span>{timeAgo(entry.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton ── */

function ActivitySkeleton({ rows = 5 }: { rows?: number }) {
  const widths = ['long', 'medium', 'short', 'long', 'medium'];
  return (
    <div className="activity-skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="activity-skeleton-row">
          <div className="activity-skeleton-dot" />
          <div className={`activity-skeleton-line ${widths[i % widths.length]}`} />
        </div>
      ))}
    </div>
  );
}

/* ── Props ── */

interface ActivityFeedProps {
  /** When provided, shows only activity for this entity. */
  entityType?: ActivityEntityType;
  entityId?: string;
  /** Max entries to show (used for dashboard widget). Defaults to 50. */
  limit?: number;
  /** Show entity type filter buttons. Defaults false. */
  showFilters?: boolean;
  /** Show "Load more" button. Defaults false. */
  showLoadMore?: boolean;
  /** Compact mode (fewer paddings, for inline use). */
  compact?: boolean;
}

/* ── Main Component ── */

export function ActivityFeed({
  entityType,
  entityId,
  limit = 50,
  showFilters = false,
  showLoadMore = false,
  compact = false,
}: ActivityFeedProps) {
  const { activeWorkspace } = useWorkspace();
  const [entries, setEntries] = useState<ActivityLogEntryWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<ActivityEntityType | 'all'>('all');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  /* ── Date filter state ── */
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const dateRange = useMemo<{ since?: string; until?: string }>(() => {
    const since = dateFrom ? new Date(dateFrom).toISOString() : undefined;
    const until = dateTo ? new Date(dateTo + 'T23:59:59').toISOString() : undefined;
    return { since, until };
  }, [dateFrom, dateTo]);

  const fetchEntries = useCallback(async (append = false) => {
    if (!activeWorkspace) return;
    try {
      if (!append) setLoading(true);
      let data: ActivityLogEntryWithUser[];

      if (entityType && entityId) {
        data = await getEntityActivityLog(entityType, entityId, limit);
        setHasMore(false); // Per-entity feeds are fully loaded
      } else {
        const effectiveType = filterType === 'all' ? undefined : filterType;
        data = await getActivityLog(activeWorkspace.id, {
          limit,
          offset: append ? offset : 0,
          entityType: effectiveType,
          since: dateRange.since,
          until: dateRange.until,
        });
        setHasMore(data.length === limit);
      }

      if (append) {
        setEntries((prev) => [...prev, ...data]);
      } else {
        setEntries(data);
      }
    } catch (err) {
      console.warn('[ActivityFeed] Failed to load entries:', err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, entityType, entityId, limit, filterType, offset, dateRange]);

  useEffect(() => {
    setOffset(0);
    fetchEntries(false);
  }, [activeWorkspace, entityType, entityId, filterType, dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    if (!activeWorkspace) return;
    getActivityLog(activeWorkspace.id, {
      limit,
      offset: newOffset,
      entityType: filterType === 'all' ? undefined : filterType,
      since: dateRange.since,
      until: dateRange.until,
    }).then((data) => {
      setEntries((prev) => [...prev, ...data]);
      setHasMore(data.length === limit);
    }).catch(() => setHasMore(false));
  };

  const FILTER_OPTIONS: Array<{ key: ActivityEntityType | 'all'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'goal', label: 'Goals' },
    { key: 'plan', label: 'Plans' },
    { key: 'task', label: 'Tasks' },
    { key: 'tag', label: 'Tags' },
    { key: 'stage', label: 'Stages' },
  ];

  if (loading) {
    return <ActivitySkeleton rows={compact ? 3 : 5} />;
  }

  return (
    <div className="activity-feed">
      {showFilters && (
        <div className="activity-filters">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`activity-filter-btn ${filterType === opt.key ? 'active' : ''}`}
              onClick={() => setFilterType(opt.key)}
            >
              {opt.label}
            </button>
          ))}

          <span className="activity-filters-sep" />

          <DatePicker
            label="From"
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="Start date"
          />
          <DatePicker
            label="To"
            value={dateTo}
            onChange={setDateTo}
            placeholder="End date"
          />
          {(dateFrom || dateTo) && (
            <button
              className="activity-filter-btn activity-date-clear"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="activity-empty">
          <p className="activity-empty__title">No activity yet</p>
          <p className="activity-empty__message">
            Actions like creating, completing, and editing items will appear here.
          </p>
        </div>
      ) : (
        entries.map((entry) => <ActivityEntry key={entry.id} entry={entry} />)
      )}

      {showLoadMore && hasMore && entries.length > 0 && (
        <button className="activity-load-more" onClick={handleLoadMore}>
          Load more…
        </button>
      )}
    </div>
  );
}
