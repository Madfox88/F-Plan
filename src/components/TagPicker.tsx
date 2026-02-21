import React, { useState, useRef, useEffect } from 'react';
import type { Tag, TagColor } from '../types/database';
import { createTag } from '../lib/database';
import './TagPicker.css';

const TAG_COLOR_OPTIONS: { value: TagColor; hex: string; label: string }[] = [
  { value: 'neutral', hex: '#9ca3af', label: 'Gray' },
  { value: 'blue',    hex: '#3b82f6', label: 'Blue' },
  { value: 'green',   hex: '#22c55e', label: 'Green' },
  { value: 'orange',  hex: '#f97316', label: 'Orange' },
  { value: 'red',     hex: '#ef4444', label: 'Red' },
  { value: 'purple',  hex: '#a855f7', label: 'Purple' },
];

interface TagPickerProps {
  /** All tags in the workspace */
  workspaceTags: Tag[];
  /** Currently selected tag IDs */
  selectedTagIds: string[];
  /** Called when selection changes */
  onChange: (tagIds: string[]) => void;
  /** Workspace ID for inline tag creation */
  workspaceId: string;
  /** Called after a new tag is created (parent should refresh workspaceTags) */
  onTagCreated?: (tag: Tag) => void;
  /** Disable interactions */
  disabled?: boolean;
}

export const TagPicker: React.FC<TagPickerProps> = ({
  workspaceTags,
  selectedTagIds,
  onChange,
  workspaceId,
  onTagCreated,
  disabled,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState<TagColor>('blue');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowCreate(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const filteredTags = workspaceTags.filter((t) =>
    t.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    if (!newLabel.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const tag = await createTag(workspaceId, newLabel.trim(), newColor);
      onTagCreated?.(tag);
      onChange([...selectedTagIds, tag.id]);
      setNewLabel('');
      setNewColor('blue');
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setCreating(false);
    }
  };

  const selectedTags = workspaceTags.filter((t) => selectedTagIds.includes(t.id));

  return (
    <div className="tag-picker" ref={containerRef}>
      {/* Selected tags display + trigger */}
      <div
        className={`tag-picker-trigger${isOpen ? ' open' : ''}${disabled ? ' disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !disabled && setIsOpen(!isOpen); } }}
      >
        {selectedTags.length > 0 ? (
          <div className="tag-picker-chips">
            {selectedTags.map((tag) => (
              <span key={tag.id} className={`tag-chip tag-chip--${tag.color}`}>
                {tag.label}
                <button
                  type="button"
                  className="tag-chip-remove"
                  onClick={(e) => { e.stopPropagation(); toggleTag(tag.id); }}
                  aria-label={`Remove ${tag.label}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className="tag-picker-placeholder">Select tags…</span>
        )}
        <span className="tag-picker-arrow">{isOpen ? '▴' : '▾'}</span>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="tag-picker-dropdown">
          <input
            type="text"
            className="tag-picker-search"
            placeholder="Search tags…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />

          <div className="tag-picker-list">
            {filteredTags.length === 0 && !search.trim() && (
              <div className="tag-picker-empty">No tags yet. Create one below.</div>
            )}
            {filteredTags.length === 0 && search.trim() && (
              <div className="tag-picker-empty">No matching tags.</div>
            )}
            {filteredTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-picker-option${isSelected ? ' selected' : ''}`}
                  onClick={() => toggleTag(tag.id)}
                >
                  <span className={`tag-picker-dot tag-dot--${tag.color}`} />
                  <span className="tag-picker-option-label">{tag.label}</span>
                  {isSelected && <span className="tag-picker-check">✓</span>}
                </button>
              );
            })}
          </div>

          {/* Inline create */}
          {!showCreate ? (
            <button
              type="button"
              className="tag-picker-create-btn"
              onClick={() => setShowCreate(true)}
            >
              + Create new tag
            </button>
          ) : (
            <div className="tag-picker-create-form">
              <input
                type="text"
                className="tag-picker-create-input"
                placeholder="Tag name"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateTag(); } }}
                maxLength={24}
                autoFocus
              />
              <div className="tag-picker-color-row">
                {TAG_COLOR_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className={`tag-picker-color-swatch${newColor === c.value ? ' active' : ''}`}
                    style={{ background: c.hex }}
                    onClick={() => setNewColor(c.value)}
                    title={c.label}
                  />
                ))}
              </div>
              {error && <div className="tag-picker-error">{error}</div>}
              <div className="tag-picker-create-actions">
                <button
                  type="button"
                  className="tag-picker-create-save"
                  onClick={handleCreateTag}
                  disabled={creating || !newLabel.trim()}
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
                <button
                  type="button"
                  className="tag-picker-create-cancel"
                  onClick={() => { setShowCreate(false); setError(null); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
