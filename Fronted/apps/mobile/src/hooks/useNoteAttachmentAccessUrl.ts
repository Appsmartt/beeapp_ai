import {
  useEffect,
  useState,
} from 'react';
import {
  getNoteAttachmentAccess,
} from '@beeapp/api-client';

import {
  getValidSessionCredentials,
} from '../services/authSession';

export function useNoteAttachmentAccessUrl(
  noteId: string | undefined,
  attachmentId: string | undefined,
) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!noteId || !attachmentId) {
      setUrl(null);
      setLoading(false);
      setFailed(false);
      return;
    }

    let cancelled = false;

    setLoading(true);
    setFailed(false);

    void (async () => {
      try {
        const auth =
          await getValidSessionCredentials();

        if (!auth) {
          throw new Error('Sin sesión');
        }

        const response = await getNoteAttachmentAccess(
          auth,
          noteId,
          attachmentId,
          false,
        );

        if (!cancelled) {
          setUrl(response.url || null);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
          setUrl(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [attachmentId, noteId]);

  return {
    url,
    loading,
    failed,
  };
}
