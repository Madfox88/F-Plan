import { useEffect, useMemo, useRef, useState } from 'react';
import type { Stage, Task, ChecklistItem, User } from '../types/database';
import { getUsers } from '../lib/database';
import { TaskStatusIndicator } from './TaskStatusIndicator';
import ChevronDownIcon from '../assets/icons/angle-small-down.svg';
import CalendarIcon from '../assets/icons/calendar.svg';
import PriorityUrgentIcon from '../assets/icons/priority-urgent.svg';
import PriorityImportantIcon from '../assets/icons/priority-important.svg';
import PriorityMediumIcon from '../assets/icons/priority-medium.svg';
import PriorityLowIcon from '../assets/icons/priority-low.svg';
import './TaskCreateModal.css';

export type TaskLabel = {
  id: string;
  name: string;
  color: string;
};

export type TaskCreatePayload = {
  title: string;
  stageId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  priority: 'urgent' | 'important' | 'medium' | 'low';
  startDate?: string;
  dueDate?: string;
  repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'customized';
  description?: string;
  checklists: ChecklistItem[];
  labels: TaskLabel[];
  assignedTo?: string | null;
};

interface TaskCreateModalProps {
  isOpen: boolean;
  planId: string;
  stages: Stage[];
  defaultStageId?: string;
  editingTask?: Task;
  currentUserId?: string | null;
  onClose: () => void;
  onSubmit: (payload: TaskCreatePayload, existingTaskId?: string) => Promise<void>;
}

const defaultLabelSet: TaskLabel[] = [
  { id: 'marketing', name: 'Marketing', color: '#ff7a7a' },
  { id: 'admin', name: 'Admin', color: '#7aa2ff' },
  { id: 'design', name: 'Design', color: '#7affb1' },
  { id: 'learning', name: 'Learning', color: '#ffd37a' },
];

