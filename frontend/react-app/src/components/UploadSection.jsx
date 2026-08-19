import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  uploadPDF, fetchNotesList, toggleNoteStatus,
  fetchSubjects, createSubject, updateSubjectMeta, deleteSubject,
} from '../utils/api';
import Loading from './Loading';
import { IconUpload, IconNotes } from './Icons';

/* ─────────────────────────────────────────
   Colour palette options for folder cards
───────────────────────────────────────── */
const COLOR_OPTIONS = [
  { color: '#8b5cf6', shadow: '#5b21b6', label: 'Violet'  },
  { color: '#f472b6', shadow: '#be185d', label: 'Pink'    },
  { color: '#fbbf24', shadow: '#b45309', label: 'Amber'   },
  { color: '#34d399', shadow: '#065f46', label: 'Mint'    },
  { color: '#60a5fa', shadow: '#1d4ed8', label: 'Blue'    },
  { color: '#f87171', shadow: '#991b1b', label: 'Red'     },
  { color: '#a78bfa', shadow: '#6d28d9', label: 'Lavender'},
  { color: '#fb923c', shadow: '#c2410c', label: 'Orange'  },
  { color: '#4ade80', shadow: '#166534', label: 'Green'   },
  { color: '#38bdf8', shadow: '#0369a1', label: 'Sky'     },
  { color: '#e879f9', shadow: '#a21caf', label: 'Fuchsia' },
  { color: '#94a3b8', shadow: '#475569', label: 'Slate'   },
];

const EMOJI_OPTIONS = [
  '📚','📖','🔬','🧬','⚗️','🧪','🧲','🔭',
  '📐','📏','📊','📈','🗺️','🌍','💡','🎨',
  '🎭','🏛️','⚖️','🎸','🎵','💻','🖥️','🧠',
  '🔧','⚙️','🚀','🌱','🦠','🔢','🅰️','📝',
];

function textColor(bg) {
  // Decide white or dark text based on luminance
  const hex = bg.replace('#','');
  const r = parseInt(hex.slice(0,2),16);
  const g = parseInt(hex.slice(2,4),16);
  const b = parseInt(hex.slice(4,6),16);
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
  return lum > 0.55 ? '#1e293b' : '#ffffff';
}

