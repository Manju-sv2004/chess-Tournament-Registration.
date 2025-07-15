// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'mm')));

// SQLite DB setup
const db = new sqlite3.Database('./chess_tournament.db', (err) => {
    if (err) return console.error('DB connection error:', err.message);
    console.log('Connected to SQLite database.');
});

// Create tables if not exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT,
        email TEXT UNIQUE,
        phoneNumber TEXT,
        uucmNumber TEXT,
        dateOfBirth TEXT,
        collegeName TEXT,
        branchName TEXT,
        chessRating INTEGER,
        matchesPlayed INTEGER DEFAULT 0,
        winLossPoints INTEGER DEFAULT 0
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player1 TEXT,
        player2 TEXT,
        winner TEXT,
        loser TEXT,
        status TEXT,
        duration INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS rankings (
        email TEXT PRIMARY KEY,
        ranking INTEGER
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS tournament_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_type TEXT
    )`);
});

// --- API Endpoints ---

// Get all players
app.get('/api/players', (req, res) => {
    db.all('SELECT * FROM players', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Register a new player
app.post('/api/players', (req, res) => {
    const p = req.body;
    db.run(`INSERT INTO players (fullName, email, phoneNumber, uucmNumber, dateOfBirth, collegeName, branchName, chessRating) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.fullName, p.email, p.phoneNumber, p.uucmNumber, p.dateOfBirth, p.collegeName, p.branchName, p.chessRating],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID });
        }
    );
});

