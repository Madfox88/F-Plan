import './Dashboard.css';

export function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard-card glass">
        <h3>Today's Schedule</h3>
        <p className="text-secondary">No tasks due today</p>
      </div>

      <div className="dashboard-card glass">
        <h3>Goal Progress</h3>
        <p className="text-secondary">No goals linked yet</p>
      </div>

      <div className="dashboard-card glass">
        <h3>Productivity Stats</h3>
        <div className="stat-item">
          <span className="stat-label">Completed Tasks (7d)</span>
          <span className="stat-value">0</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Completion Rate</span>
          <span className="stat-value">0%</span>
        </div>
      </div>
    </div>
  );
}
