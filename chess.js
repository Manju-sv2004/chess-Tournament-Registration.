// Chess Game Implementation
// --- Backend Integration: Fetching players from API ---
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
class ChessGame {
    constructor() {
        this.game = new Chess();
        this.board = null;
        this.whiteTime = 600; // 10 minutes in seconds
        this.blackTime = 600;
        this.timer = null;
        this.capturedPieces = {
            white: [],
            black: []
        };
        this.moveHistory = [];
        this.isGameOver = false;
        this.gameStartTime = Date.now(); // Initialize game start time
        this.initializeGame();
    }

    initializeGame() {
        this.initializeBoard();
        this.setupEventListeners();
        this.updateClocks();
        this.startTimer();
    }

    initializeBoard() {
        const boardConfig = {
            draggable: true,
            position: 'start',
            onDragStart: this.onDragStart.bind(this),
            onDrop: this.onDrop.bind(this),
            onSnapEnd: this.onSnapEnd.bind(this),
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
            showNotation: true,
            showErrors: 'console'
        };
        this.board = Chessboard('board', boardConfig);
    }

    onDragStart(source, piece) {
        if (this.isGameOver) return false;
        if ((this.game.turn() === 'w' && piece.search(/^b/) !== -1) ||
            (this.game.turn() === 'b' && piece.search(/^w/) !== -1)) {
            return false;
        }
    }

    onDrop(source, target) {
        const move = this.game.move({
            from: source,
            to: target,
            promotion: 'q'
        });
        if (move === null) return 'snapback';
        this.updateBoard();
        this.updateMoveHistory(move);
        this.updateCapturedPieces(move);
        this.switchTurn();
    }

    onSnapEnd() {
        this.board.position(this.game.fen());
    }

    updateBoard() {
        this.board.position(this.game.fen());
    }

    updateMoveHistory(move) {
        this.moveHistory.push(move);
        const movesContainer = document.querySelector('.moves-container');
        movesContainer.innerHTML = '';
        for (let i = 0; i < this.moveHistory.length; i += 2) {
            const moveDiv = document.createElement('div');
            moveDiv.className = 'move';
            moveDiv.textContent = `${i/2 + 1}. ${this.moveHistory[i].san}`;
            if (i + 1 < this.moveHistory.length) {
                moveDiv.textContent += ` ${this.moveHistory[i + 1].san}`;
            }
            movesContainer.appendChild(moveDiv);
        }
        movesContainer.scrollTop = movesContainer.scrollHeight;
    }

    updateCapturedPieces(move) {
        if (move.captured) {
            const color = move.color === 'w' ? 'black' : 'white';
            this.capturedPieces[color].push(move.captured);
            const container = document.querySelector(`.${color}-captured .captured-container`);
            const piece = document.createElement('div');
            piece.className = `piece ${move.color}${move.captured}`;
            piece.style.backgroundImage = `url(https://chessboardjs.com/img/chesspieces/wikipedia/${move.color}${move.captured}.png)`;
            container.appendChild(piece);
        }
    }

    switchTurn() {
        this.game.turn() === 'w' ? this.whiteTime-- : this.blackTime--;
        this.updateClocks();
        const statusElement = document.querySelector('.status-message');
        if (!this.isGameOver) {
            const currentPlayer = this.game.turn() === 'w' ? 'White' : 'Black';
            statusElement.textContent = `${currentPlayer}'s turn`;
            statusElement.classList.remove('game-over');
        }
        if (this.game.game_over()) {
            this.endGame();
        }
    }