/* ─────────────────────────────────────────
   Customise Popover (rendered inline)
───────────────────────────────────────── */
function CustomisePopover({ folder, onSave, onClose }) {
  const [color,  setColor]  = useState(folder.meta.color  || '#8b5cf6');
  const [shadow, setShadow] = useState(folder.meta.shadow || '#5b21b6');
  const [emoji,  setEmoji]  = useState(folder.meta.emoji  || '📂');
  const [saving, setSaving] = useState(false);

  const handleColorPick = (opt) => { setColor(opt.color); setShadow(opt.shadow); };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ color, shadow, emoji });
    setSaving(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(30,41,59,0.45)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'white', border: '2px solid #1e293b',
        borderRadius: '20px', boxShadow: '8px 8px 0 #1e293b',
        padding: '1.75rem', maxWidth: 440, width: '90%',
        animation: 'pop-in 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontFamily: 'var(--font-display)' }}>
            Customise <span style={{ color }}>{folder.name}</span>
          </h3>
          <button type="button" onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',fontSize:'1.4rem',color:'#94a3b8',lineHeight:1 }}>✕</button>
        </div>

        {/* Preview */}
        <div style={{
          background: color, border: '2px solid #1e293b',
          borderRadius: '12px', padding: '1.1rem 1.25rem',
          boxShadow: `4px 4px 0 ${shadow}`,
          marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <span style={{ fontSize: '2rem' }}>{emoji}</span>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: textColor(color), fontFamily: 'var(--font-display)' }}>
            {folder.name}
          </span>
        </div>

        {/* Colour picker */}
        <label style={{ display:'block', fontWeight:800, fontSize:'0.72rem', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.6rem' }}>
          Colour
        </label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginBottom:'1.25rem' }}>
          {COLOR_OPTIONS.map(opt => (
            <button
              key={opt.color}
              type="button"
              title={opt.label}
              onClick={() => handleColorPick(opt)}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: opt.color,
                border: color === opt.color ? '3px solid #1e293b' : '2px solid transparent',
                boxShadow: color === opt.color ? `0 0 0 2px white, 0 0 0 4px ${opt.color}` : 'none',
                cursor: 'pointer', transition: 'transform 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}
            />
          ))}
        </div>

        {/* Emoji picker */}
        <label style={{ display:'block', fontWeight:800, fontSize:'0.72rem', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:'0.6rem' }}>
          Emoji / Icon
        </label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:'0.4rem', marginBottom:'1.5rem', maxHeight:120, overflowY:'auto' }}>
          {EMOJI_OPTIONS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              style={{
                background: emoji === e ? '#fef3c7' : 'var(--muted)',
                border: emoji === e ? '2px solid #1e293b' : '2px solid transparent',
                borderRadius: '8px', padding: '0.3rem 0.5rem',
                fontSize: '1.35rem', cursor: 'pointer',
                transition: 'transform 0.15s, background 0.15s',
              }}
              onMouseEnter={ev => ev.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={ev => ev.currentTarget.style.transform = ''}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', gap:'0.75rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex:1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : '✓ Save Changes'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Delete Confirmation Dialog
───────────────────────────────────────── */
function DeleteConfirmDialog({ folder, docCount, onConfirm, onClose, deleting }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(30,41,59,0.5)', backdropFilter: 'blur(4px)',
      }}
      onClick={e => { if (e.target === e.currentTarget && !deleting) onClose(); }}
    >
      <div style={{
        background: 'white', border: '2px solid #1e293b',
        borderRadius: '20px', boxShadow: '8px 8px 0 #dc2626',
        padding: '1.75rem', maxWidth: 400, width: '90%',
        animation: 'pop-in 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Icon + title */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#fecaca', border: '2px solid #dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', margin: '0 auto 0.85rem',
          }}>🗑️</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', margin: 0 }}>
            Delete &ldquo;{folder.name}&rdquo;?
          </h3>
        </div>

        {/* Warning */}
        <div style={{
          background: '#fef2f2', border: '2px solid #fca5a5',
          borderRadius: '10px', padding: '0.85rem 1rem',
          marginBottom: '1.5rem', fontSize: '0.92rem', color: '#7f1d1d',
        }}>
          <strong>This cannot be undone.</strong>{' '}
          {docCount > 0
            ? `All ${docCount} document${docCount > 1 ? 's' : ''} inside this folder will be permanently deleted.`
            : 'The folder is empty and will be permanently removed.'}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            disabled={deleting}
            onClick={onConfirm}
            style={{
              flex: 1, minHeight: 48, fontWeight: 800,
              background: '#dc2626', color: 'white',
              border: '2px solid #1e293b', borderRadius: '9999px',
              boxShadow: '4px 4px 0 #991b1b', cursor: 'pointer',
              fontSize: '0.95rem', transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-2px,-2px)'; e.currentTarget.style.boxShadow = '6px 6px 0 #991b1b'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '4px 4px 0 #991b1b'; }}
          >
            {deleting ? 'Deleting…' : 'Yes, Delete Folder'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={deleting}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}


const UploadSection = () => {
  const [subjects,       setSubjects]       = useState([]);
  const [notes,          setNotes]          = useState([]);
  const [openFolder,     setOpenFolder]     = useState(null);
  const [files,          setFiles]          = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [status,         setStatus]         = useState(null);
  const [dragOver,       setDragOver]       = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName,  setNewFolderName]  = useState('');
  const [newFolderColor, setNewFolderColor] = useState(COLOR_OPTIONS[4]); // blue
  const [newFolderEmoji, setNewFolderEmoji] = useState('📂');
  const [creatingLoading,setCreatingLoading]= useState(false);
  const [customising,    setCustomising]    = useState(null);
  const [confirmDelete,  setConfirmDelete]  = useState(null); // folder object to confirm
  const [deleting,       setDeleting]       = useState(false);
  const [initialLoad,    setInitialLoad]    = useState(true);

  const inputRef    = useRef(null);
  const newNameRef  = useRef(null);

  const loadAll = useCallback(async () => {
    try {
      const [subData, noteData] = await Promise.all([fetchSubjects(), fetchNotesList()]);
      if (subData.success)  setSubjects(subData.subjects);  // array of { name, meta }
      if (noteData.success) setNotes(noteData.documents);
    } catch (e) {
      console.error('Failed to load notes/subjects:', e);
    } finally {
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    if (creatingFolder && newNameRef.current) newNameRef.current.focus();
  }, [creatingFolder]);

  /* ── Create folder ── */
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    setCreatingLoading(true);
    try {
      const data = await createSubject(name, {
        color:  newFolderColor.color,
        shadow: newFolderColor.shadow,
        emoji:  newFolderEmoji,
      });
      if (data.success) {
        await loadAll();
        setNewFolderName('');
        setCreatingFolder(false);
        setOpenFolder(name);
      }
    } catch (err) {
      setStatus({ type: 'status-error', message: err.message });
    } finally {
      setCreatingLoading(false);
    }
  };

  /* ── Save appearance ── */
  const handleSaveAppearance = async (meta) => {
    if (!customising) return;
    try {
      await updateSubjectMeta(customising.name, meta);
      await loadAll();
      setCustomising(null);
    } catch (err) {
      setStatus({ type: 'status-error', message: err.message });
      setCustomising(null);
    }
  };

  /* ── Delete folder ── */
  const handleDeleteFolder = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteSubject(confirmDelete.name);
      // If we were inside that folder, go back to grid
      if (openFolder === confirmDelete.name) setOpenFolder(null);
      setConfirmDelete(null);
      await loadAll();
    } catch (err) {
      setStatus({ type: 'status-error', message: err.message });
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  /* ── File helpers ── */
  const addPdfs = (fileList) => {
    if (!fileList) return;
    const valid = [], errors = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      (f.type !== 'application/pdf' && !f.name.endsWith('.pdf'))
        ? errors.push(`"${f.name}" is not a PDF.`)
        : valid.push(f);
    }
    if (errors.length) setStatus({ type: 'status-error', message: errors.join(' ') });
    else setStatus(null);
    if (valid.length) setFiles(p => [...p, ...valid]);
  };

  const removeFile = (idx) => setFiles(p => p.filter((_, i) => i !== idx));

  /* ── Upload ── */
  const handleUpload = async () => {
    if (!files.length) {
      setStatus({ type: 'status-error', message: 'Select at least one PDF first.' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const data = await uploadPDF(files, openFolder);
      if (data.success) {
        setStatus({ type: 'status-success', message: `✓ ${files.length} file(s) added to "${openFolder}".` });
        setFiles([]);
        const noteData = await fetchNotesList();
        if (noteData.success) setNotes(noteData.documents);
      } else {
        setStatus({ type: 'status-error', message: data.error || 'Upload failed.' });
      }
    } catch (err) {
      setStatus({ type: 'status-error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  /* ── Toggle active ── */
  const toggleActive = async (noteId) => {
    const idx = notes.findIndex(n => n.id === noteId);
    if (idx === -1) return;
    const updated = notes.map((n, i) => i === idx ? { ...n, active: !n.active } : n);
    setNotes(updated);
    try { await toggleNoteStatus(noteId); }
    catch { setNotes(notes); }
  };

  /* ── Derived ── */
  const folderDocs = openFolder
    ? notes.filter(n => (n.subject || 'General') === openFolder)
    : [];
  const openFolderObj = subjects.find(s => s.name === openFolder);
  const folderMeta = openFolderObj?.meta || { color: '#8b5cf6', shadow: '#5b21b6', emoji: '📂' };

  if (initialLoad) {
    return (
      <div>
        <div className="page-header">
          <h2 className="page-title">Notes Library</h2>
        </div>
        <Loading message="Loading your folders…" />
      </div>
    );
  }

  /* ═══════════════════════════════════════
     FOLDER GRID VIEW
  ════════════════════════════════════════ */
  if (!openFolder) {
    return (
      <div>
        {customising && (
          <CustomisePopover
            folder={customising}
            onSave={handleSaveAppearance}
            onClose={() => setCustomising(null)}
          />
        )}
        {confirmDelete && (
          <DeleteConfirmDialog
            folder={confirmDelete}
            docCount={notes.filter(n => (n.subject || 'General') === confirmDelete.name).length}
            onConfirm={handleDeleteFolder}
            onClose={() => setConfirmDelete(null)}
            deleting={deleting}
          />
        )}

        <div className="page-header">
          <h2 className="page-title">Notes Library</h2>
          <p className="page-subtitle">Choose a subject folder to manage your PDFs — or create a new one.</p>
        </div>

        {status && (
          <div className={`status-message ${status.type}`} style={{ marginBottom: '1.25rem' }}>
            {status.message}
          </div>
        )}

        {/* Folder cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1.25rem',
        }}>
          {subjects.map(folder => {
            const { color, shadow, emoji } = folder.meta;
            const tc = textColor(color);
            const docCount = notes.filter(n => (n.subject || 'General') === folder.name).length;

            return (
              <div key={folder.name} style={{ position: 'relative' }}>
                {/* Top-right: Customise button */}
                <button
                  type="button"
                  title="Customise folder appearance"
                  onClick={e => { e.stopPropagation(); setCustomising(folder); }}
                  style={{
                    position: 'absolute', top: 8, right: 8, zIndex: 2,
                    background: 'rgba(255,255,255,0.25)',
                    backdropFilter: 'blur(4px)',
                    border: '1.5px solid rgba(255,255,255,0.5)',
                    borderRadius: '9999px',
                    width: 30, height: 30,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: '0.9rem',
                    transition: 'background 0.15s, transform 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = ''; }}
                >
                  ✏️
                </button>

                {/* Top-left: Delete button (only for non-General folders) */}
                {folder.name !== 'General' && (
                  <button
                    type="button"
                    title="Delete folder"
                    onClick={e => { e.stopPropagation(); setConfirmDelete(folder); }}
                    style={{
                      position: 'absolute', top: 8, left: 8, zIndex: 2,
                      background: 'rgba(255,255,255,0.25)',
                      backdropFilter: 'blur(4px)',
                      border: '1.5px solid rgba(255,255,255,0.5)',
                      borderRadius: '9999px',
                      width: 30, height: 30,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', fontSize: '0.85rem',
                      transition: 'background 0.15s, transform 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.35)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.transform = ''; }}
                  >
                    🗑️
                  </button>
                )}

                {/* Folder card button */}
                <button
                  type="button"
                  onClick={() => { setStatus(null); setFiles([]); setOpenFolder(folder.name); }}
                  style={{
                    width: '100%',
                    background: color,
                    border: '2px solid #1e293b',
                    borderRadius: '16px',
                    padding: '1.6rem 1.25rem 1.25rem',
                    boxShadow: `5px 5px 0 ${shadow}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.25s',
                    display: 'flex', flexDirection: 'column', gap: '0.4rem',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translate(-3px,-3px) rotate(-1.5deg)';
                    e.currentTarget.style.boxShadow = `8px 8px 0 ${shadow}`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = `5px 5px 0 ${shadow}`;
                  }}
                >
                  <span style={{ fontSize: '2.25rem', lineHeight: 1 }}>{emoji}</span>
                  <strong style={{ fontSize: '1.05rem', color: tc, fontFamily: 'var(--font-display)', wordBreak: 'break-word', marginTop: '0.25rem' }}>
                    {folder.name}
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: tc, opacity: 0.85, fontWeight: 700 }}>
                    {docCount} {docCount === 1 ? 'document' : 'documents'}
                  </span>
                </button>
              </div>
            );
          })}

          {/* ── Create new folder card ── */}
          {!creatingFolder ? (
            <button
              type="button"
              onClick={() => setCreatingFolder(true)}
              style={{
                background: 'white', border: '2px dashed #94a3b8',
                borderRadius: '16px', padding: '1.6rem 1.25rem 1.25rem',
                cursor: 'pointer', textAlign: 'center', color: 'var(--muted-foreground)',
                transition: 'background 0.2s, border-color 0.2s, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: '0.5rem', minHeight: 140,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#fef3c7';
                e.currentTarget.style.borderColor = '#1e293b';
                e.currentTarget.style.transform = 'rotate(-1.5deg) scale(1.02)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#94a3b8';
                e.currentTarget.style.transform = '';
              }}
            >
              <span style={{ fontSize: '2.25rem', lineHeight: 1 }}>➕</span>
              <strong style={{ fontSize: '0.95rem', fontFamily: 'var(--font-display)' }}>New Subject</strong>
              <span style={{ fontSize: '0.8rem' }}>Create a folder</span>
            </button>
          ) : (
            /* Inline create form card */
            <form
              onSubmit={handleCreateFolder}
              style={{
                background: 'white', border: '2px solid #1e293b',
                borderRadius: '16px', padding: '1.25rem',
                boxShadow: `5px 5px 0 ${newFolderColor.color}`,
                display: 'flex', flexDirection: 'column', gap: '0.75rem',
                minHeight: 140,
              }}
            >
              <strong style={{ fontSize: '0.88rem', fontFamily: 'var(--font-display)', color: 'var(--foreground)' }}>
                New Subject Folder
              </strong>

              <input
                ref={newNameRef}
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="e.g. Physics, Biology…"
                style={{ marginBottom: 0 }}
              />

              {/* Mini colour strip */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {COLOR_OPTIONS.map(opt => (
                  <button
                    key={opt.color} type="button" title={opt.label}
                    onClick={() => setNewFolderColor(opt)}
                    style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: opt.color,
                      border: newFolderColor.color === opt.color ? '2px solid #1e293b' : '2px solid transparent',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  />
                ))}
              </div>

              {/* Mini emoji strip */}
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', maxHeight: 70, overflowY: 'auto' }}>
                {EMOJI_OPTIONS.slice(0, 16).map(e => (
                  <button
                    key={e} type="button"
                    onClick={() => setNewFolderEmoji(e)}
                    style={{
                      background: newFolderEmoji === e ? '#fef3c7' : 'var(--muted)',
                      border: newFolderEmoji === e ? '1.5px solid #1e293b' : '1.5px solid transparent',
                      borderRadius: '6px', fontSize: '1.1rem',
                      padding: '0.15rem 0.3rem', cursor: 'pointer',
                    }}
                  >{e}</button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="submit" className="btn btn-primary"
                  disabled={creatingLoading || !newFolderName.trim()}
                  style={{ flex: 1, minHeight: 40, fontSize: '0.85rem', padding: '0.5rem' }}
                >
                  {creatingLoading ? '…' : 'Create'}
                </button>
                <button
                  type="button" className="btn btn-ghost"
                  onClick={() => { setCreatingFolder(false); setNewFolderName(''); }}
                  style={{ minHeight: 40, fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════
     INSIDE FOLDER VIEW
  ════════════════════════════════════════ */
  const tc = textColor(folderMeta.color);

  return (
    <div>
      {customising && (
        <CustomisePopover
          folder={customising}
          onSave={handleSaveAppearance}
          onClose={() => setCustomising(null)}
        />
      )}
      {confirmDelete && (
        <DeleteConfirmDialog
          folder={confirmDelete}
          docCount={notes.filter(n => (n.subject || 'General') === confirmDelete.name).length}
          onConfirm={handleDeleteFolder}
          onClose={() => setConfirmDelete(null)}
          deleting={deleting}
        />
      )}

      {/* Breadcrumb / header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <button
          type="button"
          onClick={() => { setOpenFolder(null); setFiles([]); setStatus(null); }}
          style={{
            background: 'white', border: '2px solid #1e293b', borderRadius: '9999px',
            padding: '0.45rem 1rem', cursor: 'pointer', fontWeight: 800,
            fontSize: '0.9rem', boxShadow: '3px 3px 0 #1e293b',
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            marginTop: '0.35rem', flexShrink: 0,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fef3c7'}
          onMouseLeave={e => e.currentTarget.style.background = 'white'}
        >
          ← All Folders
        </button>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{
              background: folderMeta.color, border: '2px solid #1e293b',
              borderRadius: '9999px', padding: '0.25rem 0.85rem',
              fontSize: '0.72rem', fontWeight: 800, color: tc,
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {folderMeta.emoji} Subject
            </span>
            <h2 className="page-title" style={{ margin: 0 }}>{openFolder}</h2>
            <button
              type="button"
              title="Customise folder appearance"
              onClick={() => setCustomising(openFolderObj)}
              style={{
                background: 'var(--muted)', border: '2px solid #1e293b',
                borderRadius: '9999px', padding: '0.3rem 0.75rem',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#fef3c7'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--muted)'}
            >
              ✏️ Customise
            </button>
            {openFolder !== 'General' && (
              <button
                type="button"
                title="Delete this folder"
                onClick={() => openFolderObj && setConfirmDelete(openFolderObj)}
                style={{
                  background: '#fef2f2', border: '2px solid #dc2626',
                  borderRadius: '9999px', padding: '0.3rem 0.75rem',
                  cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
                  color: '#dc2626',
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
              >
                🗑️ Delete Folder
              </button>
            )}
          </div>
          <p className="page-subtitle" style={{ marginTop: '0.25rem' }}>
            Upload new PDFs or manage the documents in this folder.
          </p>
        </div>
      </div>

      {/* Upload card */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>
          Upload to{' '}
          <span style={{
            background: folderMeta.color, color: tc,
            borderRadius: '8px', padding: '0.1rem 0.6rem', fontSize: '0.9em',
          }}>
            {folderMeta.emoji} {openFolder}
          </span>
        </h3>

        <div
          className={`upload-area ${dragOver ? 'active' : ''}`}
          role="button" tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addPdfs(e.dataTransfer.files); }}
        >
          <IconUpload />
          <strong>Drop PDFs here, or click to browse</strong>
          <p>Multiple files · max 300 pages total · text-based PDFs work best</p>

          {files.length > 0 && (
            <div
              style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}
              onClick={e => e.stopPropagation()}
            >
              {files.map((f, idx) => (
                <span key={idx} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  background: 'white', border: '2px solid #1e293b',
                  borderRadius: '9999px', padding: '0.2rem 0.7rem',
                  fontSize: '0.8rem', fontWeight: 700,
                }}>
                  {f.name}
                  <button
                    type="button"
                    onClick={ev => { ev.stopPropagation(); removeFile(idx); }}
                    style={{ background:'none',border:'none',cursor:'pointer',color:'#dc2626',fontWeight:900,fontSize:'1rem',lineHeight:1,padding:0 }}
                  >×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <input ref={inputRef} type="file" accept=".pdf,application/pdf" multiple hidden onChange={e => addPdfs(e.target.files)} />

        <button
          type="button" className="btn btn-primary btn-block"
          style={{ marginTop: '1rem' }}
          onClick={handleUpload}
          disabled={loading || files.length === 0}
        >
          {loading ? 'Uploading…' : `Upload ${files.length > 0 ? `(${files.length} file${files.length > 1 ? 's' : ''})` : 'PDF'}`}
        </button>

        {loading && <Loading message={`Processing and saving to "${openFolder}"…`} />}
        {status && <div className={`status-message ${status.type}`} style={{ marginTop: '1rem' }}>{status.message}</div>}
      </div>

      {/* Docs in folder */}
      <div className="card">
        <h3 style={{ marginBottom: '0.25rem' }}>
          Documents in{' '}
          <span style={{ color: folderMeta.color }}>{folderMeta.emoji} {openFolder}</span>
        </h3>
        <p className="page-subtitle" style={{ marginBottom: '1rem' }}>
          Toggle active/inactive to control which notes are used in quizzes and chat.
        </p>
        <div className="file-list">
          {folderDocs.length === 0 ? (
            <div className="empty-state">No documents yet — upload your first PDF above!</div>
          ) : (
            folderDocs.map(note => (
              <div key={note.id} className="file-item">
                <div className="file-name">
                  <IconNotes size={18} />
                  <span>{note.name}</span>
                </div>
                <button
                  type="button"
                  className={`toggle-chip ${note.active ? 'on' : 'off'}`}
                  onClick={() => toggleActive(note.id)}
                  aria-pressed={!!note.active}
                >
                  {note.active ? 'Active' : 'Inactive'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadSection;
