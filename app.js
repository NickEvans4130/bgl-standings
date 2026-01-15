// BGL Standings Website - Main Application Logic

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    // Replace this with your Google Apps Script Web App URL
    API_BASE_URL: 'https://script.google.com/macros/s/AKfycbyZK-Aa-VPsXVqiNe5dNdhydmMLjP3ogR7ZNyo9-b5-LzUCJAxHZgF4uuqSeMUP4KHW/exec',
    
    // Cache duration (5 minutes)
    CACHE_DURATION: 5 * 60 * 1000,
    
    // League settings
    TOTAL_WEEKS: 4,
    
    // Season 1 Schedule
    SEASON_SCHEDULE: {
        registrationClose: new Date('2026-01-18T23:59:59'),
        qualifiersOpen: new Date('2026-01-18T00:00:00'),
        qualifiersClose: new Date('2026-01-24T23:59:59'),
        
        weeks: [
            {
                week: 1,
                prepStart: new Date('2026-01-25T00:00:00'),
                compStart: new Date('2026-02-01T00:00:00'),
                compEnd: new Date('2026-02-07T23:59:59')
            },
            {
                week: 2,
                prepStart: new Date('2026-02-08T00:00:00'),
                compStart: new Date('2026-02-15T00:00:00'),
                compEnd: new Date('2026-02-21T23:59:59')
            },
            {
                week: 3,
                prepStart: new Date('2026-02-22T00:00:00'),
                compStart: new Date('2026-03-01T00:00:00'),
                compEnd: new Date('2026-03-07T23:59:59')
            },
            {
                week: 4,
                prepStart: new Date('2026-03-08T00:00:00'),
                compStart: new Date('2026-03-15T00:00:00'),
                compEnd: new Date('2026-03-21T23:59:59')
            }
        ]
    }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
    currentView: 'standings',
    cache: new Map(),
    data: {
        standings: null,
        weekly: {},
        teams: null,
        stats: null
    }
};

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Fetch data from API with caching
 */