// Get all matches
app.get('/api/matches', (req, res) => {
    db.all('SELECT * FROM matches', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add a match
app.post('/api/matches', (req, res) => {
    const m = req.body;
    db.run(`INSERT INTO matches (player1, player2, winner, loser, status) VALUES (?, ?, ?, ?, ?)`,
        [m.player1, m.player2, m.winner, m.loser, m.status || 0],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            // After inserting the match, update player stats
            // Increment matchesPlayed for both players
            db.run(`UPDATE players SET matchesPlayed = matchesPlayed + 1 WHERE email = ?`, [m.player1]);
            db.run(`UPDATE players SET matchesPlayed = matchesPlayed + 1 WHERE email = ?`, [m.player2]);
            // Increment winLossPoints for winner
            if (m.winner) {
                db.run(`UPDATE players SET winLossPoints = winLossPoints + 1 WHERE email = ?`, [m.winner]);
            }
            // Optionally, you can decrement winLossPoints for loser if you want
            // if (m.loser) {
            //     db.run(`UPDATE players SET winLossPoints = winLossPoints - 1 WHERE email = ?`, [m.loser]);
            // }
            res.json({ id: this.lastID });
        }
    );
    console.log(m.player1, m.player2, m.winner, m.loser, m.status);
});

// Get match history (with player names)
app.get('/api/matches/history', (req, res) => {
    db.all(`
        SELECT m.*, 
               p1.fullName as player1Name, 
               p2.fullName as player2Name,
               w.fullName as winnerName,
               l.fullName as loserName
        FROM matches m
        LEFT JOIN players p1 ON m.player1 = p1.email
        LEFT JOIN players p2 ON m.player2 = p2.email
        LEFT JOIN players w ON m.winner = w.email
        LEFT JOIN players l ON m.loser = l.email
        ORDER BY m.id DESC
        LIMIT 50
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Get rankings
app.get('/api/rankings', (req, res) => {
    db.all('SELECT * FROM rankings', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update ranking for a player
app.post('/api/rankings', (req, res) => {
    const { email, ranking } = req.body;
    db.run(`INSERT INTO rankings (email, ranking) VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET ranking=excluded.ranking`,
        [email, ranking],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// --- Admin Authentication Endpoints ---

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    db.get('SELECT * FROM admins WHERE username = ? AND password = ?', [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (row) {
            res.json({ 
                success: true, 
                message: 'Login successful',
                admin: { id: row.id, username: row.username }
            });
        } else {
            res.status(401).json({ error: 'Invalid username or password' });
        }
    });
});

// Create admin account (for initial setup)
app.post('/api/admin/create', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    db.run('INSERT INTO admins (username, password) VALUES (?, ?)', [username, password], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Admin username already exists' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, id: this.lastID });
    });
});

// --- Admin Dashboard Endpoints ---

// Get all registered players for admin
app.get('/api/admin/players', (req, res) => {
    db.all('SELECT * FROM players ORDER BY fullName', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Delete a player
app.delete('/api/admin/players/:email', (req, res) => {
    const { email } = req.params;
    
    db.run('DELETE FROM players WHERE email = ?', [email], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        
        if (this.changes > 0) {
            res.json({ success: true, message: 'Player deleted successfully' });
        } else {
            res.status(404).json({ error: 'Player not found' });
        }
    });
});

// Save tournament settings
app.post('/api/admin/tournament-settings', (req, res) => {
    const { tournamentType } = req.body;
    
    if (!tournamentType) {
        return res.status(400).json({ error: 'Tournament type is required' });
    }
    
    // Clear existing settings and insert new one
    db.run('DELETE FROM tournament_settings', [], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.run('INSERT INTO tournament_settings (tournament_type) VALUES (?)', [tournamentType], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        });
    });
});

// Get tournament settings
app.get('/api/admin/tournament-settings', (req, res) => {
    db.get('SELECT * FROM tournament_settings ORDER BY created_at DESC LIMIT 1', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { tournament_type: null });
    });
});

// Get dashboard statistics
app.get('/api/admin/stats', (req, res) => {
    db.get('SELECT COUNT(*) as totalPlayers FROM players', [], (err, playerCount) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get('SELECT COUNT(*) as totalMatches FROM matches', [], (err, matchCount) => {
            if (err) return res.status(500).json({ error: err.message });
            
            res.json({
                totalPlayers: playerCount.totalPlayers,
                totalMatches: matchCount.totalMatches
            });
        });
    });
});

// --- Chess Tournament Endpoints ---

// Update player statistics
app.put('/api/players/:email/stats', (req, res) => {
    const { email } = req.params;
    const { matches, wins, losses, points } = req.body;
    
    const updates = [];
    const values = [];
    
    if (matches !== undefined) {
        updates.push('matchesPlayed = ?');
        values.push(matches);
    }
    if (wins !== undefined) {
        updates.push('winLossPoints = ?');
        values.push(wins);
    }
    if (losses !== undefined) {
        updates.push('losses = ?');
        values.push(losses);
    }
    if (points !== undefined) {
        updates.push('points = ?');
        values.push(points);
    }
    
    if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid updates provided' });
    }
    
    values.push(email);
    
    const query = `UPDATE players SET ${updates.join(', ')} WHERE email = ?`;
    
    db.run(query, values, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        
        if (this.changes > 0) {
            res.json({ success: true, message: 'Player statistics updated' });
        } else {
            res.status(404).json({ error: 'Player not found' });
        }
    });
});

// Get tournament statistics
app.get('/api/tournament/stats', (req, res) => {
    // Get total matches
    db.get('SELECT COUNT(*) as totalMatches FROM matches', [], (err, matchCount) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Get completed matches
        db.get('SELECT COUNT(*) as completedMatches FROM matches WHERE status = "completed"', [], (err, completedCount) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Get average match duration
            db.get('SELECT AVG(duration) as avgDuration FROM matches WHERE duration > 0', [], (err, avgDuration) => {
                if (err) return res.status(500).json({ error: err.message });
                
                // Get most active college
                db.get(`
                    SELECT collegeName, COUNT(*) as playerCount 
                    FROM players 
                    GROUP BY collegeName 
                    ORDER BY playerCount DESC 
                    LIMIT 1
                `, [], (err, topCollege) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    res.json({
                        totalMatches: matchCount.totalMatches,
                        completedMatches: completedCount.completedMatches,
                        avgMatchDuration: Math.round(avgDuration.avgDuration || 0),
                        mostActiveCollege: topCollege ? topCollege.collegeName : 'N/A'
                    });
                });
            });
        });
    });
});

// Update home page statistics
app.get('/api/home/stats', (req, res) => {
    // Get total players
    db.get('SELECT COUNT(*) as totalPlayers FROM players', [], (err, playerCount) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Get average rating
        db.get('SELECT AVG(chessRating) as avgRating FROM players WHERE chessRating > 0', [], (err, avgRating) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Get top college
            db.get(`
                SELECT collegeName, COUNT(*) as playerCount 
                FROM players 
                GROUP BY collegeName 
                ORDER BY playerCount DESC 
                LIMIT 1
            `, [], (err, topCollege) => {
                if (err) return res.status(500).json({ error: err.message });
                
                // Get highest rated player
                db.get(`
                    SELECT fullName, chessRating 
                    FROM players 
                    WHERE chessRating > 0 
                    ORDER BY chessRating DESC 
                    LIMIT 1
                `, [], (err, topPlayer) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    res.json({
                        totalPlayers: playerCount.totalPlayers,
                        averageRating: Math.round(avgRating.avgRating || 0),
                        topCollege: topCollege ? topCollege.collegeName : 'N/A',
                        highestRatedPlayer: topPlayer ? `${topPlayer.fullName} (${topPlayer.chessRating})` : 'N/A'
                    });
                });
            });
        });
    });
});

// Get current server port
app.get('/api/port', (req, res) => {
    res.json({ port: PORT });
});

// --- Fallback: serve index.html for SPA routing ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'mm', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API Base URL: http://localhost:${PORT}/api`);
}); 