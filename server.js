const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// Database Connection Initiate
connectDB();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// --- DATABASE SCHEMAS (MODELS) ---

// 1. User Schema
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    ffUid: { type: String, required: true }, // Free Fire UID
    balance: { type: Number, default: 0 }    // Wallet System
});
const User = mongoose.model('User', UserSchema);

// 2. Tournament/Match Schema
const MatchSchema = new mongoose.Schema({
    title: { type: String, required: true },       // Match Name
    map: { type: String, default: 'Bermuda' },
    dateTime: { type: String, required: true },
    entryFee: { type: Number, required: true },
    prizePool: { type: Number, required: true },
    slotsAvailable: { type: Number, default: 48 },
    registeredPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});
const Match = mongoose.model('Match', MatchSchema);


// --- SYSTEM API ROUTES ---

// Welcome Status
app.get('/', (req, res) => {
    res.json({ status: "Active", project: "Nexus Arena v1", message: "Welcome Gaurav! System Central Control is Live." });
});

// User Authentication (Register & Login)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, ffUid } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = new User({ username, password: hashedPassword, ffUid });
        await newUser.save();
        
        res.status(201).json({ success: true, message: "Account created successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: "User not found!" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials!" });

        // FIX: Yahan pehle galat token character tha, ab ekdam sahi hai
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: { username, ffUid: user.ffUid, balance: user.balance } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Match Management
app.post('/api/admin/create-match', async (req, res) => {
    try {
        const { title, map, dateTime, entryFee, prizePool, slotsAvailable } = req.body;
        const newMatch = new Match({ title, map, dateTime, entryFee, prizePool, slotsAvailable });
        await newMatch.save();
        res.status(201).json({ success: true, message: "Match Scheduled Successfully!", match: newMatch });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// View All Live Matches
app.get('/api/matches', async (req, res) => {
    try {
        const matches = await Match.find().populate('registeredPlayers', 'username ffUid');
        res.json({ success: true, count: matches.length, matches });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Player Match Registration API
app.post('/api/matches/register', async (req, res) => {
    try {
        const { userId, matchId } = req.body;
        
        const match = await Match.findById(matchId);
        const user = await User.findById(userId);

        if (!match || !user) return res.status(404).json({ message: "Match or User not found!" });
        if (match.slotsAvailable <= 0) return res.status(400).json({ message: "Match is already full!" });
        if (match.registeredPlayers.includes(userId)) return res.status(400).json({ message: "Already registered for this match!" });

        // Update slots and list
        match.registeredPlayers.push(userId);
        match.slotsAvailable -= 1;
        await match.save();

        res.json({ success: true, message: "Successfully registered for the Free Fire Tournament!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Port Management for Render Cloud
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log("🚀 Control Center Active! App is fully operational.");
});
