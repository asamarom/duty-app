const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const app = express();

app.use(cors());
app.use(express.json());

// Serve role-switcher.html (original with Firebase Auth emulator)
app.get('/role-switcher', (req, res) => {
  res.sendFile(path.join(__dirname, 'role-switcher.html'));
});

// Serve role-switcher-simple.html (simplified with admin API)
app.get('/role-switcher-simple', (req, res) => {
  res.sendFile(path.join(__dirname, 'role-switcher-simple.html'));
});

// Default to simple version
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'role-switcher-simple.html'));
});

// GET /api/users — list all users (for role-switcher dropdown)
app.get('/api/users', async (req, res) => {
  try {
    const snap = await db.collection('users').orderBy('fullName').get();
    const users = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user/:uid — read user doc
app.get('/api/user/:uid', async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    const { fullName, roles, unitId } = doc.data();
    res.json({ fullName, roles, unitId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/units — list all units
app.get('/api/units', async (req, res) => {
  try {
    const snap = await db.collection('units').orderBy('name').get();
    const units = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(units);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/:uid/role — set roles (accepts { roles: [...] })
app.post('/api/user/:uid/role', async (req, res) => {
  try {
    const { roles } = req.body;
    if (!Array.isArray(roles) || roles.length === 0) return res.status(400).json({ error: 'roles array is required' });
    await db.collection('users').doc(req.params.uid).update({ roles });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/:uid/unit — set unit
app.post('/api/user/:uid/unit', async (req, res) => {
  try {
    const { unitId } = req.body;
    if (!unitId) return res.status(400).json({ error: 'unitId is required' });
    await db.collection('users').doc(req.params.uid).update({ unitId });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3999;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Admin server running on http://0.0.0.0:${PORT}`);
});
