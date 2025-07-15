# Chess Tournament Management System

A web-based chess tournament management system with admin dashboard and player registration.

## Features

- **Player Registration**: Players can register with their details including chess rating
- **Admin Dashboard**: Secure admin panel to manage players and tournament settings
- **Database Storage**: SQLite database for persistent data storage
- **Real-time Statistics**: View player statistics and rankings
- **Tournament Management**: Configure online/offline tournament settings

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   The server will run on `http://localhost:3001`

3. **Create admin account:**
   ```bash
   npm run setup-admin
   ```
   This creates the default admin account:
   - Username: 
   - Password: 

## Usage

### Accessing the Application

1. **Main Application**: Visit `http://localhost:3001`
2. **Admin Panel**: Visit `http://localhost:3001/admin.html`

### Admin Features

- **Login**: Use the credentials created during setup
- **Player Management**: View, add, and remove registered players
- **Tournament Settings**: Configure tournament type (online/offline)
- **Statistics**: View player statistics and rankings

### Player Registration

Players can register through the main page, providing:
- Full Name
- Email (unique)
- Phone Number
- UUCM Number
- Date of Birth
- College Name
- Branch Name
- Chess Rating (optional)

## API Endpoints

### Player Management
- `GET /api/players` - Get all players
- `POST /api/players` - Register new player
- `DELETE /api/admin/players/:email` - Delete player (admin only)

### Admin Authentication
- `POST /api/admin/login` - Admin login
- `POST /api/admin/create` - Create admin account

### Tournament Management
- `GET /api/admin/tournament-settings` - Get tournament settings
- `POST /api/admin/tournament-settings` - Save tournament settings

### Rankings
- `GET /api/rankings` - Get all rankings
- `POST /api/rankings` - Update player ranking

## Database Schema

The system uses SQLite with the following tables:
- `players` - Player registration data
- `admins` - Admin authentication
- `matches` - Match results
- `rankings` - Player rankings
- `tournament_settings` - Tournament configuration

## Security Notes

- Admin passwords are stored in plain text (consider hashing for production)
- CORS is enabled for development (restrict in production)
- Session management uses browser sessionStorage

## Development

To modify the system:
1. Edit the frontend files in the `mm/` directory
2. Update the backend API in `server.js`
3. Restart the server to apply changes

## Troubleshooting

- **Port already in use**: Change the port in `server.js` and update frontend API URLs
- **Database errors**: Delete `chess_tournament.db` and restart the server
- **Admin login issues**: Run `npm run setup-admin` to recreate the admin account 