async function fetchData(endpoint, params = {}) {
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    
    // Check cache
    const cached = state.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
        console.log(`Using cached data for ${endpoint}`);
        return cached.data;
    }
    
    // Build URL
    const url = new URL(CONFIG.API_BASE_URL);
    url.searchParams.set('endpoint', endpoint);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    
    try {
        console.log(`Fetching ${endpoint}...`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cache the result
        state.cache.set(cacheKey, {
            data: data,
            timestamp: Date.now()
        });
        
        return data;
        
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Load standings data
 */
async function loadStandings() {
    const data = await fetchData('standings');
    state.data.standings = data;
    return data;
}

/**
 * Load weekly results
 */
async function loadWeeklyResults(week) {
    const data = await fetchData('weekly', { week });
    state.data.weekly[week] = data;
    return data;
}

/**
 * Load team roster
 */
async function loadTeams() {
    const data = await fetchData('teams');
    state.data.teams = data;
    return data;
}

/**
 * Load stats
 */
async function loadStats() {
    const data = await fetchData('stats');
    state.data.stats = data;
    return data;
}

// ============================================================================
// UI RENDERING
// ============================================================================

/**
 * Render overall standings
 */
function renderStandings(data, selectedWeek = 'current') {
    const tbody = document.getElementById('standings-body');
    tbody.innerHTML = '';
    
    if (!data || !data.standingsByWeek) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No data available</td></tr>';
        return;
    }
    
    // Determine which standings to show
    let standings;
    if (selectedWeek === 'current') {
        standings = data.standings;
    } else {
        standings = data.standingsByWeek[selectedWeek] || [];
    }
    
    if (standings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No data for this week</td></tr>';
        return;
    }
    
    standings.forEach(team => {
        const row = document.createElement('tr');
        
        const rankClass = team.rank <= 3 ? `rank-${team.rank}` : 'rank-other';
        
        row.innerHTML = `
            <td>
                <div class="rank-badge ${rankClass}">${team.rank}</div>
            </td>
            <td>
                <div class="team-name">Team ${team.teamNumber}</div>
            </td>
            <td>
                <div class="players">${team.player1} & ${team.player2}</div>
            </td>
            <td>
                <div class="score">${team.score}</div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Update header info
    const displayWeek = selectedWeek === 'current' ? data.currentWeek : selectedWeek;
    document.getElementById('current-week').textContent = data.currentWeek || '-';
    updateLastUpdated(data.lastUpdated);
    
    // Update subtitle based on selection
    const subtitle = document.querySelector('#standings-view .section-subtitle');
    if (selectedWeek === 'current') {
        subtitle.textContent = 'Cumulative scores across all competition weeks';
    } else {
        subtitle.textContent = `Cumulative scores through Week ${selectedWeek}`;
    }
}

/**
 * Render weekly results
 */
function renderWeeklyResults(data) {
    const tbody = document.getElementById('weekly-body');
    tbody.innerHTML = '';
    
    if (!data || !data.results || data.results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No results for this week yet</td></tr>';
        return;
    }
    
    data.results.forEach(team => {
        const row = document.createElement('tr');
        
        const rankClass = team.rank <= 3 ? `rank-${team.rank}` : 'rank-other';
        const bonusClass = team.bonusPoints < 0 ? 'score-positive' : '';
        
        row.innerHTML = `
            <td>
                <div class="rank-badge ${rankClass}">${team.rank}</div>
            </td>
            <td>
                <div class="team-name">Team ${team.teamNumber}</div>
            </td>
            <td>
                <div class="players">${team.player1} & ${team.player2}</div>
            </td>
            <td>${team.rawPositionSum}</td>
            <td class="${bonusClass}">${team.bonusPoints}</td>
            <td><strong>${team.finalScore}</strong></td>
            <td>${team.cumulativeScore}</td>
        `;
        
        tbody.appendChild(row);
    });
}

/**
 * Render team roster
 */
function renderTeams(data) {
    const grid = document.getElementById('teams-grid');
    grid.innerHTML = '';
    
    if (!data || !data.teams || data.teams.length === 0) {
        grid.innerHTML = '<p style="text-align: center; padding: 2rem;">No teams found</p>';
        return;
    }
    
    data.teams.forEach(team => {
        const card = document.createElement('div');
        card.className = 'team-card';
        
        card.innerHTML = `
            <div class="team-card-header">
                <div class="team-number">${team.teamNumber}</div>
                <h3>Team ${team.teamNumber}</h3>
            </div>
            <div class="team-card-players">
                <div class="player-item">
                    <span class="player-icon">🎮</span>
                    <span class="player-name">${team.player1.name}</span>
                </div>
                <div class="player-item">
                    <span class="player-icon">🎮</span>
                    <span class="player-name">${team.player2.name}</span>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
}

/**
 * Render stats
 */
function renderStats(data) {
    const grid = document.getElementById('stats-grid');
    grid.innerHTML = '';
    
    if (!data) {
        grid.innerHTML = '<p style="text-align: center; padding: 2rem;">No stats available</p>';
        return;
    }
    
    const stats = [
        { label: 'Total Teams', value: data.totalTeams },
        { label: 'Total Players', value: data.totalPlayers },
        { label: 'Current Week', value: data.currentWeek },
        { label: 'Leading Team', value: data.leaderTeam ? `Team ${data.leaderTeam.teamNumber}` : '-' }
    ];
    
    stats.forEach(stat => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        
        card.innerHTML = `
            <div class="stat-value">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
        `;
        
        grid.appendChild(card);
    });
}

/**
 * Update last updated timestamp
 */
function updateLastUpdated(timestamp) {
    const element = document.getElementById('last-updated');
    if (!timestamp) {
        element.textContent = 'Unknown';
        return;
    }
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    let text;
    if (diffMins < 1) {
        text = 'Just now';
    } else if (diffMins < 60) {
        text = `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else {
        const diffHours = Math.floor(diffMins / 60);
        text = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }
    
    element.textContent = text;
}

/**
 * Get current season status
 */
function getSeasonStatus() {
    const now = new Date();
    const schedule = CONFIG.SEASON_SCHEDULE;
    
    // Check if qualifiers
    if (now >= schedule.qualifiersOpen && now <= schedule.qualifiersClose) {
        return {
            phase: 'qualifiers',
            emoji: '🎯',
            text: 'Qualifier Seeds Open',
            description: `Play qualifier seeds until ${schedule.qualifiersClose.toLocaleDateString()}`
        };
    }
    
    // Check each competition week
    for (const weekData of schedule.weeks) {
        // Prep week
        if (now >= weekData.prepStart && now < weekData.compStart) {
            return {
                phase: 'prep',
                emoji: '📝',
                text: `Prep Week ${weekData.week}`,
                description: `Competition starts ${weekData.compStart.toLocaleDateString()}`
            };
        }
        
        // Comp week
        if (now >= weekData.compStart && now <= weekData.compEnd) {
            return {
                phase: 'comp',
                emoji: '🏆',
                text: `Competition Week ${weekData.week} - LIVE`,
                description: `Ends ${weekData.compEnd.toLocaleDateString()}`
            };
        }
    }
    
    // Check if season ended
    const lastWeek = schedule.weeks[schedule.weeks.length - 1];
    if (now > lastWeek.compEnd) {
        return {
            phase: 'ended',
            emoji: '✅',
            text: 'Season 1 Complete',
            description: 'Thanks for participating!'
        };
    }
    
    // Before season starts
    return {
        phase: 'upcoming',
        emoji: '📅',
        text: 'Season Starting Soon',
        description: `Qualifiers open ${schedule.qualifiersOpen.toLocaleDateString()}`
    };
}

/**
 * Update season status banner
 */
function updateSeasonStatus() {
    const statusEl = document.getElementById('season-status');
    if (!statusEl) return;
    
    const status = getSeasonStatus();
    
    statusEl.className = `season-status ${status.phase}`;
    statusEl.innerHTML = `
        <span class="emoji">${status.emoji}</span>
        <span>${status.text}</span>
    `;
    
    statusEl.title = status.description;
}

// ============================================================================
// VIEW MANAGEMENT
// ============================================================================

/**
 * Show loading state
 */
function showLoading() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.classList.add('show');
    }
}

/**
 * Hide loading state
 */
function hideLoading() {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.classList.remove('show');
    }
}

/**
 * Show error state
 */
function showError(message) {
    hideLoading();
    const errorEl = document.getElementById('error');
    errorEl.querySelector('p').textContent = message || 'Failed to load data';
    errorEl.style.display = 'block';
}

/**
 * Switch to a view
 */
async function switchView(viewName) {
    state.currentView = viewName;
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === viewName) {
            btn.classList.add('active');
        }
    });
    
    // Hide error
    document.getElementById('error').style.display = 'none';
    
    // Hide all views first
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show selected view immediately (before loading)
    const targetView = document.getElementById(`${viewName}-view`);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    // Load data for the view
    try {
        showLoading();
        
        switch(viewName) {
            case 'standings':
                const standingsData = await loadStandings();
                const selectedWeek = document.getElementById('standings-week-select')?.value || 'current';
                renderStandings(standingsData, selectedWeek);
                break;
                
            case 'weekly':
                const currentWeek = document.getElementById('week-select')?.value || '1';
                const weeklyData = await loadWeeklyResults(currentWeek);
                renderWeeklyResults(weeklyData);
                break;
                
            case 'teams':
                const teamsData = await loadTeams();
                renderTeams(teamsData);
                break;
                
            case 'stats':
                const statsData = await loadStats();
                renderStats(statsData);
                break;
        }
        
        hideLoading();
        
    } catch (error) {
        console.error('Error loading view:', error);
        showError('❌ Failed to load data. Please check your API configuration and try again.');
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Initialize event listeners
 */
function initEventListeners() {
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchView(btn.dataset.view);
        });
    });
    
    // Week selector for weekly results view
    document.getElementById('week-select').addEventListener('change', async (e) => {
        try {
            showLoading();
            const weeklyData = await loadWeeklyResults(e.target.value);
            renderWeeklyResults(weeklyData);
            hideLoading();
        } catch (error) {
            showError('❌ Failed to load weekly results');
        }
    });
    
    // Week selector for standings view
    document.getElementById('standings-week-select').addEventListener('change', async (e) => {
        const selectedWeek = e.target.value;
        try {
            showLoading();
            const standingsData = state.data.standings || await loadStandings();
            renderStandings(standingsData, selectedWeek);
            hideLoading();
        } catch (error) {
            showError('❌ Failed to load standings');
        }
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the app
 */
async function init() {
    console.log('Initializing BGL Standings...');
    
    // Check if API URL is configured
    if (CONFIG.API_BASE_URL.includes('YOUR_DEPLOYMENT_ID')) {
        showError('⚠️ API not configured. Please update CONFIG.API_BASE_URL in app.js');
        return;
    }
    
    // Update season status
    updateSeasonStatus();
    
    // Update status every minute
    setInterval(updateSeasonStatus, 60 * 1000);
    
    // Set up event listeners
    initEventListeners();
    
    // Populate weekly results week selector
    const weekSelect = document.getElementById('week-select');
    weekSelect.innerHTML = '';
    for (let i = 1; i <= CONFIG.TOTAL_WEEKS; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Week ${i}`;
        weekSelect.appendChild(option);
    }
    
    // Load initial view (standings) and populate standings week selector
    try {
        showLoading();
        const standingsData = await loadStandings();
        
        // Populate standings week selector based on available data
        const standingsWeekSelect = document.getElementById('standings-week-select');
        standingsWeekSelect.innerHTML = '<option value="current">Current (All Weeks)</option>';
        
        if (standingsData.totalWeeks) {
            for (let i = 1; i <= standingsData.totalWeeks; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `After Week ${i}`;
                standingsWeekSelect.appendChild(option);
            }
        }
        
        renderStandings(standingsData, 'current');
        hideLoading();
        
        // Show standings view
        document.getElementById('standings-view').classList.add('active');
        
    } catch (error) {
        showError('❌ Failed to load initial data');
    }
    
    console.log('BGL Standings initialized!');
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}