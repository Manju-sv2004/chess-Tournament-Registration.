// setup-admin.js - Script to create initial admin account
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const db = new sqlite3.Database('./chess_tournament.db', (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database.');
});

// Create tables
db.serialize(() => {
    // Create admins table
    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`, (err) => {
        if (err) {
            console.error('Error creating admins table:', err.message);
        } else {
            console.log('Admins table created/verified.');
        }
    });

    // Create tournament_settings table
    db.run(`CREATE TABLE IF NOT EXISTS tournament_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_type TEXT
    )`, (err) => {
        if (err) {
            console.error('Error creating tournament_settings table:', err.message);
        } else {
            console.log('Tournament settings table created/verified.');
        }
    });

    // Insert default admin account
    db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`, 
        ['admin', 'admin123'], 
        function(err) {
            if (err) {
                console.error('Error creating admin account:', err.message);
            } else {
                if (this.changes > 0) {
                    console.log('Default admin account created:');
                    console.log('Username: admin');
                    console.log('Password: admin123');
                } else {
                    console.log('Admin account already exists.');
                }
            }
            
            // Close database and exit
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message);
                } else {
                    console.log('Database connection closed.');
                }
                process.exit(0);
            });
        }
    );
}); 