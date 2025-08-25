// Modern UI Manager for Carball.io
import StatsManager from './stats.js';

class ModernUI {
    constructor() {
        this.statsManager = new StatsManager();
        this.currentTab = 'skins';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateQuickStats();
        this.updateGoalsDisplay();
        this.setupTabs();
    }

    setupEventListeners() {
        // Stats button
        const statsButton = document.getElementById('statsButton');
        const statsModal = document.getElementById('statsModal');
        
        if (statsButton) {
            statsButton.addEventListener('click', () => {
                this.openStatsModal();
            });
        }

        // Close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Click outside to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }

    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                
                // Update active tab button
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update active tab pane
                tabPanes.forEach(pane => pane.classList.remove('active'));
                document.getElementById(targetTab + '-tab').classList.add('active');
                
                this.currentTab = targetTab;
            });
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === tabName + '-tab');
        });
    }

    openStatsModal() {
        const modal = document.getElementById('statsModal');
        modal.style.display = 'block';
        this.populateStats();
    }

    populateStats() {
        const stats = this.statsManager.getStats();
        const statsGrid = document.getElementById('statsGrid');
        
        const statsHTML = `
            <div class=\"stat-card\">
                <h4>🏆 Wins</h4>
                <div class=\"value\">${stats.totalWins}</div>
                <div class=\"subtitle\">${stats.winRate}% win rate</div>
            </div>
            <div class=\"stat-card\">
                <h4>🎮 Games Played</h4>
                <div class=\"value\">${stats.totalGamesPlayed}</div>
                <div class=\"subtitle\">${stats.totalLosses} losses</div>
            </div>
            <div class=\"stat-card\">
                <h4>⚽ Goals Scored</h4>
                <div class=\"value\">${stats.totalGoals}</div>
                <div class=\"subtitle\">${stats.goalsPerGame} per game</div>
            </div>
            <div class=\"stat-card\">
                <h4>⏱️ Play Time</h4>
                <div class=\"value\">${this.statsManager.formatPlayTime(stats.totalPlayTime)}</div>
                <div class=\"subtitle\">Avg: ${stats.averageGameDuration}s per game</div>
            </div>
            <div class=\"stat-card\">
                <h4>🔥 Best Streak</h4>
                <div class=\"value\">${stats.bestWinStreak}</div>
                <div class=\"subtitle\">Current: ${stats.currentWinStreak}</div>
            </div>
            <div class=\"stat-card\">
                <h4>🚀 Total Boosts</h4>
                <div class=\"value\">${stats.totalBoosts}</div>
                <div class=\"subtitle\">Power plays</div>
            </div>
        `;
        
        statsGrid.innerHTML = statsHTML;
    }

    updateQuickStats() {
        const stats = this.statsManager.getStats();
        
        const quickGoals = document.getElementById('quickGoals');
        const quickWins = document.getElementById('quickWins');
        const quickGames = document.getElementById('quickGames');
        
        if (quickGoals) quickGoals.textContent = stats.totalGoals;
        if (quickWins) quickWins.textContent = stats.totalWins;
        if (quickGames) quickGames.textContent = stats.totalGamesPlayed;
    }

    updateGoalsDisplay() {
        const stats = this.statsManager.getStats();
        const goalsElement = document.getElementById('goals');
        if (goalsElement) {
            goalsElement.textContent = stats.totalGoals;
        }
    }

    // Call this when a game ends
    recordGameResult(won, duration, goals, boosts, distance) {
        this.statsManager.recordGameResult(won, duration, goals, boosts, distance);
        this.updateQuickStats();
        this.updateGoalsDisplay();
    }

    // Call this when goals are scored
    addGoals(amount) {
        this.statsManager.incrementStat('totalGoals', amount);
        this.updateQuickStats();
        this.updateGoalsDisplay();
    }

    // Call this when boost is used
    addBoost() {
        this.statsManager.incrementStat('totalBoosts', 1);
    }
}

// Global functions for buttons
window.resetStats = function() {
    if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
        window.statsManager.resetStats();
        window.modernUI.updateQuickStats();
        window.modernUI.updateGoalsDisplay();
        window.modernUI.populateStats();
        alert('Statistics have been reset.');
    }
};

window.exportStats = function() {
    const statsData = window.statsManager.exportStats();
    const blob = new Blob([statsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carball-stats.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Create global instance
window.modernUI = new ModernUI();

export default ModernUI;