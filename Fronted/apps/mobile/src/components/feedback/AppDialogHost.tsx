import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import AppDialogModal from './AppDialogModal';
import {
  registerAppDialogHandler,
} from './appAlert';
import type {
  AppDialogRequest,
} from './appDialogTypes';

export default function AppDialogHost() {
  const [queue, setQueue] = useState<AppDialogRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyIndex, setBusyIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    registerAppDialogHandler((request) => {
      setQueue((current) => [...current, request]);
    });

    return () => {
      registerAppDialogHandler(null);
    };
  }, []);

  const current = queue[0] || null;

  const dismiss = useCallback(() => {
    if (busy) {
      return;
    }

    setQueue((items) => items.slice(1));
  }, [busy]);

  const pressButton = useCallback((
    index: number,
  ) => {
    const request = queue[0];

    if (!request || busy) {
      return;
    }

    const button = request.buttons[index];

    if (!button) {
      return;
    }

    setBusy(true);
    setBusyIndex(index);

    void (async () => {
      try {
        await button.onPress?.();
      } finally {
        setBusy(false);
        setBusyIndex(null);
        setQueue((items) => (
          items[0]?.id === request.id
            ? items.slice(1)
            : items
        ));
      }
    })();
  }, [busy, queue]);

  return (
    <AppDialogModal
      request={current}
      busy={busy}
      busyIndex={busyIndex}
      onClose={dismiss}
      onPressButton={pressButton}
    />
  );
}