export function TaskCreateModal({ isOpen, planId, stages, defaultStageId, editingTask, currentUserId, onClose, onSubmit }: TaskCreateModalProps) {
  const [title, setTitle] = useState('');
  const [stageId, setStageId] = useState('');
  const [status, setStatus] = useState<TaskCreatePayload['status']>('not_started');
  const [priority, setPriority] = useState<TaskCreatePayload['priority']>('medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [repeat, setRepeat] = useState<TaskCreatePayload['repeat']>('none');
  const [description, setDescription] = useState('');
  const [checklists, setChecklists] = useState<ChecklistItem[]>([{ id: '0', text: '', completed: false }]);
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [assignedLabelIds, setAssignedLabelIds] = useState<Set<string>>(new Set());
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#7aa2ff');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isStageOpen, setIsStageOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [isRepeatOpen, setIsRepeatOpen] = useState(false);
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const stageMenuRef = useRef<HTMLDivElement>(null);
  const priorityMenuRef = useRef<HTMLDivElement>(null);
  const repeatMenuRef = useRef<HTMLDivElement>(null);
  const assigneeMenuRef = useRef<HTMLDivElement>(null);

  const labelStorageKey = useMemo(() => `task-labels:${planId}`, [planId]);

  useEffect(() => {
    if (!isOpen) return;
    getUsers().then(setUsers).catch(() => setUsers([]));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const stored = localStorage.getItem(labelStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as TaskLabel[];
        setLabels(parsed);
      } catch {
        setLabels(defaultLabelSet);
      }
    } else {
      setLabels(defaultLabelSet);
    }
  }, [isOpen, labelStorageKey]);

  useEffect(() => {
    if (!isOpen) return;

    if (editingTask) {
      setTitle(editingTask.title || '');
      setStageId(editingTask.stage_id || defaultStageId || stages[0]?.id || '');
      const statusFromTask = editingTask.status || (editingTask.completed ? 'completed' : 'not_started');
      setStatus(statusFromTask);
      setPriority(editingTask.priority || 'medium');
      setStartDate(editingTask.start_date || '');
      setDueDate(editingTask.due_date || '');
      setRepeat(editingTask.repeat || 'none');
      setDescription(editingTask.description || '');
      setAssignedTo(editingTask.assigned_to || currentUserId || null);

      const checklistItems: ChecklistItem[] = (editingTask.checklists || []).map((item: any, index: number) => {
        if (typeof item === 'string') {
          return { id: `${index}-${Date.now()}`, text: item, completed: false };
        }
        return {
          id: item.id || `${index}-${Date.now()}`,
          text: item.text || '',
          completed: !!item.completed,
        };
      });
      setChecklists(checklistItems.length ? checklistItems : [{ id: '0', text: '', completed: false }]);

      const taskLabels = editingTask.labels || [];
      setLabels((prev) => {
        const merged = [...prev];
        taskLabels.forEach((label) => {
          if (!merged.some((existing) => existing.id === label.id)) {
            merged.push(label);
          }
        });
        return merged;
      });
      setAssignedLabelIds(new Set(taskLabels.map((label) => label.id)));
    } else {
      resetForm();
    }
  }, [isOpen, editingTask, defaultStageId, stages]);

  useEffect(() => {
    if (!isOpen) return;
    localStorage.setItem(labelStorageKey, JSON.stringify(labels));
  }, [labels, labelStorageKey, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
      if (stageMenuRef.current && !stageMenuRef.current.contains(event.target as Node)) {
        setIsStageOpen(false);
      }
      if (priorityMenuRef.current && !priorityMenuRef.current.contains(event.target as Node)) {
        setIsPriorityOpen(false);
      }
      if (repeatMenuRef.current && !repeatMenuRef.current.contains(event.target as Node)) {
        setIsRepeatOpen(false);
      }
      if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(event.target as Node)) {
        setIsAssigneeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resetForm = () => {
    setTitle('');
    setStageId(defaultStageId || stages[0]?.id || '');
    setStatus('not_started');
    setPriority('medium');
    setStartDate('');
    setDueDate('');
    setRepeat('none');
    setDescription('');
    setChecklists([{ id: '0', text: '', completed: false }]);
    setAssignedLabelIds(new Set());
    setNewLabelName('');
    setNewLabelColor('#7aa2ff');
    setAssignedTo(currentUserId || null);
    setError(null);
    setIsStatusOpen(false);
    setIsStageOpen(false);
    setIsPriorityOpen(false);
    setIsRepeatOpen(false);
    setIsAssigneeOpen(false);
  };

  const closeAllDropdowns = () => {
    setIsStatusOpen(false);
    setIsStageOpen(false);
    setIsPriorityOpen(false);
    setIsRepeatOpen(false);
    setIsAssigneeOpen(false);
  };

  const handleAddChecklist = () => {
    if (checklists.length >= 10) return;
    const newId = `${Date.now()}-${Math.random()}`;
    setChecklists([...checklists, { id: newId, text: '', completed: false }]);
  };

  const handleChecklistChange = (index: number, value: string) => {
    const next = [...checklists];
    next[index].text = value;
    setChecklists(next);
  };

  const handleChecklistRemove = (index: number) => {
    setChecklists(checklists.filter((_, i) => i !== index));
  };

  const toggleLabel = (labelId: string) => {
    const next = new Set(assignedLabelIds);
    if (next.has(labelId)) {
      next.delete(labelId);
    } else {
      next.add(labelId);
    }
    setAssignedLabelIds(next);
  };

  const handleCreateLabel = () => {
    if (!newLabelName.trim()) return;
    const id = `${newLabelName.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const newLabel: TaskLabel = { id, name: newLabelName.trim(), color: newLabelColor };
    setLabels([...labels, newLabel]);
    setAssignedLabelIds(new Set([...assignedLabelIds, id]));
    setNewLabelName('');
  };

  const handleRemoveLabel = (labelId: string) => {
    setLabels(labels.filter((label) => label.id !== labelId));
    const next = new Set(assignedLabelIds);
    next.delete(labelId);
    setAssignedLabelIds(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Task name is required');
      return;
    }

    if (!stageId) {
      setError('Please select a stage');
      return;
    }

    const assignedLabels = labels.filter((label) => assignedLabelIds.has(label.id));

    try {
      setLoading(true);
      await onSubmit({
        title: title.trim(),
        stageId,
        status,
        priority,
        startDate: startDate || undefined,
        dueDate: dueDate || undefined,
        repeat,
        description: description || undefined,
        checklists: checklists
          .filter((item) => item.text.trim())
          .map((item) => ({
            id: item.id,
            text: item.text.trim(),
            completed: !!item.completed,
          })),
        labels: assignedLabels,
        assignedTo: assignedTo || null,
      }, editingTask?.id);
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content task-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingTask ? 'Edit task' : 'Create task'}</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M18 6L6 18M6 6L18 18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="task-title">Task name *</label>
            <input
              id="task-title"
              className="form-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task name"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Stage</label>
              <div className="dropdown" ref={stageMenuRef}>
                <button
                  type="button"
                  className="dropdown-trigger"
                  onClick={() => {
                    closeAllDropdowns();
                    setIsStageOpen(true);
                  }}
                >
                  <span>{stages.find((stage) => stage.id === stageId)?.title || 'Select stage'}</span>
                  <img src={ChevronDownIcon} alt="" className="dropdown-chevron" />
                </button>
                {isStageOpen && (
                  <div className="dropdown-menu">
                    {stages.map((stage) => (
                      <button
                        key={stage.id}
                        type="button"
                        className="dropdown-option"
                        onClick={() => {
                          setStageId(stage.id);
                          setIsStageOpen(false);
                        }}
                      >
                        <span>{stage.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Progress</label>
              <div className="dropdown" ref={statusMenuRef}>
                <button
                  type="button"
                  className="dropdown-trigger"
                  onClick={() => {
                    closeAllDropdowns();
                    setIsStatusOpen(true);
                  }}
                >
                  <TaskStatusIndicator status={status} />
                  <span>
                    {status === 'not_started'
                      ? 'Not started'
                      : status === 'in_progress'
                      ? 'In progress'
                      : 'Completed'}
                  </span>
                  <img src={ChevronDownIcon} alt="" className="dropdown-chevron" />
                </button>
                {isStatusOpen && (
                  <div className="dropdown-menu">
                    <button
                      type="button"
                      className="dropdown-option"
                      onClick={() => {
                        setStatus('not_started');
                        setIsStatusOpen(false);
                      }}
                    >
                      <TaskStatusIndicator status="not_started" />
                      <span>Not started</span>
                    </button>
                    <button
                      type="button"
                      className="dropdown-option"
                      onClick={() => {
                        setStatus('in_progress');
                        setIsStatusOpen(false);
                      }}
                    >
                      <TaskStatusIndicator status="in_progress" />
                      <span>In progress</span>
                    </button>
                    <button
                      type="button"
                      className="dropdown-option"
                      onClick={() => {
                        setStatus('completed');
                        setIsStatusOpen(false);
                      }}
                    >
                      <TaskStatusIndicator status="completed" />
                      <span>Completed</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <div className="dropdown" ref={priorityMenuRef}>
                <button
                  type="button"
                  className="dropdown-trigger"
                  onClick={() => {
                    closeAllDropdowns();
                    setIsPriorityOpen(true);
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {priority === 'urgent' && <img src={PriorityUrgentIcon} alt="" style={{ width: '16px', height: '16px' }} />}
                    {priority === 'important' && <img src={PriorityImportantIcon} alt="" style={{ width: '16px', height: '16px' }} />}
                    {priority === 'medium' && <img src={PriorityMediumIcon} alt="" style={{ width: '16px', height: '16px' }} />}
                    {priority === 'low' && <img src={PriorityLowIcon} alt="" style={{ width: '16px', height: '16px' }} />}
                    {priority === 'urgent'
                      ? 'Urgent'
                      : priority === 'important'
                      ? 'Important'
                      : priority === 'medium'
                      ? 'Medium'
                      : 'Low'}
                  </span>
                  <img src={ChevronDownIcon} alt="" className="dropdown-chevron" />
                </button>
                {isPriorityOpen && (
                  <div className="dropdown-menu">
                    <button
                      type="button"
                      className="dropdown-option"
                      onClick={() => {
                        setPriority('urgent');
                        setIsPriorityOpen(false);
                      }}
                    >
                      <img src={PriorityUrgentIcon} alt="" style={{ width: '16px', height: '16px' }} />
                      <span>Urgent</span>
                    </button>
                    <button
                      type="button"
                      className="dropdown-option"
                      onClick={() => {
                        setPriority('important');
                        setIsPriorityOpen(false);
                      }}
                    >
                      <img src={PriorityImportantIcon} alt="" style={{ width: '16px', height: '16px' }} />
                      <span>Important</span>
                    </button>
                    <button
                      type="button"
                      className="dropdown-option"
                      onClick={() => {
                        setPriority('medium');
                        setIsPriorityOpen(false);
                      }}
                    >
                      <img src={PriorityMediumIcon} alt="" style={{ width: '16px', height: '16px' }} />
                      <span>Medium</span>
                    </button>
                    <button
                      type="button"
                      className="dropdown-option"
                      onClick={() => {
                        setPriority('low');
                        setIsPriorityOpen(false);
                      }}
                    >
                      <img src={PriorityLowIcon} alt="" style={{ width: '16px', height: '16px' }} />
                      <span>Low</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Start date</label>
              <div className="date-input-wrapper">
                <img src={CalendarIcon} alt="" className="date-input-icon" />
                <input className="form-input date-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Due date</label>
              <div className="date-input-wrapper">
                <img src={CalendarIcon} alt="" className="date-input-icon" />
                <input className="form-input date-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Repeat</label>
              <div className="dropdown" ref={repeatMenuRef}>
                <button
                  type="button"
                  className="dropdown-trigger"
                  onClick={() => {
                    closeAllDropdowns();
                    setIsRepeatOpen(true);
                  }}
                >
                  <span>
                    {repeat === 'none'
                      ? 'Do not repeat'
                      : repeat === 'daily'
                      ? 'Daily'
                      : repeat === 'weekly'
                      ? 'Weekly'
                      : repeat === 'monthly'
                      ? 'Monthly'
                      : repeat === 'yearly'
                      ? 'Yearly'
                      : 'Customized'}
                  </span>
                  <img src={ChevronDownIcon} alt="" className="dropdown-chevron" />
                </button>
                {isRepeatOpen && (
                  <div className="dropdown-menu">
                    {([
                      { value: 'none', label: 'Do not repeat' },
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'yearly', label: 'Yearly' },
                      { value: 'customized', label: 'Customized' },
                    ] as Array<{ value: TaskCreatePayload['repeat']; label: string }>).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className="dropdown-option"
                        onClick={() => {
                          setRepeat(option.value);
                          setIsRepeatOpen(false);
                        }}
                      >
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Assigned to</label>
            <div className="dropdown" ref={assigneeMenuRef}>
              <button
                type="button"
                className="dropdown-trigger"
                onClick={() => {
                  closeAllDropdowns();
                  setIsAssigneeOpen(true);
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {assignedTo ? (
                    <>
                      <span className="assignee-avatar-sm">
                        {users.find((u) => u.id === assignedTo)?.display_name?.charAt(0).toUpperCase() || '?'}
                      </span>
                      {users.find((u) => u.id === assignedTo)?.display_name || 'Unknown user'}
                    </>
                  ) : (
                    'Unassigned'
                  )}
                </span>
                <img src={ChevronDownIcon} alt="" className="dropdown-chevron" />
              </button>
              {isAssigneeOpen && (
                <div className="dropdown-menu">
                  <button
                    type="button"
                    className={`dropdown-option${!assignedTo ? ' dropdown-option-active' : ''}`}
                    onClick={() => {
                      setAssignedTo(null);
                      setIsAssigneeOpen(false);
                    }}
                  >
                    <span>Unassigned</span>
                  </button>
                  {users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className={`dropdown-option${assignedTo === user.id ? ' dropdown-option-active' : ''}`}
                      onClick={() => {
                        setAssignedTo(user.id);
                        setIsAssigneeOpen(false);
                      }}
                    >
                      <span className="assignee-avatar-sm">
                        {user.display_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
                      </span>
                      <span>{user.display_name || user.email}</span>
                    </button>
                  ))}
                  {users.length === 0 && (
                    <div className="dropdown-empty">No users found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description"
            />
          </div>

          <div className="form-group">
            <div className="form-section-header">
              <label className="form-label">Checklists</label>
              <button type="button" className="form-link" onClick={handleAddChecklist} disabled={checklists.length >= 10}>
                + Add checklist
              </button>
            </div>
            <div className="checklist-list">
              {checklists.map((item, index) => (
                <div key={item.id} className="checklist-row">
                  <input
                    className="form-input checklist-input"
                    type="text"
                    value={item.text}
                    onChange={(e) => handleChecklistChange(index, e.target.value)}
                    placeholder={`Checklist item ${index + 1}`}
                  />
                  {checklists.length > 1 && (
                    <button
                      type="button"
                      className="checklist-remove"
                      onClick={() => handleChecklistRemove(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {checklists.length >= 10 && (
                <div className="form-hint">Maximum of 10 checklist items.</div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Labels</label>
            <div className="label-create">
              <input
                className="form-input"
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                placeholder="New label"
              />
              <input
                className="color-input"
                type="color"
                value={newLabelColor}
                onChange={(e) => setNewLabelColor(e.target.value)}
                title="Choose color"
              />
              <button type="button" className="btn-secondary" onClick={handleCreateLabel}>
                Add
              </button>
            </div>

            <div className="label-grid">
              {labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  className={`label-chip ${assignedLabelIds.has(label.id) ? 'active' : ''}`}
                  onClick={() => toggleLabel(label.id)}
                >
                  <span className="label-color" style={{ backgroundColor: label.color }} />
                  {label.name}
                  <span
                    className="label-remove"
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveLabel(label.id);
                    }}
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={() => { resetForm(); onClose(); }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (editingTask ? 'Saving...' : 'Creating...') : (editingTask ? 'Save changes' : 'Create task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
