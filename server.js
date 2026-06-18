```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

connectDB();

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_secret_key';

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    ffUid: { type: String, required: true },
    balance: { type: Number, default: 0 }
}));

const Match = mongoose.model('Match', new mongoose.Schema({
    title: { type: String, required: true },
    map: { type: String, default: 'Bermuda' },
    dateTime: { type: String, required: true },
    entryFee: { type: Number, required: true },
    prizePool: { type: Number, required: true },
    slotsAvailable: { type: Number, default: 48 },
    registeredPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}));

app.get('/', (req, res) => {
    res.json({ status: "Active", project: "Nexus Arena", message: "Central Control is Live, Gaurav!" });
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, ffUid } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword, ffUid });
        await newUser.save();
        res.status(201).json({ success: true, message: "Account created!" });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: "Invalid credentials!" });
        }
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: { username, ffUid: user.ffUid, balance: user.balance } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/create-match', async (req, res) => {
    try {
        const newMatch = new Match(req.body);
        await newMatch.save();
        res.status(201).json({ success: true, match: newMatch });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/matches', async (req, res) => {
    try {
        const matches = await Match.find().populate('registeredPlayers', 'username ffUid');
        res.json({ success: true, matches });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/matches/register', async (req, res) => {
    try {
        const { userId, matchId } = req.body;
        const match = await Match.findById(matchId);
        if (!match || match.slotsAvailable <= 0) return res.status(400).json({ message: "Unavailable!" });
        match.registeredPlayers.push(userId);
        match.slotsAvailable -= 1;
        await mat
        res.json({ success: true, message: "Registered!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => { console.log(`🚀 Operational on port ${PORT}`); });
