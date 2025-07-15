document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin page loaded');
    
    // Get DOM elements
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const adminLoginForm = document.getElementById('adminLoginForm');
    const loginError = document.getElementById('loginError');
    const logoutButton = document.getElementById('logoutButton');
    const playersToRankDiv = document.getElementById('playersToRank');
    const saveRankingsButton = document.getElementById('saveRankings');
    const saveTournamentSettingsButton = document.getElementById('saveTournamentSettings');
    const playerSelectDropdown = document.getElementById('playerSelect');
    const selectedPlayerDetailsDiv = document.getElementById('selectedPlayerDetails');
    const sendLinkButton = document.getElementById('sendLinkButton');
    const registeredPlayersAdminDiv = document.getElementById('registeredPlayersAdmin');

    // Online Tournament Setup Elements
    const onlineTournamentSetupDiv = document.getElementById('online-tournament-setup');

    // API base URL (will be dynamically set)
    let API_BASE = 'http://localhost:3000/api'; // Default, will be updated

    // Function to get the correct API base URL
    async function getApiBase() {
        try {
            // Try to get port from localStorage first
            const savedPort = localStorage.getItem('apiPort');
            if (savedPort) {
                API_BASE = `http://localhost:${savedPort}/api`;
                return API_BASE;
            }
            // If no saved port, try common ports
            const commonPorts = [3000, 3001, 3002, 3003, 3004, 3005];
            for (const port of commonPorts) {
                try {
                    const response = await fetch(`http://localhost:${port}/api/port`, {
                        method: 'GET',
                        timeout: 1000
                    });
                    if (response.ok) {
                        const data = await response.json();
                        API_BASE = `http://localhost:${data.port}/api`;
                        localStorage.setItem('apiPort', data.port);
                        return API_BASE;
                    }
                } catch (e) {
                    // Continue to next port
                }
            }
            // Fallback to default
            return API_BASE;
        } catch (error) {
            console.error('Error getting API base:', error);
            return API_BASE;
        }
    }

    // On DOMContentLoaded, update API_BASE dynamically
    getApiBase().then((base) => {
        API_BASE = base;
    console.log('API Base URL:', API_BASE);
        // Optionally, re-run any initial API calls here if needed
    });

    // Check if admin is already logged in
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn') === 'true';
    console.log('Is logged in:', isLoggedIn);

    if (isLoggedIn) {
        showDashboard();
    } else {
        showLogin();
    }

    // Test connection on page load
    setTimeout(() => {
        testConnection();
    }, 1000);

    // Login form handler
    if (adminLoginForm) {
        console.log('Login form found, adding event listener');
        adminLoginForm.addEventListener('submit', handleLogin);
    } else {
        console.error('Login form not found!');
    }

    // Logout button handler
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    // Tournament settings handler
    if (saveTournamentSettingsButton) {
        saveTournamentSettingsButton.addEventListener('click', handleTournamentSettings);
    }

    // Player selection handler
    if (playerSelectDropdown) {
        playerSelectDropdown.addEventListener('change', handlePlayerSelection);
    }

    // Send link button handler
    if (sendLinkButton) {
        sendLinkButton.addEventListener('click', handleSendLink);
    }

    // Tournament type radio buttons
    const tournamentTypeRadios = document.querySelectorAll('input[name="tournamentType"]');
    tournamentTypeRadios.forEach(radio => {
        radio.addEventListener('change', handleTournamentTypeChange);
    });

    // Global function for testing connection
    window.testConnection = async function() {
        console.log('Testing connection...');
        const debugInfo = document.getElementById('debugInfo');
        
        try {
            const response = await fetch(`${API_BASE}/players`);
            debugInfo.innerHTML = `✅ API Connected (Status: ${response.status})<br>Server: ${API_BASE}`;
        } catch (error) {
            debugInfo.innerHTML = `❌ Connection Failed: ${error.message}<br>Server: ${API_BASE}`;
        }
    };

    // Functions
    async function handleLogin(event) {
        event.preventDefault();
        console.log('Login attempt started');

        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;

        console.log('Username:', username);
        console.log('Password length:', password.length);

        if (!username || !password) {
            showError('Please enter both username and password');
            return;
        }

        try {
            console.log('Sending login request to:', `${API_BASE}/admin/login`);
            
            const response = await fetch(`${API_BASE}/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok && data.success) {
                console.log('Login successful');
                sessionStorage.setItem('adminLoggedIn', 'true');
                sessionStorage.setItem('adminUsername', username);
                showDashboard();
                clearError();
            } else {
                console.log('Login failed:', data.error);
                showError(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            showError('Network error. Please check your connection and try again.');
        }
    }

    function handleLogout() {
        console.log('Logout clicked');
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminUsername');
        showLogin();
    }

    async function handleTournamentSettings() {
        console.log('Saving tournament settings');
        
        let selectedTournamentType = null;
        const tournamentTypeRadios = document.querySelectorAll('input[name="tournamentType"]');
        
        tournamentTypeRadios.forEach(radio => {
            if (radio.checked) {
                selectedTournamentType = radio.value;
            }
        });
        
        if (!selectedTournamentType) {
            alert('Please select a tournament type.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/admin/tournament-settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tournamentType: selectedTournamentType })
            });

            const data = await response.json();

            if (response.ok) {
                alert(`Tournament type set to ${selectedTournamentType}!`);
            } else {
                alert('Error saving tournament settings: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving tournament settings:', error);
            alert('Network error. Please try again.');
        }
    }

    function handleTournamentTypeChange(event) {
        const onlineTournamentSetupDiv = document.getElementById('online-tournament-setup');
        if (event.target.value === 'online') {
            onlineTournamentSetupDiv.classList.remove('hidden');
        } else {
            onlineTournamentSetupDiv.classList.add('hidden');
        }
    }

    async function handlePlayerSelection(event) {
        const selectedEmail = event.target.value;
        if (selectedEmail) {
            await displaySelectedPlayerDetails(selectedEmail);
        } else {
            selectedPlayerDetailsDiv.innerHTML = '';
        }
    }

    function handleSendLink() {
        const selectedEmail = playerSelectDropdown.value;
        if (selectedEmail) {
            alert(`Simulating sending a chess game link to ${selectedEmail}.\n\nNote: This functionality requires a backend server to generate and send actual links, and manage the online game.`);
        } else {
            alert('Please select a player first.');
        }
    }

    function showLogin() {
        console.log('Showing login form');
        loginSection.classList.remove('hidden');
        dashboardSection.classList.add('hidden');
        clearError();
        if (adminLoginForm) {
            adminLoginForm.reset();
        }
    }

    function showDashboard() {
        console.log('Showing dashboard');
        loginSection.classList.add('hidden');
        dashboardSection.classList.remove('hidden');
        loadRegisteredPlayersForAdmin();
        loadRegisteredPlayersForDropdown();
        loadTournamentSettings();
    }

    function showError(message) {
        if (loginError) {
            loginError.textContent = message;
            loginError.style.display = 'block';
        }
        console.error('Error:', message);
    }

    function clearError() {
        if (loginError) {
            loginError.textContent = '';
            loginError.style.display = 'none';
        }
    }

    async function loadRegisteredPlayersForAdmin() {
        console.log('Loading registered players for admin');
        
        try {
            const response = await fetch(`${API_BASE}/admin/players`);
            console.log('Players response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const players = await response.json();
            console.log('Players loaded:', players.length);

            registeredPlayersAdminDiv.innerHTML = '';

            if (players.length === 0) {
                registeredPlayersAdminDiv.innerHTML = '<p>No players registered yet.</p>';
            } else {
                players.forEach((player, idx) => {
                    const playerDiv = document.createElement('div');
                    playerDiv.classList.add('admin-player-entry');
                    playerDiv.innerHTML = `
                        <span>${idx + 1}. ${player.fullName} (${player.email})</span>
                        <button class="remove-admin-player-btn" data-email="${player.email}">Remove</button>
                    `;
                    registeredPlayersAdminDiv.appendChild(playerDiv);
                });

                // Add event listeners for remove buttons
                registeredPlayersAdminDiv.querySelectorAll('.remove-admin-player-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const email = btn.getAttribute('data-email');
                        removeRegisteredPlayer(email);
                    });
                });
            }
        } catch (error) {
            console.error('Error loading players:', error);
            registeredPlayersAdminDiv.innerHTML = '<p>Error loading players. Please try again.</p>';
        }
    }

    async function removeRegisteredPlayer(email) {
        console.log('Removing player:', email);
        
        if (!confirm(`Are you sure you want to remove ${email}?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/admin/players/${encodeURIComponent(email)}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (response.ok) {
                console.log('Player removed successfully');
                loadRegisteredPlayersForAdmin();
                loadRegisteredPlayersForDropdown();
            } else {
                alert('Error deleting player: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting player:', error);
            alert('Network error. Please try again.');
        }
    }

    async function loadRegisteredPlayersForDropdown() {
        console.log('Loading players for dropdown');
        
        try {
            const response = await fetch(`${API_BASE}/admin/players`);
            const players = await response.json();

            playerSelectDropdown.innerHTML = '<option value="">--Select Player--</option>';

            players.forEach(player => {
                const option = document.createElement('option');
                option.value = player.email;
                option.textContent = player.fullName;
                playerSelectDropdown.appendChild(option);
            });

            selectedPlayerDetailsDiv.innerHTML = '';
        } catch (error) {
            console.error('Error loading players for dropdown:', error);
        }
    }

    async function displaySelectedPlayerDetails(email) {
        console.log('Displaying details for:', email);
        
        try {
            const response = await fetch(`${API_BASE}/admin/players`);
            const players = await response.json();
            const selectedPlayer = players.find(player => player.email === email);

            selectedPlayerDetailsDiv.innerHTML = '';

            if (selectedPlayer) {
                selectedPlayerDetailsDiv.innerHTML = `
                    <p><strong>Email:</strong> ${selectedPlayer.email}</p>
                    <p><strong>Phone:</strong> ${selectedPlayer.phoneNumber}</p>
                    <p><strong>College:</strong> ${selectedPlayer.collegeName}</p>
                    <p><strong>Branch:</strong> ${selectedPlayer.branchName}</p>
                    ${selectedPlayer.chessRating ? `<p><strong>Chess Rating:</strong> ${selectedPlayer.chessRating}</p>` : ''}
                `;
            }
        } catch (error) {
            console.error('Error loading player details:', error);
            selectedPlayerDetailsDiv.innerHTML = '<p>Error loading player details.</p>';
        }
    }

    async function loadTournamentSettings() {
        console.log('Loading tournament settings');
        
        try {
            const response = await fetch(`${API_BASE}/admin/tournament-settings`);
            const settings = await response.json();

            if (settings.tournament_type) {
                const tournamentTypeRadios = document.querySelectorAll('input[name="tournamentType"]');
                tournamentTypeRadios.forEach(radio => {
                    if (radio.value === settings.tournament_type) {
                        radio.checked = true;
                    }
                });
                
                const onlineTournamentSetupDiv = document.getElementById('online-tournament-setup');
                if (settings.tournament_type === 'online') {
                    onlineTournamentSetupDiv.classList.remove('hidden');
                } else {
                    onlineTournamentSetupDiv.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('Error loading tournament settings:', error);
        }
    }
}); 