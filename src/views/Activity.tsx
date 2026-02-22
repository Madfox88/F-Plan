import { ActivityFeed } from '../components/activity/ActivityFeed';
import './Activity.css';

export function Activity() {
  return (
    <div className="activity-view">
      <ActivityFeed showFilters showLoadMore limit={30} />
    </div>
  );
}
