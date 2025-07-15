const net = require('net');
const { spawn } = require('child_process');

// Function to check if a port is available
function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
            server.once('close', () => {
                resolve(true);
            });
            server.close();
        });
        server.on('error', () => {
            resolve(false);
        });
    });
}

// Function to find an available port
async function findAvailablePort(startPort = 3000) {
    for (let port = startPort; port <= 3010; port++) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    throw new Error('No available ports found');
}

// Main function
async function startServer() {
    try {
        const port = await findAvailablePort();
        console.log(`Found available port: ${port}`);
        
        // Set environment variable for the port
        process.env.PORT = port;
        
        // Start the server
        const server = spawn('node', ['server.js'], {
            stdio: 'inherit',
            env: { ...process.env, PORT: port }
        });
        
        server.on('error', (error) => {
            console.error('Failed to start server:', error);
        });
        
        console.log(`Server starting on port ${port}...`);
        console.log(`Access your application at: http://localhost:${port}`);
        
    } catch (error) {
        console.error('Error starting server:', error);
    }
}

startServer(); 