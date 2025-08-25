// Comprehensive stats tracking system for Carball.io
class StatsManager {
    constructor() {
        this.statsKey = 'carball_stats';
        this.init();
    }

    init() {
        try {
            const existingStats = localStorage.getItem(this.statsKey);
            if (!existingStats) {
                this.resetStats();
            }
        } catch (error) {
            console.error('Error initializing stats:', error);
            this.resetStats();
        }
    }

    resetStats() {
        const defaultStats = {
            totalGoals: 0,
            totalWins: 0,
            totalLosses: 0,
            totalGamesPlayed: 0,
            totalPlayTime: 0, // in minutes
            longestGame: 0, // in seconds
            averageGameDuration: 0,
            bestWinStreak: 0,
            currentWinStreak: 0,
            goalsPerGame: 0,
            winRate: 0,
            totalBoosts: 0,
            totalDistance: 0, // in game units
            firstPlayDate: new Date().toISOString(),
            lastPlayDate: new Date().toISOString(),
            achievements: []
        };
        
        try {
            localStorage.setItem(this.statsKey, JSON.stringify(defaultStats));
        } catch (error) {
            console.error('Error saving default stats:', error);
        }
    }

    getStats() {
        try {
            const stats = localStorage.getItem(this.statsKey);
            return stats ? JSON.parse(stats) : this.getDefaultStats();
        } catch (error) {
            console.error('Error reading stats:', error);
            return this.getDefaultStats();
        }
    }

    getDefaultStats() {
        return {
            totalGoals: 0,
            totalWins: 0,
            totalLosses: 0,
            totalGamesPlayed: 0,
            totalPlayTime: 0,
            longestGame: 0,
            averageGameDuration: 0,
            bestWinStreak: 0,
            currentWinStreak: 0,
            goalsPerGame: 0,
            winRate: 0,
            totalBoosts: 0,
            totalDistance: 0,
            firstPlayDate: new Date().toISOString(),
            lastPlayDate: new Date().toISOString(),
            achievements: []
        };
    }

    updateStats(statKey, value) {
        try {
            const stats = this.getStats();
            stats[statKey] = value;
            stats.lastPlayDate = new Date().toISOString();
            this.calculateDerivedStats(stats);
            localStorage.setItem(this.statsKey, JSON.stringify(stats));
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    incrementStat(statKey, amount = 1) {
        try {
            const stats = this.getStats();
            stats[statKey] = (stats[statKey] || 0) + amount;
            stats.lastPlayDate = new Date().toISOString();
            this.calculateDerivedStats(stats);
            localStorage.setItem(this.statsKey, JSON.stringify(stats));
        } catch (error) {
            console.error('Error incrementing stat:', error);
        }
    }

    calculateDerivedStats(stats) {
        // Calculate win rate
        if (stats.totalGamesPlayed > 0) {
            stats.winRate = ((stats.totalWins / stats.totalGamesPlayed) * 100).toFixed(1);
            stats.goalsPerGame = (stats.totalGoals / stats.totalGamesPlayed).toFixed(1);
        }

        // Calculate average game duration
        if (stats.totalGamesPlayed > 0) {
            stats.averageGameDuration = Math.round(stats.totalPlayTime / stats.totalGamesPlayed);
        }
    }

    recordGameResult(won, gameDuration, goalsScored, boostsUsed, distanceTraveled) {
        try {
            const stats = this.getStats();
            
            stats.totalGamesPlayed++;
            stats.totalPlayTime += Math.round(gameDuration / 60); // Convert to minutes
            stats.totalGoals += goalsScored || 0;
            stats.totalBoosts += boostsUsed || 0;
            stats.totalDistance += distanceTraveled || 0;
            
            if (gameDuration > stats.longestGame) {
                stats.longestGame = gameDuration;
            }

            if (won) {
                stats.totalWins++;
                stats.currentWinStreak++;
                if (stats.currentWinStreak > stats.bestWinStreak) {
                    stats.bestWinStreak = stats.currentWinStreak;
                }
            } else {
                stats.totalLosses++;
                stats.currentWinStreak = 0;
            }

            this.calculateDerivedStats(stats);
            localStorage.setItem(this.statsKey, JSON.stringify(stats));
            
            // Check for achievements
            this.checkAchievements(stats);
        } catch (error) {
            console.error('Error recording game result:', error);
        }
    }

    checkAchievements(stats) {
        const achievements = [];
        
        if (stats.totalGamesPlayed >= 1 && !stats.achievements.includes('first_game')) {
            achievements.push('first_game');
        }
        if (stats.totalGamesPlayed >= 10 && !stats.achievements.includes('veteran')) {
            achievements.push('veteran');
        }
        if (stats.totalGamesPlayed >= 100 && !stats.achievements.includes('centurion')) {
            achievements.push('centurion');
        }
        if (stats.totalGoals >= 50 && !stats.achievements.includes('goal_machine')) {
            achievements.push('goal_machine');
        }
        if (stats.bestWinStreak >= 5 && !stats.achievements.includes('on_fire')) {
            achievements.push('on_fire');
        }
        
        if (achievements.length > 0) {
            stats.achievements = [...new Set([...stats.achievements, ...achievements])];
            localStorage.setItem(this.statsKey, JSON.stringify(stats));
        }
    }

    formatPlayTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    }

    exportStats() {
        return JSON.stringify(this.getStats(), null, 2);
    }

    importStats(statsJson) {
        try {
            const stats = JSON.parse(statsJson);
            localStorage.setItem(this.statsKey, JSON.stringify(stats));
            return true;
        } catch (error) {
            console.error('Error importing stats:', error);
            return false;
        }
    }
}

// Create global instance
window.statsManager = new StatsManager();

export default StatsManager;