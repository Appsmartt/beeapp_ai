import { UserPlus, CreditCard, XCircle, AlertTriangle, RefreshCcw } from 'lucide-react';
import type { Activity, ActivityType } from '@/mocks/types';
import { formatRelativeTime } from '@/utils/format';

const ACTIVITY_ICONS: Record<ActivityType, typeof UserPlus> = {
  registro: UserPlus,
  suscripcion: CreditCard,
  cancelacion: XCircle,
  alerta: AlertTriangle,
  actualizacion: RefreshCcw,
};

interface ActivityFeedProps {
  activities: Activity[];
  emptyMessage?: string;
}

export default function ActivityFeed({ activities, emptyMessage = 'Sin actividad reciente.' }: ActivityFeedProps) {
  if (activities.length === 0) {
    return <p className="activity-feed-empty">{emptyMessage}</p>;
  }

  return (
    <div className="activity-feed">
      {activities.map((activity) => {
        const Icon = ACTIVITY_ICONS[activity.tipo];
        return (
          <div key={activity.id} className="activity-feed-row">
            <div className={`activity-feed-icon-wrap activity-feed-icon-${activity.tipo}`}>
              <Icon size={15} />
            </div>
            <div className="activity-feed-text-col">
              <p className="activity-feed-description">
                {activity.descripcion}
                {activity.usuarioNombre && <span className="activity-feed-user"> · {activity.usuarioNombre}</span>}
              </p>
              <span className="activity-feed-time">{formatRelativeTime(activity.fecha)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
