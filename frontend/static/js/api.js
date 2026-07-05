/* Oyu · API client */
const API = {
  async _get(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async _post(url, body) {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  rooms:      () => API._get('/api/rooms'),
  room:       (id) => API._get(`/api/rooms/${id}`),
  lesson:     (id) => API._get(`/api/lessons/${id}`),
  submitEx:   (lesson_id, answers) => API._post('/api/exercises/submit', { lesson_id, answers }),
  exam:       (room) => API._get(`/api/exam/${room}`),
  submitExam: (room, answers) => API._post('/api/exam/submit', { room, answers }),
  graph:      (room) => API._get(`/api/graph/${room}`),
  progress:   () => API._get('/api/progress'),
  files:      () => API._get('/api/files'),
  async upload(file, room = 'general') {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('room', room);
    const r = await fetch('/api/files', { method: 'POST', body: fd });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  deleteFile: (id) => fetch(`/api/files/${id}`, { method: 'DELETE' }).then(r => r.json()),
  notes:      () => API._get('/api/notes'),
  saveNote:   (note) => API._post('/api/notes', note),
  deleteNote: (id) => fetch(`/api/notes/${id}`, { method: 'DELETE' }).then(r => r.json()),

  packs:       () => API._get('/api/packs'),
  obamaList:   () => API._get('/api/obama'),
  obamaUnread: () => API._get('/api/obama/unread'),
  obamaCreate: (item) => API._post('/api/obama', item),
  obamaReadAll: () => fetch('/api/obama/read-all', { method: 'POST' }).then(r => r.json()),
  obamaRead:   (id) => fetch(`/api/obama/${id}/read`, { method: 'POST' }).then(r => r.json()),
  obamaDone:   (id) => fetch(`/api/obama/${id}/done`, { method: 'POST' }).then(r => r.json()),
  obamaDelete: (id) => fetch(`/api/obama/${id}`, { method: 'DELETE' }).then(r => r.json()),
};
