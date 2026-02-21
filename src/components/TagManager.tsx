import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  getTagsByWorkspace,
  createTag,
  updateTag,
  deleteTag,
} from '../lib/database';
import type { Tag, TagColor } from '../types/database';
import './TagManager.css';

const TAG_COLORS: { value: TagColor; hex: string; label: string }[] = [
  { value: 'neutral', hex: '#9ca3af', label: 'Gray' },
  { value: 'blue',    hex: '#3b82f6', label: 'Blue' },
  { value: 'green',   hex: '#22c55e', label: 'Green' },
  { value: 'orange',  hex: '#f97316', label: 'Orange' },
  { value: 'red',     hex: '#ef4444', label: 'Red' },
  { value: 'purple',  hex: '#a855f7', label: 'Purple' },
];

export const TagManager: React.FC = () => {
  const { activeWorkspace } = useWorkspace();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── New tag form ────────────────────────────────────
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState<TagColor>('blue');
  const [creating, setCreating] = useState(false);

  // ── Inline edit state ───────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState<TagColor>('blue');
  const [saving, setSaving] = useState(false);

  // ── Delete state ────────────────────────────────────
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const data = await getTagsByWorkspace(activeWorkspace.id);
      setTags(data);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load tags' });
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // ── Create ──────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !newLabel.trim()) return;
    setCreating(true);
    try {
      const tag = await createTag(activeWorkspace.id, newLabel.trim(), newColor);
      setTags((prev) => [...prev, tag].sort((a, b) => a.label.localeCompare(b.label)));
      setNewLabel('');
      setNewColor('blue');
      setMessage({ type: 'success', text: `Tag "${tag.label}" created` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to create tag' });
    } finally {
      setCreating(false);
    }
  };

  // ── Edit ────────────────────────────────────────────
  const startEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditLabel(tag.label);
    setEditColor(tag.color);
    setConfirmDeleteId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditLabel('');
    setEditColor('blue');
  };

  const handleSave = async () => {
    if (!editingId || !editLabel.trim()) return;
    setSaving(true);
    try {
      const updated = await updateTag(editingId, { label: editLabel.trim(), color: editColor });
      setTags((prev) =>
        prev.map((t) => (t.id === editingId ? updated : t)).sort((a, b) => a.label.localeCompare(b.label))
      );
      cancelEdit();
      setMessage({ type: 'success', text: 'Tag updated' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update tag' });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await deleteTag(id);
      setTags((prev) => prev.filter((t) => t.id !== id));
      setConfirmDeleteId(null);
      setMessage({ type: 'success', text: 'Tag deleted' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to delete tag' });
    }
  };

  return (
    <div className="tag-manager">
      {/* Message banner */}
      {message && (
        <div className={`settings-message settings-message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Create form */}
      <div className="settings-card">
        <h3 className="settings-section-title">Create Tag</h3>
        <form className="tm-create-form" onSubmit={handleCreate}>
          <input
            className="settings-input tm-create-input"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Tag name"
            maxLength={24}
            disabled={creating}
          />
          <div className="tm-color-row">
            {TAG_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`tm-color-swatch${newColor === c.value ? ' active' : ''}`}
                style={{ background: c.hex }}
                onClick={() => setNewColor(c.value)}
                title={c.label}
              />
            ))}
          </div>
          <button
            type="submit"
            className="settings-button primary"
            disabled={creating || !newLabel.trim()}
          >
            {creating ? 'Creating…' : 'Create Tag'}
          </button>
        </form>
      </div>

      {/* Tags list */}
      <div className="settings-card">
        <h3 className="settings-section-title">All Tags ({tags.length})</h3>
        {loading ? (
          <p className="tm-loading">Loading tags…</p>
        ) : tags.length === 0 ? (
          <p className="tm-empty">No tags yet. Create one above to get started.</p>
        ) : (
          <div className="tm-list">
            {tags.map((tag) => (
              <div key={tag.id} className="tm-row">
                {editingId === tag.id ? (
                  /* Inline editing */
                  <div className="tm-edit-form">
                    <input
                      className="settings-input tm-edit-input"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      maxLength={24}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <div className="tm-color-row">
                      {TAG_COLORS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          className={`tm-color-swatch tm-color-swatch-sm${editColor === c.value ? ' active' : ''}`}
                          style={{ background: c.hex }}
                          onClick={() => setEditColor(c.value)}
                          title={c.label}
                        />
                      ))}
                    </div>
                    <div className="tm-edit-actions">
                      <button
                        className="settings-button primary small"
                        onClick={handleSave}
                        disabled={saving || !editLabel.trim()}
                      >
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button className="settings-button secondary small" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <>
                    <div className="tm-tag-info">
                      <span className={`tm-dot tm-dot--${tag.color}`} />
                      <span className="tm-tag-label">{tag.label}</span>
                    </div>
                    <div className="tm-tag-actions">
                      <button
                        className="tm-action-btn"
                        onClick={() => startEdit(tag)}
                        title="Edit tag"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {confirmDeleteId === tag.id ? (
                        <div className="tm-confirm-delete">
                          <span className="tm-confirm-text">Delete?</span>
                          <button
                            className="tm-confirm-yes"
                            onClick={() => handleDelete(tag.id)}
                          >
                            Yes
                          </button>
                          <button
                            className="tm-confirm-no"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          className="tm-action-btn tm-action-btn-danger"
                          onClick={() => { setConfirmDeleteId(tag.id); setEditingId(null); }}
                          title="Delete tag"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
