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

// Serve debug-personnel-google.html
app.get('/debug-personnel', (req, res) => {
  res.sendFile(path.join(__dirname, 'debug-personnel-google.html'));
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

// GET /api/user/:uid — read user doc + personnel record
app.get('/api/user/:uid', async (req, res) => {
  try {
    const doc = await db.collection('users').doc(req.params.uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    const { fullName, roles, unitId } = doc.data();

    // Check if personnel record exists
    const personnelSnap = await db.collection('personnel').where('userId', '==', req.params.uid).get();
    const hasPersonnel = !personnelSnap.empty;
    let personnelData = null;
    if (hasPersonnel) {
      const personnelDoc = personnelSnap.docs[0];
      personnelData = {
        id: personnelDoc.id,
        firstName: personnelDoc.data().firstName,
        lastName: personnelDoc.data().lastName,
        serviceNumber: personnelDoc.data().serviceNumber,
      };
    }

    res.json({ fullName, roles, unitId, hasPersonnel, personnel: personnelData });
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

// GET /api/personnel/:personnelId — get full personnel record (debug)
app.get('/api/personnel/:personnelId', async (req, res) => {
  try {
    const doc = await db.collection('personnel').doc(req.params.personnelId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Personnel not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/debug/personnel-by-uid/:uid — debug personnel query
app.get('/api/debug/personnel-by-uid/:uid', async (req, res) => {
  try {
    const snap = await db.collection('personnel').where('userId', '==', req.params.uid).get();
    if (snap.empty) {
      return res.json({ found: false, message: 'No personnel record found for this userId' });
    }
    const doc = snap.docs[0];
    const data = doc.data();
    res.json({
      found: true,
      personnel: {
        id: doc.id,
        userId: data.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        serviceNumber: data.serviceNumber,
        unitId: data.unitId,
        battalionId: data.battalionId,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/:uid/role — set roles (accepts { roles: [...] })
app.post('/api/user/:uid/role', async (req, res) => {
  try {
    const { roles } = req.body;
    if (!Array.isArray(roles) || roles.length === 0) return res.status(400).json({ error: 'roles array is required' });

    // Update user document
    await db.collection('users').doc(req.params.uid).update({ roles });

    // No need to update personnel record for role changes
    // Roles are stored in users collection only

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

    // Update user document
    await db.collection('users').doc(req.params.uid).update({ unitId });

    // Update personnel record if it exists
    const personnelSnap = await db.collection('personnel').where('userId', '==', req.params.uid).get();
    if (!personnelSnap.empty) {
      const personnelDoc = personnelSnap.docs[0];

      // Get battalion ID from unit
      const unitDoc = await db.collection('units').doc(unitId).get();
      const battalionId = unitDoc.exists ? unitDoc.data().battalionId : null;

      await personnelDoc.ref.update({
        unitId,
        ...(battalionId ? { battalionId } : {}),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/:uid/personnel — create or update personnel record
app.post('/api/user/:uid/personnel', async (req, res) => {
  try {
    const { firstName, lastName, serviceNumber } = req.body;

    // Get user data
    const userDoc = await db.collection('users').doc(req.params.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });

    const userData = userDoc.data();
    const unitId = userData.unitId || null;

    // Get battalion ID from unit
    let battalionId = null;
    if (unitId) {
      const unitDoc = await db.collection('units').doc(unitId).get();
      if (unitDoc.exists) {
        battalionId = unitDoc.data().battalionId || unitId;
      }
    }

    // Check if personnel record exists
    const personnelSnap = await db.collection('personnel').where('userId', '==', req.params.uid).get();

    if (personnelSnap.empty) {
      // Create new personnel record
      const personnelData = {
        userId: req.params.uid,
        firstName: firstName || '',
        lastName: lastName || '',
        email: userData.email || null,
        serviceNumber: serviceNumber || '',
        unitId,
        rank: 'טוראי', // Default rank
        locationStatus: 'on_duty',
        readinessStatus: 'ready',
        isSignatureApproved: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(battalionId ? { battalionId } : {}),
      };
      await db.collection('personnel').add(personnelData);
      res.json({ ok: true, created: true });
    } else {
      // Update existing personnel record
      const personnelDoc = personnelSnap.docs[0];
      const updateData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (serviceNumber) updateData.serviceNumber = serviceNumber;
      if (unitId) updateData.unitId = unitId;
      if (battalionId) updateData.battalionId = battalionId;

      await personnelDoc.ref.update(updateData);
      res.json({ ok: true, updated: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3999;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Admin server running on http://0.0.0.0:${PORT}`);
});
