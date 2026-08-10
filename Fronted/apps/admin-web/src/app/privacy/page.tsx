'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPrivacyPage() {
  const router = useRouter();

  return (
    <div style={pageContainerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <button onClick={() => router.back()} style={backButtonStyle}>
            ← Volver
          </button>
          <h1 style={titleStyle}>Política de Privacidad para Administradores</h1>
        </div>

        <div style={contentStyle}>
          <p style={dateStyle}>Última actualización: 21 de Julio de 2026</p>

          <p style={paragraphStyle}>
            Esta política detalla el tratamiento de datos y los estándares de privacidad aplicables a las cuentas con privilegios administrativos en el <strong style={boldStyle}>Panel Web de BeeApp AI</strong>.
          </p>

          <h2 style={sectionTitleStyle}>1. Recopilación de Datos Administrativos</h2>
          <p style={paragraphStyle}>
            Para la operación segura del panel web recopilamos:{'\n'}
            - Identificación del administrador (número celular corporativo con código +57 y nombre).{'\n'}
            - Dirección IP, registros de sesión, fechas y horas de acceso.{'\n'}
            - Historial detallado de operaciones de supervisión y cambios en configuraciones.
          </p>

          <h2 style={sectionTitleStyle}>2. Propósito y Uso de la Información</h2>
          <p style={paragraphStyle}>
            Los datos de los administradores se procesan para:{'\n'}
            - Autenticación multifactor segura por SMS.{'\n'}
            - Auditoría de seguridad y trazabilidad de operaciones.{'\n'}
            - Prevención de fraudes o alteraciones no autorizadas en el ecosistema empresarial.
          </p>

          <h2 style={sectionTitleStyle}>3. Protección y Confidencialidad</h2>
          <p style={paragraphStyle}>
            Toda la comunicación entre el navegador del administrador y la infraestructura de BeeApp AI utiliza conexiones cifradas TLS 1.3 con almacenamiento de logs bajo estándares ISO 27001.
          </p>

          <h2 style={sectionTitleStyle}>4. Contacto de Privacidad</h2>
          <p style={paragraphStyle}>
            Para consultas de privacidad del equipo administrativo, comunícate con dpo@beeapp.ai.
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
