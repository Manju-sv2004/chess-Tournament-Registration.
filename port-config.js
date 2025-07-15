// This file will be updated by the server with the actual port
let currentPort = 3000; // Default fallback

// Function to update port
function updatePort(port) {
    currentPort = port;
    // Also update localStorage for frontend access
    if (typeof window !== 'undefined') {
        localStorage.setItem('apiPort', port);
    }
}

// Function to get current port
function getPort() {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('apiPort') || currentPort;
    }
    return currentPort;
}

module.exports = { updatePort, getPort, currentPort }; 