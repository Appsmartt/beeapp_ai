'use client';

import React, { useState } from 'react';
import { Sliders, FileText, ShieldAlert, Save, CheckCircle, HelpCircle, Link2 } from 'lucide-react';
import PlansSection from './PlansSection';

type ConfigTab = 'planes' | 'terminos' | 'privacidad' | 'soporte';

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('planes');
  const [saveFeedback, setSaveFeedback] = useState('');

  // Mock terms and privacy text states
  const [termsText, setTermsText] = useState(
    `TÉRMINOS Y CONDICIONES DE USO — BEEAPP AI

1. ACEPTACIÓN DE LOS TÉRMINOS
Al acceder y utilizar la plataforma BeeApp AI (incluyendo aplicaciones móviles, web y servicios asociados), usted acepta quedar vinculado por estos Términos y Condiciones de Uso, todas las leyes y regulaciones aplicables.

2. LICENCIA DE USO Y RESTRICCIONES
Se concede autorización para utilizar los servicios de BeeApp AI bajo la modalidad del plan suscrito (Gratuito o Plus). Esta es la concesión de una licencia de uso personal, no transferible y revocable. No está permitido:
- Modificar o copiar los materiales ni el código base de la plataforma.
- Utilizar los servicios de inteligencia artificial para actividades ilícitas.
- Intentar descompilar o realizar ingeniería inversa de cualquier software contenido en BeeApp AI.

3. LIMITACIÓN DE RESPONSABILIDAD
Los servicios y el asistente de inteligencia artificial se proporcionan "tal cual". BeeApp AI no ofrece garantías, explícitas o implícitas, sobre la precisión de las respuestas del asistente o la disponibilidad permanente de las integraciones externas.`
  );

  const [privacyText, setPrivacyText] = useState(
    `POLÍTICA DE PRIVACIDAD — BEEAPP AI

Última actualización: Julio 2026

1. INFORMACIÓN QUE RECOPILAMOS
Para proveer el ecosistema inteligente de BeeApp AI, recopilamos la siguiente información estrictamente necesaria:
- Información de perfil básico: Nombre, dirección, correo electrónico y número celular verificado.
- Datos de integración (opcional): Calendario, contactos y buzón de correo, procesados exclusivamente bajo demanda del usuario.

2. PRIVACIDAD DE LOS DATOS Y ACCESO ADMINISTRATIVO
De acuerdo con las estrictas regulaciones de privacidad de la plataforma:
- Los administradores de BeeApp AI NO tienen acceso bajo ninguna circunstancia a los correos electrónicos, archivos, notas, ni transcripciones de chats o videollamadas de los usuarios finales.
- Los datos de integraciones Gmail o Outlook se sincronizan directamente a nivel de cliente y se resguardan de forma encriptada.

3. COMPARTICIÓN DE DATOS
No vendemos ni alquilamos datos personales a terceros. Los datos de procesamiento de IA se transmiten de manera segura a través de túneles encriptados hacia los modelos de lenguaje aprobados.`
  );

  // Support channel states
  const [supportUrl, setSupportUrl] = useState('https://wa.me/573001234567');
  const [channelType, setChannelType] = useState('WhatsApp');

  const isUrlValid = supportUrl.startsWith('http://') || supportUrl.startsWith('https://');

  const handleSave = (tab: ConfigTab) => {
    const messages: Record<ConfigTab, string> = {
      planes: '¡Planes guardados exitosamente!',
      terminos: '¡Términos y condiciones guardados exitosamente!',
      privacidad: '¡Política de privacidad guardada exitosamente!',
      soporte: 'Configuración de soporte actualizada',
    };
    setSaveFeedback(messages[tab]);
    setTimeout(() => {
      setSaveFeedback('');
    }, 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Tab Selector */}
      <div style={tabBarContainerStyle}>
        <button
          onClick={() => setActiveTab('planes')}
          style={{
            ...tabButtonStyle,
            borderBottomColor: activeTab === 'planes' ? '#6025d2' : 'transparent',
            color: activeTab === 'planes' ? '#6025d2' : '#6C757D',
            fontWeight: activeTab === 'planes' ? '600' : '400',
          }}
        >
          <Sliders size={16} />
          <span>Planes de Suscripción</span>
        </button>
        <button
          onClick={() => setActiveTab('terminos')}
          style={{
            ...tabButtonStyle,
            borderBottomColor: activeTab === 'terminos' ? '#6025d2' : 'transparent',
            color: activeTab === 'terminos' ? '#6025d2' : '#6C757D',
            fontWeight: activeTab === 'terminos' ? '600' : '400',
          }}
        >
          <FileText size={16} />
          <span>Términos y Condiciones</span>
        </button>
        <button
          onClick={() => setActiveTab('privacidad')}
          style={{
            ...tabButtonStyle,
            borderBottomColor: activeTab === 'privacidad' ? '#6025d2' : 'transparent',
            color: activeTab === 'privacidad' ? '#6025d2' : '#6C757D',
            fontWeight: activeTab === 'privacidad' ? '600' : '400',
          }}
        >
          <ShieldAlert size={16} />
          <span>Política de Privacidad</span>
        </button>
        <button
          onClick={() => setActiveTab('soporte')}
          style={{
            ...tabButtonStyle,
            borderBottomColor: activeTab === 'soporte' ? '#6025d2' : 'transparent',
            color: activeTab === 'soporte' ? '#6025d2' : '#6C757D',
            fontWeight: activeTab === 'soporte' ? '600' : '400',
          }}
        >
          <HelpCircle size={16} />
          <span>Soporte</span>
        </button>
      </div>

      {/* Save feedback indicator */}
      {saveFeedback && (
        <div style={toastStyle}>
          <CheckCircle size={16} />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* Tab Contents */}
      <div className="tab-content" style={{ marginTop: '4px' }}>
        {activeTab === 'planes' && <PlansSection />}

        {activeTab === 'terminos' && (
          <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span className="panel-card-title">Editor de Términos y Condiciones</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6C757D' }}>
                Modifique los términos legales visibles para los usuarios al registrarse y en la sección legal de la aplicación móvil.
              </p>
            </div>
            <textarea
              className="form-field-textarea"
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: '1.6',
                padding: '16px',
                height: '350px',
                border: '1.5px solid #E9ECEF',
                borderRadius: '12px',
                outline: 'none',
              }}
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleSave('terminos')}
                className="confirm-dialog-btn-confirm"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
              >
                <Save size={16} />
                <span>Guardar Términos</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'privacidad' && (
          <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span className="panel-card-title">Editor de Política de Privacidad</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6C757D' }}>
                Modifique la declaración de tratamiento de datos personales y garantías de privacidad expuesta en el registro de las apps.
              </p>
            </div>
            <textarea
              className="form-field-textarea"
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: '1.6',
                padding: '16px',
                height: '350px',
                border: '1.5px solid #E9ECEF',
                borderRadius: '12px',
                outline: 'none',
              }}
              value={privacyText}
              onChange={(e) => setPrivacyText(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleSave('privacidad')}
                className="confirm-dialog-btn-confirm"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
              >
                <Save size={16} />
                <span>Guardar Política</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'soporte' && (
          <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <span className="panel-card-title">Canal de Soporte</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6C757D' }}>
                Configura el enlace al que serán dirigidos los usuarios cuando toquen 'Soporte' en la aplicación.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
              <div className="form-field">
                <label className="form-field-label">Enlace de soporte</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Link2 size={16} color="#9EA5B1" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type="text"
                    className="form-field-input"
                    style={{
                      paddingLeft: '36px',
                      borderColor: !isUrlValid && supportUrl.trim() !== '' ? '#F44336' : '#E9ECEF',
                    }}
                    placeholder="https://wa.me/573001234567"
                    value={supportUrl}
                    onChange={(e) => setSupportUrl(e.target.value)}
                  />
                </div>
                {!isUrlValid && supportUrl.trim() !== '' && (
                  <p style={{ color: '#F44336', fontSize: '12px', marginTop: '4px', margin: '4px 0 0 0' }}>
                    Ingresa una URL válida que comience con http:// o https://
                  </p>
                )}
              </div>

              <div className="form-field">
                <label className="form-field-label">Tipo de canal</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  {['WhatsApp', 'Sitio web', 'Correo', 'Otro'].map((type) => {
                    const isSelected = channelType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setChannelType(type)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '20px',
                          border: '1.5px solid',
                          borderColor: isSelected ? '#6025d2' : '#E9ECEF',
                          backgroundColor: isSelected ? '#F3EDFC' : '#FFFFFF',
                          color: isSelected ? '#6025d2' : '#495057',
                          fontSize: '13px',
                          fontWeight: '400',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          outline: 'none',
                        }}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #E9ECEF', paddingTop: '16px' }}>
              <button
                onClick={() => handleSave('soporte')}
                disabled={!isUrlValid || supportUrl.trim() === ''}
                className="confirm-dialog-btn-confirm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  opacity: (!isUrlValid || supportUrl.trim() === '') ? 0.6 : 1,
                  cursor: (!isUrlValid || supportUrl.trim() === '') ? 'not-allowed' : 'pointer',
                }}
              >
                <Save size={16} />
                <span>Guardar Configuración</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Styling components
const tabBarContainerStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #E9ECEF',
  gap: '24px',
  paddingBottom: '2px',
};

const tabButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  background: 'none',
  border: 'none',
  borderBottom: '2.5px solid transparent',
  padding: '10px 4px 12px 4px',
  cursor: 'pointer',
  fontSize: '15px',
  transition: 'all 0.2s',
  outline: 'none',
};

const toastStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: '#D4EDDA',
  color: '#155724',
  border: '1px solid #C3E6CB',
  borderRadius: '8px',
  padding: '10px 16px',
  fontSize: '13px',
  fontWeight: '400',
  alignSelf: 'flex-start',
  animation: 'fadeIn 0.3s ease-out',
};
