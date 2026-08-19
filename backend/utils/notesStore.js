class NotesStore {
  constructor() {
    this.documents = []; // Array of { id, name, text, active, subject }
    this.subjects = ['General']; // List of subject folder names

    // Per-folder appearance metadata: { color, shadow, emoji }
    this.subjectMeta = {
      General: { color: '#8b5cf6', shadow: '#5b21b6', emoji: '📚' },
    };
  }

  /* ── Subject folders ── */
  addSubject(name, meta = {}) {
    const cleaned = name.trim();
    if (cleaned && !this.subjects.includes(cleaned)) {
      this.subjects.push(cleaned);
      this.subjectMeta[cleaned] = {
        color:  meta.color  || '#60a5fa',
        shadow: meta.shadow || '#1d4ed8',
        emoji:  meta.emoji  || '📂',
      };
      console.log(`📁 Subject folder created: ${cleaned}`);
      return cleaned;
    }
    return null;
  }

  updateSubjectMeta(name, meta) {
    if (!this.subjects.includes(name)) return null;
    this.subjectMeta[name] = {
      ...this.subjectMeta[name],
      ...meta,
    };
    console.log(`🎨 Subject appearance updated: ${name}`);
    return this.subjectMeta[name];
  }

  deleteSubject(name) {
    if (name === 'General') return { error: 'Cannot delete the General folder' };
    if (!this.subjects.includes(name)) return null;
    // Remove all documents that belong to this subject
    const removedCount = this.documents.filter(d => d.subject === name).length;
    this.documents = this.documents.filter(d => d.subject !== name);
    // Remove from subjects list and metadata
    this.subjects = this.subjects.filter(s => s !== name);
    delete this.subjectMeta[name];
    console.log(`🗑️  Subject deleted: ${name} (${removedCount} documents removed)`);
    return { name, removedCount };
  }

  getSubjects() {
    return this.subjects.map(name => ({
      name,
      meta: this.subjectMeta[name] || { color: '#8b5cf6', shadow: '#5b21b6', emoji: '📂' },
    }));
  }

  /* ── Documents ── */
  addDocument(name, text, subject) {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const activeSubject = subject && this.subjects.includes(subject) ? subject : (this.subjects[0] || 'General');
    const doc = {
      id,
      name,
      text,
      active: true,
      subject: activeSubject,
    };
    this.documents.push(doc);
    console.log(`📝 Document stored: ${name} in subject ${activeSubject} (${text.length} characters)`);
    return { id: doc.id, name: doc.name, active: doc.active, subject: doc.subject };
  }

  getDocumentsList() {
    return this.documents.map(doc => ({
      id:      doc.id,
      name:    doc.name,
      active:  doc.active,
      subject: doc.subject,
    }));
  }

  toggleDocument(id) {
    const doc = this.documents.find(d => d.id === id);
    if (doc) {
      doc.active = !doc.active;
      console.log(`🔄 Document ${doc.name} active state set to ${doc.active}`);
      return doc;
    }
    return null;
  }

  // Returns concatenated text of all ACTIVE documents for AI
  getNotes() {
    return this.documents
      .filter(doc => doc.active)
      .map(doc => `--- DOCUMENT: ${doc.name} ---\n${doc.text}`)
      .join('\n\n');
  }

  hasNotes() {
    return this.documents.some(doc => doc.active && doc.text.length > 0);
  }

  clear() {
    this.documents = [];
    this.subjects  = ['General'];
    this.subjectMeta = { General: { color: '#8b5cf6', shadow: '#5b21b6', emoji: '📚' } };
    console.log('🗑️  All documents and subjects cleared');
  }
}

module.exports = new NotesStore();
