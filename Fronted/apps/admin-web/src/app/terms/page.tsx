'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function AdminTermsPage() {
  const router = useRouter();

  return (
    <div style={pageContainerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <button onClick={() => router.back()} style={backButtonStyle}>
            ← Volver
          </button>
          <h1 style={titleStyle}>Términos y Condiciones de Administración</h1>
        </div>

        <div style={contentStyle}>
          <p style={dateStyle}>Última actualización: 21 de Julio de 2026</p>

          <p style={paragraphStyle}>
            El presente acuerdo rige el acceso y uso del <strong style={boldStyle}>Panel de Administración Web de BeeApp AI</strong>, reservado exclusivamente para administradores, supervisores y personal autorizado de la organización.
          </p>

          <h2 style={sectionTitleStyle}>1. Responsabilidad de la Cuenta Administrativa</h2>
          <p style={paragraphStyle}>
            - Las credenciales y mecanismos de verificación de 6 dígitos son estrictamente personales, confidenciales e intransferibles.{'\n'}
            - Toda acción realizada desde la consola de administración quedará registrada en las bitácoras de auditoría del sistema con fines de seguridad y control interno.
          </p>

          <h2 style={sectionTitleStyle}>2. Gestión de Datos e Información Sensible</h2>
          <p style={paragraphStyle}>
            Los administradores con acceso al panel se comprometen a:{'\n'}
            a) Manipular la información de los usuarios finales bajo estrictos criterios de confidencialidad y cumplimiento normativo.{'\n'}
            b) No exportar ni difundir bases de datos o reportes ejecutivos a personal no autorizado.{'\n'}
            c) Notificar de inmediato cualquier anomalía o brecha de seguridad detectada.
          </p>

          <h2 style={sectionTitleStyle}>3. Monitoreo y Auditoría</h2>
          <p style={paragraphStyle}>
            BeeApp AI monitorea el uso del panel web en tiempo real para prevenir abusos, accesos no autorizados o alteraciones indebidas de las políticas del sistema.
          </p>

          <h2 style={sectionTitleStyle}>4. Modificaciones y Suspensión</h2>
          <p style={paragraphStyle}>
            Nos reservamos el derecho de revocar o suspender privilegios administrativos en cualquier momento ante el incumplimiento de estas normas o decisiones organizacionales.
          </p>
        </div>
      </div>
    </div>
  );
}

const pageContainerStyle: React.CSSProperties = {
  minHeight: '100vh',
  backgroundColor: '#F8F9FC',
  padding: '40px 20px',
  display: 'flex',
  justifyContent: 'center',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '24px',
  padding: '40px',
  maxWidth: '800px',
  width: '100%',
  boxShadow: '0 12px 32px rgba(96, 37, 210, 0.06)',
  border: '1px solid #E9ECEF',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '32px',
  paddingBottom: '16px',
  borderBottom: '1px solid #F1F3F5',
};

const backButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#6025d2',
  fontSize: '15px',
  fontWeight: '400',
  cursor: 'pointer',
  marginRight: '20px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '22px',
  fontWeight: '600',
  color: '#1A1A2E',
  margin: 0,
};

const contentStyle: React.CSSProperties = {
  color: '#495057',
  lineHeight: '1.6',
  fontSize: '15px',
};

const dateStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#6C757D',
  marginBottom: '20px',
};

const paragraphStyle: React.CSSProperties = {
  marginBottom: '16px',
  whiteSpace: 'pre-line',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '17px',
  fontWeight: '600',
  color: '#1A1A2E',
  marginTop: '24px',
  marginBottom: '12px',
};

const boldStyle: React.CSSProperties = {
  fontWeight: '600',
  color: '#1A1A2E',
};
