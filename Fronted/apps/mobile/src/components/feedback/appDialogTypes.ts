export type AppDialogTone =
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export type AppDialogButtonStyle =
  | 'default'
  | 'cancel'
  | 'destructive';

export type AppDialogButton = {
  text?: string;
  style?: AppDialogButtonStyle;
  onPress?: () => void | Promise<void>;
};

export type AppDialogRequest = {
  id: string;
  title: string;
  message?: string;
  buttons: AppDialogButton[];
  tone: AppDialogTone;
};
