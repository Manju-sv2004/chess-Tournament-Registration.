document.addEventListener('DOMContentLoaded', () => {
    const playerTableBody = document.getElementById('playerTableBody');
    const totalPlayersSpan = document.getElementById('totalPlayers');
    const averageRatingSpan = document.getElementById('averageRating');
    const topCollegeSpan = document.getElementById('topCollege');
    const highestRatedPlayerSpan = document.getElementById('highestRatedPlayer');

    // API base URL - will be dynamically set
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

    let registeredPlayers = [];
    let playerRankings = {};

    // Load players and rankings from backend
    async function loadData() {
        try {
            // Initialize API base URL
            await getApiBase();
            console.log('Using API Base:', API_BASE);
            
            // Load players
            const playersResponse = await fetch(`${API_BASE}/players`);
            registeredPlayers = await playersResponse.json();

            // Load rankings
            const rankingsResponse = await fetch(`${API_BASE}/rankings`);
            const rankings = await rankingsResponse.json();
            
            // Convert rankings array to object
            playerRankings = {};
            rankings.forEach(rank => {
                playerRankings[rank.email] = rank.ranking;
            });

            // Update the display
            updateDisplay();
        } catch (error) {
            console.error('Error loading data:', error);
            playerTableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Error loading data. Please try again.</td></tr>';
        }
    }

    function updateStatistics(players, rankings) {
        const totalPlayers = players.length;
        totalPlayersSpan.textContent = totalPlayers;

        if (totalPlayers === 0) {
            averageRatingSpan.textContent = 'N/A';
            topCollegeSpan.textContent = 'No colleges registered';
            highestRatedPlayerSpan.textContent = 'N/A';
            return;
        }

        // Calculate Average Rating
        const ratedPlayers = players.filter(player => Number(player.chessRating) > 0);
        const totalRating = ratedPlayers.reduce((sum, player) => sum + Number(player.chessRating), 0);
        const averageRating = ratedPlayers.length > 0 ? (totalRating / ratedPlayers.length).toFixed(2) : 'N/A';
        averageRatingSpan.textContent = averageRating;

        // Find Top College (most registered players)
        const collegeCounts = players.reduce((counts, player) => {
            counts[player.collegeName] = (counts[player.collegeName] || 0) + 1;
            return counts;
        }, {});
        let topCollege = 'N/A';
        let maxCount = 0;
        for (const college in collegeCounts) {
            if (collegeCounts[college] > maxCount) {
                maxCount = collegeCounts[college];
                topCollege = college;
            } else if (collegeCounts[college] === maxCount && topCollege !== 'N/A') {
                 topCollege += `, ${college}`; // Handle ties
            }
        }
        if (topCollege === 'N/A' && totalPlayers > 0) topCollege = players[0].collegeName;
        topCollegeSpan.textContent = topCollege;

        // Find Highest Rated Player
        let highestRatedPlayer = 'N/A';
        let highestRating = -1;
        ratedPlayers.forEach(player => {
            if (player.chessRating > highestRating) {
                highestRating = player.chessRating;
                highestRatedPlayer = `${player.fullName} (${player.chessRating})`;
            } else if (player.chessRating === highestRating && highestRatedPlayer !== 'N/A') {
                 highestRatedPlayer += `, ${player.fullName} (${player.chessRating})`;
            }
        });
        highestRatedPlayerSpan.textContent = highestRatedPlayer;
    }

    function updateDisplay() {
        if (registeredPlayers.length === 0) {
            playerTableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">No players registered yet.</td></tr>';
            updateStatistics(registeredPlayers, playerRankings);
        } else {
            // Create table rows for each player
            const playerRowsHTML = registeredPlayers.map(player => {
                // Get the ranking for the current player using their email
                const ranking = playerRankings[player.email] || '-'; // Use '-' if no ranking is found

                return `
                    <tr>
                        <td>${player.fullName}</td>
                        <td>${player.email}</td>
                        <td>${player.phoneNumber}</td>
                        <td>${player.uucmNumber}</td>
                        <td>${player.dateOfBirth}</td>
                        <td>${player.collegeName}</td>
                        <td>${player.branchName}</td>
                        <td>${player.chessRating || '-'}</td>
                       
                    </tr>
                `;
            }).join('');

            playerTableBody.innerHTML = playerRowsHTML;
            updateStatistics(registeredPlayers, playerRankings);
            populateFilters();
        }
    }

    // Load data when page loads
    loadData();

    // --- Match History from backend ---
    async function loadMatchHistory() { 
    try {
        const response = await fetch(`${API_BASE}/matches/history`);
        const matches = await response.json();
        const playerMap = {};
        console.log(matches);

        registeredPlayers.forEach(p => {
            playerMap[p.email] = p.fullName;
        });

        // Filter out matches with even match.id
        const filteredMatches = matches.filter(match => match.id % 2 !== 0);

        const rows = filteredMatches.map(match => {
            const player1 = playerMap[match.player1] || match.player1 || 'Unknown';
            const player2 = playerMap[match.player2] || match.player2 || 'Unknown';
            const winner = playerMap[match.winner] || match.winner || 'Draw/Unknown';
            const loser = playerMap[match.loser] || match.loser || '-';
            
            return `
                <tr>
                    <td>${player1}</td>
                    <td>${player2}</td>
                    <td>${winner}</td>
                    <td>${loser}</td>
                    <td>${match.status || '-'}</td>
                </tr>
            `;
        }).join('');

        document.getElementById('matchHistoryTableBody').innerHTML = rows;
    } catch (error) {
        document.getElementById('matchHistoryTableBody').innerHTML = '<tr><td colspan="5">Error loading match history.</td></tr>';
    }
}


    // Call this after players are loaded
    setTimeout(loadMatchHistory, 500);
    
    // Function to refresh match history (can be called from other pages)
    window.refreshMatchHistory = loadMatchHistory;

    // Placeholder functions for now
    const playerSearchInput = document.getElementById('playerSearch');
    const sortBySelect = document.getElementById('sortBy');
    const filterCollegeSelect = document.getElementById('filterCollege');
    const filterRatingSelect = document.getElementById('filterRating');
    const exportCsvButton = document.getElementById('exportCsvButton');
    const printListButton = document.getElementById('printListButton');

    // Helper: Render player table
    function renderPlayerTable(players, rankings) {
        if (players.length === 0) {
            playerTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No players found.</td></tr>';
            return;
        }
        const playerRowsHTML = players.map(player => {
            return `
                <tr>
                    <td>${player.fullName}</td>
                    <td>${player.email}</td>
                    <td>${player.phoneNumber}</td>
                    <td>${player.uucmNumber}</td>
                    <td>${player.dateOfBirth}</td>
                    <td>${player.collegeName}</td>
                    <td>${player.branchName}</td>
                    <td>${player.chessRating || '-'}</td>
                </tr>
            `;
        }).join('');
        playerTableBody.innerHTML = playerRowsHTML;
    }

    // Helper: Get unique colleges and ratings for filters
    function getUniqueValues(players, key) {
        return [...new Set(players.map(p => p[key]).filter(Boolean))];
    }

    // State for filtering/sorting/search
    let filteredPlayers = [...registeredPlayers];

    // Populate filter dropdowns
    function populateFilters() {
        // Colleges
        const colleges = getUniqueValues(registeredPlayers, 'collegeName');
        filterCollegeSelect.innerHTML = '<option value="all">All Colleges</option>' + colleges.map(c => `<option value="${c}">${c}</option>`).join('');
        // Ratings
        const ratings = getUniqueValues(registeredPlayers, 'chessRating');
        filterRatingSelect.innerHTML = '<option value="all">All Ratings</option>' + ratings.map(r => `<option value="${r}">${r}</option>`).join('');
    }

    // Main update function
    function updateTable() {
        let players = [...registeredPlayers];
        // Search
        const search = playerSearchInput.value.trim().toLowerCase();
        if (search) {
            players = players.filter(player =>
                player.fullName.toLowerCase().includes(search) ||
                player.collegeName.toLowerCase().includes(search) ||
                (player.uucmNumber && player.uucmNumber.toLowerCase().includes(search))
            );
        }
        // Filter by college
        if (filterCollegeSelect.value !== 'all') {
            players = players.filter(p => p.collegeName === filterCollegeSelect.value);
        }
        // Filter by rating
        if (filterRatingSelect.value !== 'all') {
            players = players.filter(p => String(p.chessRating) === filterRatingSelect.value);
        }
        // Sort
        if (sortBySelect.value === 'name') {
            players.sort((a, b) => a.fullName.localeCompare(b.fullName));
        } else if (sortBySelect.value === 'ranking') {
            players.sort((a, b) => (playerRankings[a.email] || 9999) - (playerRankings[b.email] || 9999));
        } else if (sortBySelect.value === 'rating') {
            players.sort((a, b) => (b.chessRating || 0) - (a.chessRating || 0));
        }
        filteredPlayers = players;
        renderPlayerTable(players, playerRankings);
        updateStatistics(players, playerRankings);
    }

    // Export to CSV
    function exportToCSV() {
        if (!filteredPlayers.length) return alert('No players to export.');
        const headers = ['Name','Email','Phone','UUCM No.','D.O.B.','College','Branch','Chess Rating'];
        const rows = filteredPlayers.map(player => [
            player.fullName,
            player.email,
            player.phoneNumber,
            player.uucmNumber,
            player.dateOfBirth,
            player.collegeName,
            player.branchName,
            player.chessRating || '-'
        ]);
        let csvContent = headers.join(',') + '\n' + rows.map(r => r.map(x => '"' + String(x).replace(/"/g, '""') + '"').join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'players.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Event listeners
    if (playerSearchInput) {
        playerSearchInput.addEventListener('input', updateTable);
    }
    if (sortBySelect) {
        sortBySelect.addEventListener('change', updateTable);
    }
    if (filterCollegeSelect) {
        filterCollegeSelect.addEventListener('change', updateTable);
    }
    if (filterRatingSelect) {
        filterRatingSelect.addEventListener('change', updateTable);
    }
    if (exportCsvButton) {
        exportCsvButton.addEventListener('click', exportToCSV);
    }
    if (printListButton) {
        printListButton.addEventListener('click', () => {
            alert('Print List functionality (uses browser print).');
            window.print(); // Basic browser print
        });
    }

     // TODO: Populate filter dropdowns with options from fetched player data

    // Initial setup
    populateFilters();
    updateTable();

    // Helper to add a match to localStorage without duplicates (using a unique ID)
    function addMatchToHistory(match) {
        const matches = JSON.parse(localStorage.getItem('chessMatchHistory')) || [];
        // Use a unique key for each match (e.g., player names, winner, loser, status)
        const matchKey = `${match.player1}|${match.player2}|${match.winner}|${match.loser}|${match.status}`;
        const isDuplicate = matches.some(m =>
            `${m.player1}|${m.player2}|${m.winner}|${m.loser}|${m.status}` === matchKey
        );
        if (!isDuplicate) {
            matches.push(match);
            localStorage.setItem('chessMatchHistory', JSON.stringify(matches));
        }
    }

    // Helper to remove duplicates from match history in localStorage
    function removeDuplicateMatches() {
        const matches = JSON.parse(localStorage.getItem('chessMatchHistory')) || [];
        const seen = new Set();
        const uniqueMatches = [];
        matches.forEach(match => {
            const key = `${match.player1}|${match.player2}|${match.winner}|${match.loser}|${match.status}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMatches.push(match);
            }
        });
        localStorage.setItem('chessMatchHistory', JSON.stringify(uniqueMatches));
    }

    // Call this on DOMContentLoaded to clean up duplicates
    removeDuplicateMatches();

    document.getElementById('refreshMatchHistoryBtn').addEventListener('click', loadMatchHistory);

    setInterval(loadMatchHistory, 30000); // Refresh every 30 seconds

    window.addEventListener('storage', function(event) {
        if (event.key === 'matchHistoryUpdated') {
            loadMatchHistory();
        }
    });

    window.addEventListener('focus', loadMatchHistory);
}); 