    updateClocks() {
        const whiteTimer = document.querySelector('.white-player .player-timer');
        const blackTimer = document.querySelector('.black-player .player-timer');
        whiteTimer.textContent = this.formatTime(this.whiteTime);
        blackTimer.textContent = this.formatTime(this.blackTime);
        if (this.game.turn() === 'w') {
            whiteTimer.classList.add('active-timer');
            blackTimer.classList.remove('active-timer');
        } else {
            blackTimer.classList.add('active-timer');
            whiteTimer.classList.remove('active-timer');
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    startTimer() {
        this.timer = setInterval(() => {
            if (this.isGameOver) {
                this.stopTimer();
                return;
            }
            if (this.game.turn() === 'w') {
                this.whiteTime--;
            } else {
                this.blackTime--;
            }
            this.updateClocks();
            if (this.whiteTime <= 0 || this.blackTime <= 0) {
                this.handleTimeOut();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    async handleTimeOut() {
        this.isGameOver = true;
        this.stopTimer();
        const winner = this.whiteTime <= 0 ? 'Black' : 'White';
        const loser = this.whiteTime <= 0 ? 'White' : 'Black';
        const reason = 'Time Out';
        document.querySelector('.status-message').textContent = `${winner} wins by ${reason}!`;
        document.querySelector('.status-message').classList.add('game-over');
        this.showGameOverModal(`${winner} wins by ${reason}!`);
        if (tournamentStarted && currentWhite && currentBlack) {
            const winnerPlayer = winner === 'White' ? currentWhite : currentBlack;
            const loserPlayer = winner === 'White' ? currentBlack : currentWhite;
            winnerPlayer.wins++;
            loserPlayer.losses++;
            renderPlayersTable();
            
            // Save match to backend
            try {
                const matchData = {
                    player1: winnerPlayer.email,
                    player2: loserPlayer.email,
                    winner: winnerPlayer.email,
                    loser: loserPlayer.email,
                    status: 'completed',
                    duration: Math.floor((Date.now() - this.gameStartTime) / 1000) // Duration in seconds
                };
                
                const response = await fetch(`${API_BASE}/matches`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(matchData)
                });
                
                if (response.ok) {
                    console.log('Match saved to backend successfully');
                    // Refresh match history on home page if it's open
                    if (window.opener && window.opener.refreshMatchHistory) {
                        window.opener.refreshMatchHistory();
                    }
                    localStorage.setItem('matchHistoryUpdated', Date.now());
                } else {
                    console.error('Failed to save match to backend');
                }
            } catch (error) {
                console.error('Error saving match:', error);
            }
        }
    }

    async endGame() {
        this.stopTimer();
        this.isGameOver = true;
        let result = '';
        let statusMessage = '';
        let winner = null;
        let loser = null;
        let gameResult = '';
        
        if (this.game.in_checkmate()) {
            winner = this.game.turn() === 'w' ? currentBlack : currentWhite;
            loser = this.game.turn() === 'w' ? currentWhite : currentBlack;
            result = `Checkmate! ${winner.name} wins!`;
            statusMessage = `${winner.name} wins by Checkmate!`;
            gameResult = 'checkmate';
        } else if (this.game.in_draw()) {
            result = 'Game drawn!';
            statusMessage = 'Game ended in a draw!';
            gameResult = 'draw';
        } else if (this.whiteTime <= 0) {
            winner = currentBlack;
            loser = currentWhite;
            result = `${winner.name} wins on time!`;
            statusMessage = `${winner.name} wins by Time Out!`;
            gameResult = 'timeout';
        } else if (this.blackTime <= 0) {
            winner = currentWhite;
            loser = currentBlack;
            result = `${winner.name} wins on time!`;
            statusMessage = `${winner.name} wins by Time Out!`;
            gameResult = 'timeout';
        }
        
        const statusElement = document.querySelector('.status-message');
        statusElement.textContent = statusMessage;
        statusElement.classList.add('game-over');
        
        if (winner && loser && tournamentStarted) {
            winner.wins = (winner.wins || 0) + 1;
            loser.losses = (loser.losses || 0) + 1;
            winner.points = (winner.points || 0) + 1;
            savePlayers();
            renderPlayersTable();
            
            // Save match to backend
            try {
                const matchData = {
                    player1: winner.email,
                    player2: loser.email,
                    winner: winner.email,
                    loser: loser.email,
                    status: 'completed',
                    duration: Math.floor((Date.now() - this.gameStartTime) / 1000) // Duration in seconds
                };
                console.log("end");
                const response = await fetch(`${API_BASE}/matches`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(matchData)
                });
                
                if (response.ok) {
                    console.log('Match saved to backend successfully');
                    // Refresh match history on home page if it's open
                    if (window.opener && window.opener.refreshMatchHistory) {
                        window.opener.refreshMatchHistory();
                    }
                    localStorage.setItem('matchHistoryUpdated', Date.now());
                } else {
                    console.error('Failed to save match to backend');
                }
            } catch (error) {
                console.error('Error saving match:', error);
            }
            
            updateNextPlayers();
        }
        
        document.querySelector('.result-message').textContent = result;
        document.getElementById('gameOverModal').style.display = 'block';
    }

    newGame() {
        this.game = new Chess();
        this.whiteTime = 600;
        this.blackTime = 600;
        this.capturedPieces = { white: [], black: [] };
        this.moveHistory = [];
        this.isGameOver = false;
        const statusElement = document.querySelector('.status-message');
        statusElement.textContent = 'Game in progress';
        statusElement.classList.remove('game-over');
        document.querySelectorAll('.captured-container').forEach(container => {
            container.innerHTML = '';
        });
        this.board.position('start');
        this.updateClocks();
        this.closeModal();
        this.startTimer();
    }

    undoMove() {
        if (this.moveHistory.length > 0) {
            this.game.undo();
            this.moveHistory.pop();
            this.updateBoard();
            this.updateMoveHistory();
            this.switchTurn();
        }
    }

    async resign() {
        if (this.isGameOver) return;
        const resigningColor = this.game.turn() === 'w' ? 'White' : 'Black';
        const winnerColor = resigningColor === 'White' ? 'Black' : 'White';
        this.isGameOver = true;
        this.stopTimer();
        const statusElement = document.querySelector('.status-message');
        statusElement.textContent = `${winnerColor} wins by resignation!`;
        statusElement.classList.add('game-over');
        document.querySelector('.result-message').textContent = `${resigningColor} resigns! ${winnerColor} wins!`;
        document.getElementById('gameOverModal').style.display = 'block';
        if (tournamentStarted && currentWhite && currentBlack) {
            const winner = winnerColor === 'White' ? currentWhite : currentBlack;
            const loser = resigningColor === 'White' ? currentWhite : currentBlack;
            if (winner && loser) {
                winner.wins = (winner.wins || 0) + 1;
                winner.points = (winner.points || 0) + 1;
                loser.losses = (loser.losses || 0) + 1;
                savePlayers();
                renderPlayersTable();
                
                // Save match to backend
                try {
                    const matchData = {
                        player1: winner.email,
                        player2: loser.email,
                        winner: winner.email,
                        loser: loser.email,
                        status: 'completed',
                        duration: Math.floor((Date.now() - this.gameStartTime) / 1000) // Duration in seconds
                    };
                     console.log("resign");
                    const response = await fetch(`${API_BASE}/matches`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(matchData)
                    });
                    
                    if (response.ok) {
                        console.log('Match saved to backend successfully');
                        // Refresh match history on home page if it's open
                        if (window.opener && window.opener.refreshMatchHistory) {
                            window.opener.refreshMatchHistory();
                        }
                        localStorage.setItem('matchHistoryUpdated', Date.now());
                    } else {
                        console.error('Failed to save match to backend');
                    }
                } catch (error) {
                    console.error('Error saving match:', error);
                }
                
                updateNextPlayers();
            }
        }
    }

    showAnalysis() {
        alert('Game analysis feature coming soon!');
    }

    closeModal() {
        document.getElementById('gameOverModal').style.display = 'none';
    }

    setupEventListeners() {
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.newGame();
        });
        document.getElementById('undoBtn').addEventListener('click', () => {
            this.undoMove();
        });
      document.getElementById('resignBtn').addEventListener('click', () => {
    if (!this.isGameOver) {
        this.resign();
    }
}, { once: true }); 
        document.getElementById('newGameModalBtn').addEventListener('click', () => {
            this.newGame();
        });
        document.getElementById('analysisBtn').addEventListener('click', () => {
            this.showAnalysis();
        });
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('gameOverModal');
            if (event.target === modal) {
                this.closeModal();
            }
        });
        document.getElementById('addSelectedPlayerBtn').addEventListener('click', async () => {
            const playerSelect = document.getElementById('playerSelect');
            const selectedPlayer = playerSelect.value;
            if (!selectedPlayer) {
                alert('Please select a player!');
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE}/players`);
                if (!response.ok) {
                    throw new Error('Failed to fetch players');
                }
                const registeredPlayers = await response.json();
                const player = registeredPlayers.find(p => p.fullName === selectedPlayer);
                
                if (player && player.fullName && player.email) {
                    players.push({
                        name: player.fullName,
                        email: player.email,
                        rating: player.chessRating || 1500,
                        wins: player.wins || 0,
                        losses: player.losses || 0,
                        points: player.points || 0
                    });
                    savePlayers();
                    renderPlayersTable();
                    await updatePlayerSelect();
                } else {
                    alert('Selected player details are invalid. Please try again.');
                }
            } catch (error) {
                console.error('Error adding player:', error);
                alert('Error adding player. Please try again.');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize API base URL
    await getApiBase();
    console.log('Using API Base:', API_BASE);
    
    window.chessGame = new ChessGame();
    await loadPlayers();
    renderPlayersTable();
});

let players = [];
let tournamentStarted = false;
let currentWhite = null;
let currentBlack = null;
let matches = [];

async function loadPlayers() {
    // Load players from localStorage
    players = JSON.parse(localStorage.getItem('tournamentPlayers')) || [];
    await updatePlayerSelect();
    renderPlayersTable();
}

function savePlayers() {
    localStorage.setItem('tournamentPlayers', JSON.stringify(players));
}

async function updatePlayerSelect() {
    const playerSelect = document.getElementById('playerSelect');
    playerSelect.innerHTML = '<option value="">Select a player</option>';
    
    try {
        const response = await fetch(`${API_BASE}/players`);
        if (!response.ok) {
            throw new Error('Failed to fetch players');
        }
        const registeredPlayers = await response.json();
        const tournamentNames = players.map(p => p.name);
        
        registeredPlayers
            .filter(player => !tournamentNames.includes(player.fullName))
            .forEach(player => {
                const option = document.createElement('option');
                option.value = player.fullName;
                option.textContent = `${player.fullName} (Rating: ${player.chessRating || 'N/A'})`;
                playerSelect.appendChild(option);
            });
    } catch (error) {
        console.error('Error fetching players:', error);
        playerSelect.innerHTML = '<option value="">Error loading players</option>';
    }
}

function renderPlayersTable() {
    const tbody = document.querySelector('#playersTable tbody');
    tbody.innerHTML = '';
    players.forEach((player, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${player.name}</td>
            <td>${player.rating}</td>
            <td style="color: #0f0;">${player.wins || 0}</td>
            <td style="color: #f00;">${player.losses || 0}</td>
            <td>${player.points || 0}</td>
            <td>
                <button class="remove-player-btn" onclick="removePlayer(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    updateRegisteredNamesList();
}

function updateRegisteredNamesList() {
    const namesDiv = document.getElementById('registeredNamesList');
    if (players.length > 0) {
        namesDiv.innerHTML = '<strong>Tournament Players:</strong><br>';
        players.forEach((player, index) => {
            namesDiv.innerHTML += `
                <div class="registered-player-item">
                    ${index + 1}. ${player.name} (Rating: ${player.rating})
                </div>`;
        });
    } else {
        namesDiv.innerHTML = 'No players registered for tournament yet.';
    }
}

function removePlayer(index) {
    players.splice(index, 1);
    savePlayers();
    renderPlayersTable();
    updatePlayerSelect();
}

function updateNextPlayers() {
    if (!tournamentStarted || players.length < 2) return;
    const whiteIndex = players.indexOf(currentWhite);
    const blackIndex = players.indexOf(currentBlack);
    let nextWhiteIndex = (blackIndex + 1) % players.length;
    let nextBlackIndex = (nextWhiteIndex + 1) % players.length;
    currentWhite = players[nextWhiteIndex];
    currentBlack = players[nextBlackIndex];
    document.querySelector('.white-player .player-name').textContent = currentWhite.name;
    document.querySelector('.white-player .player-rating').textContent = `Rating: ${currentWhite.rating}`;
    document.querySelector('.black-player .player-name').textContent = currentBlack.name;
    document.querySelector('.black-player .player-rating').textContent = `Rating: ${currentBlack.rating}`;
}



function updateTournamentStats() {
    // Implementation of updateTournamentStats function
}

function updateHomePageStats() {
    // Implementation of updateHomePageStats function
}

function showMessage(message, type) {
    alert(message);
}

document.getElementById('startTournamentBtn').addEventListener('click', () => {
    if (players.length < 2) {
        alert('Need at least 2 players to start a tournament!');
        return;
    }
    tournamentStarted = true;
    // Initialize tournament stats
    players.forEach(player => {
        player.wins = player.wins || 0;
        player.losses = player.losses || 0;
        player.points = player.points || 0;
    });
    // Set first players
    currentWhite = players[0];
    currentBlack = players[1];
    // Update player displays
    document.querySelector('.white-player .player-name').textContent = currentWhite.name;
    document.querySelector('.white-player .player-rating').textContent = `Rating: ${currentWhite.rating}`;
    document.querySelector('.black-player .player.name');
    document.querySelector('.black-player .player-name').textContent = currentBlack.name;
    document.querySelector('.black-player .player-rating').textContent = `Rating: ${currentBlack.rating}`;
    // Disable selection
    document.getElementById('startTournamentBtn').disabled = true;
    document.getElementById('playerSelect').disabled = true;
    document.getElementById('addSelectedPlayerBtn').disabled = true;
    // Start first game
    window.chessGame = new ChessGame();
}); 