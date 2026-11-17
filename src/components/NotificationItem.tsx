import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface NotificationRecord {
  id: number;
  course_id: number | null;
  course_title?: string | null;
  message: string;
  message_key: string | null;
  message_params: string | null;
  read_status: number;
  created_at: string;
}

export function NotificationItem({
  notif,
  onMarkRead,
}: {
  notif: NotificationRecord;
  onMarkRead: (id: number) => void;
}) {
  const { t } = useTranslation();

  let renderedMessage = notif.message;
  if (notif.message_key) {
    try {
      const params = notif.message_params ? JSON.parse(notif.message_params) : {};
      const translatedKey = notif.message_key.replace(/^notif\./, 'notifMessages.');
      const candidate = t(translatedKey, params);
      if (typeof candidate === 'string' && candidate && candidate !== translatedKey) {
        renderedMessage = candidate;
      }
    } catch {
      renderedMessage = notif.message;
    }
  }

  return (
    <div
      className={`p-4 rounded-lg border transition-colors ${
        notif.read_status === 0
          ? 'bg-indigo-50/40 border-indigo-200'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {notif.course_title && (
              <>
                <span className="font-medium text-slate-700">{notif.course_title}</span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span className="font-mono tabular-nums">
              {new Date(notif.created_at).toLocaleDateString()}
            </span>
            {notif.read_status === 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-indigo-700">{t('learner.unreadBadge')}</span>
              </>
            )}
          </div>
          <p className="text-sm text-slate-800 leading-relaxed">{renderedMessage}</p>
        </div>

        {notif.read_status === 0 && (
          <button
            type="button"
            onClick={() => onMarkRead(notif.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            {t('learner.markRead')}
          </button>
        )}
      </div>
    </div>
  );
}
