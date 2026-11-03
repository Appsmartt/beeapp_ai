import type {
  AppDialogButton,
  AppDialogRequest,
  AppDialogTone,
} from './appDialogTypes';

type DialogHandler = (request: AppDialogRequest) => void;

let handler: DialogHandler | null = null;
const pending: AppDialogRequest[] = [];
let sequence = 0;

export function registerAppDialogHandler(
  next: DialogHandler | null,
): void {
  handler = next;

  if (!handler) {
    return;
  }

  while (pending.length > 0) {
    const request = pending.shift();

    if (request) {
      handler(request);
    }
  }
}

function inferTone(
  title: string,
  buttons: AppDialogButton[],
): AppDialogTone {
  if (buttons.some((button) => button.style === 'destructive')) {
    return 'warning';
  }

  if (
    /guardad|actualiz|éxito|exito|reactivad|mejorado|protegido|borr[eé]/i
      .test(title)
  ) {
    return 'success';
  }

  if (
    /no fue posible|no se pudo|error|expir[oó]|requerid|fall/i
      .test(title)
  ) {
    return 'error';
  }

  return 'info';
}

export function appAlert(
  title: string,
  message?: string,
  buttons?: AppDialogButton[],
): void {
  const resolvedButtons = buttons && buttons.length > 0
    ? buttons
    : [{
      text: 'Entendido',
      style: 'default' as const,
    }];

  const request: AppDialogRequest = {
    id: `dialog-${sequence += 1}`,
    title,
    message,
    buttons: resolvedButtons,
    tone: inferTone(title, resolvedButtons),
  };

  if (handler) {
    handler(request);
    return;
  }

  pending.push(request);
}
