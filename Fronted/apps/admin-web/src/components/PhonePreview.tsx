import Image from 'next/image';

interface PhonePreviewProps {
  title: string;
  message: string;
}

export default function PhonePreview({ title, message }: PhonePreviewProps) {
  return (
    <div className="phone-preview-frame">
      <div className="phone-preview-notch" />
      <div className="phone-preview-screen">
        <span className="phone-preview-time">9:41</span>
        <div className="phone-preview-notification">
          <Image src="/logo.png" alt="BeeApp" width={22} height={22} className="phone-preview-app-icon" />
          <div className="phone-preview-notification-body">
            <div className="phone-preview-notification-header">
              <span className="phone-preview-app-name">BeeApp AI</span>
              <span className="phone-preview-now">ahora</span>
            </div>
            <span className="phone-preview-title">{title || 'Título de la notificación'}</span>
            <span className="phone-preview-message">{message || 'El mensaje aparecerá aquí.'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
