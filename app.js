// BGL Standings Website - Main Application Logic

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    // Replace this with your Google Apps Script Web App URL
    API_BASE_URL: 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLjRNghDh9nodzMikcZOubxlWudft8grd826chYYhgUgMxJuyY41DTE8sA6jAMW0GtS1EoY5PVLm_ENfVESh8AI_xNWlPngmE8xdb7P8-koZy6cKp0M401dXHf7CXNd2a4SG9vVgIdV1vkbe2PexhLOxxiY0oO_28EfRSguddTtrwJUkSeLvRlXayBe-6uExSu8HrQxIxbZnaAiXNpuMVjJa13ZverMmKPdzr3PMfbY6ZE1mM0IJ3NRmhWc8FVUH6Hlrp-uHf0fKCFmrt3_1zIGXpVuudgdP2pbRR4VHm-9qdobBXHJdaN6-HHvg2A&lib=MVIxilCSL1t1ULljJxlObMipUgJ5-gL--',
    
    // Cache duration (5 minutes)
    CACHE_DURATION: 5 * 60 * 1000,
    
    // League settings
    TOTAL_WEEKS: 4
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
function renderStandings(data) {
    const tbody = document.getElementById('standings-body');
    tbody.innerHTML = '';
    
    if (!data || !data.standings || data.standings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No data available</td></tr>';
        return;
    }
    
    data.standings.forEach(team => {
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
    document.getElementById('current-week').textContent = data.currentWeek || '-';
    updateLastUpdated(data.lastUpdated);
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

// ============================================================================
// VIEW MANAGEMENT
// ============================================================================

/**
 * Show loading state
 */
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';
    
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
}

/**
 * Hide loading state
 */
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
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
    
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show selected view
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
                renderStandings(standingsData);
                break;
                
            case 'weekly':
                const currentWeek = document.getElementById('week-select').value;
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
        showError('❌ Failed to load data. Please try again later.');
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
    
    // Week selector
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
    
    // Set up event listeners
    initEventListeners();
    
    // Populate week selector
    const weekSelect = document.getElementById('week-select');
    weekSelect.innerHTML = '';
    for (let i = 1; i <= CONFIG.TOTAL_WEEKS; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = `Week ${i}`;
        weekSelect.appendChild(option);
    }
    
    // Load initial view (standings)
    await switchView('standings');
    
    console.log('BGL Standings initialized!');
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}