'use client';

import React, { useEffect, useState } from 'react';
import { Sliders, FileText, ShieldAlert, Save, CheckCircle, AlertCircle, HelpCircle, Link2, Mail } from 'lucide-react';
import { getAdminSettings, setAdminSetting } from '@beeapp/api-client';
import PlansSection from './PlansSection';

type ConfigTab = 'planes' | 'terminos' | 'privacidad' | 'soporte' | 'plataforma';

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<ConfigTab>('planes');
  const [saveFeedback, setSaveFeedback] = useState('');
  const [saveFeedbackIsError, setSaveFeedbackIsError] = useState(false);

  const [termsText, setTermsText] = useState('');
  const [privacyText, setPrivacyText] = useState('');

  // Support channel states
  const [supportEmail, setSupportEmail] = useState('');
  const [supportUrl, setSupportUrl] = useState('');
  const [channelType, setChannelType] = useState('');
  const [iosVersion, setIosVersion] = useState('1.0.0');
  const [androidVersion, setAndroidVersion] = useState('1.0.0');
  const [webVersion, setWebVersion] = useState('1.0.0');
  const [admobEnabled, setAdmobEnabled] = useState(false);
  const [admobFrequency, setAdmobFrequency] = useState('3');
  const [admobPlacements, setAdmobPlacements] = useState('chats,estados,beeservices');
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => {
    getAdminSettings()
      .then((settings) => {
        if (settings.terms) setTermsText(settings.terms);
        if (settings.privacy) setPrivacyText(settings.privacy);
        if (settings.support_email) setSupportEmail(settings.support_email);
        if (settings.support_url) setSupportUrl(settings.support_url);
        if (settings.support_channel) setChannelType(settings.support_channel);
        if (settings.ios_min_version) setIosVersion(settings.ios_min_version);
        if (settings.android_min_version) setAndroidVersion(settings.android_min_version);
        if (settings.web_min_version) setWebVersion(settings.web_min_version);
        setAdmobEnabled(settings.admob_enabled === 'true');
        if (settings.admob_frequency) setAdmobFrequency(settings.admob_frequency);
        if (settings.admob_placements) setAdmobPlacements(settings.admob_placements);
      })
      .catch((loadError: unknown) => {
        setSettingsError(loadError instanceof Error ? loadError.message : 'No fue posible cargar la configuración.');
      })
  }, []);

  const isUrlValid = supportUrl.startsWith('http://') || supportUrl.startsWith('https://');
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportEmail.trim());
  const canSaveSupport = isEmailValid && (supportUrl.trim() === '' || isUrlValid);

  const handleSave = async (tab: ConfigTab) => {
    const messages: Record<ConfigTab, string> = {
      planes: '¡Planes guardados exitosamente!',
      terminos: '¡Términos y condiciones guardados exitosamente!',
      privacidad: '¡Política de privacidad guardada exitosamente!',
      soporte: 'Configuración de soporte actualizada',
      plataforma: 'Versiones y publicidad guardadas',
    };
    try {
      if (tab === 'terminos') await setAdminSetting('terms', termsText);
      if (tab === 'privacidad') await setAdminSetting('privacy', privacyText);
      if (tab === 'soporte') {
        if (!isEmailValid) {
          setSaveFeedbackIsError(true);
          setSaveFeedback('Ingresa un correo de soporte válido.');
          return;
        }
        if (supportUrl.trim() !== '' && !isUrlValid) {
          setSaveFeedbackIsError(true);
          setSaveFeedback('Ingresa una URL válida que comience con http:// o https://');
          return;
        }
        await setAdminSetting('support_email', supportEmail.trim());
        await setAdminSetting('support_url', supportUrl.trim());
        await setAdminSetting('support_channel', channelType.trim());
      }
      if (tab === 'plataforma') {
        await setAdminSetting('ios_min_version', iosVersion.trim());
        await setAdminSetting('android_min_version', androidVersion.trim());
        await setAdminSetting('web_min_version', webVersion.trim());
        await setAdminSetting('admob_enabled', admobEnabled ? 'true' : 'false');
        await setAdminSetting('admob_frequency', admobFrequency.trim());
        await setAdminSetting('admob_placements', admobPlacements.trim());
      }
      setSaveFeedbackIsError(false);
      setSaveFeedback(messages[tab]);
    } catch (error) {
      setSaveFeedbackIsError(true);
      setSaveFeedback(error instanceof Error ? error.message : 'No fue posible guardar.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {settingsError ? <p className="page-toolbar-subtitle">{settingsError}</p> : null}
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
        <button
          onClick={() => setActiveTab('plataforma')}
          style={{
            ...tabButtonStyle,
            borderBottomColor: activeTab === 'plataforma' ? '#6025d2' : 'transparent',
            color: activeTab === 'plataforma' ? '#6025d2' : '#6C757D',
            fontWeight: activeTab === 'plataforma' ? '600' : '400',
          }}
        >
          <Sliders size={16} />
          <span>App y anuncios</span>
        </button>
      </div>

      {/* Save feedback indicator */}
      {saveFeedback && (
        <div style={saveFeedbackIsError ? errorToastStyle : toastStyle}>
          {saveFeedbackIsError ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
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
                El correo que guardes aquí es el destino de &apos;Contactar a Soporte&apos; en la aplicación móvil. Al tocarlo se abre el cliente de correo con ese destinatario.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
              <div className="form-field">
                <label className="form-field-label">Correo de soporte</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={16} color="#9EA5B1" style={{ position: 'absolute', left: '12px' }} />
                  <input
                    type="email"
                    className="form-field-input"
                    style={{
                      paddingLeft: '36px',
                      borderColor: !isEmailValid && supportEmail.trim() !== '' ? '#F44336' : '#E9ECEF',
                    }}
                    placeholder="soporte@buddy.ai"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    autoComplete="off"
                  />
                </div>
                {!isEmailValid && supportEmail.trim() !== '' && (
                  <p style={{ color: '#F44336', fontSize: '12px', margin: '4px 0 0 0' }}>
                    Ingresa un correo electrónico válido.
                  </p>
                )}
              </div>

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
                <p style={{ color: '#6C757D', fontSize: '12px', margin: '6px 0 0 0' }}>
                  Opcional. Este enlace sigue disponible como canal adicional en la web y no cambia el correo de la app móvil.
                </p>
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
                disabled={!canSaveSupport}
                className="confirm-dialog-btn-confirm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  opacity: !canSaveSupport ? 0.6 : 1,
                  cursor: !canSaveSupport ? 'not-allowed' : 'pointer',
                }}
              >
                <Save size={16} />
                <span>Guardar Configuración</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'plataforma' && (
          <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <span className="panel-card-title">Versiones mínimas y anuncios</span>
            <p className="form-hint">
              Las apps leen estos valores para pedir una actualización y para decidir si muestran anuncios. Este panel no conecta el SDK de AdMob.
            </p>
            <div className="plan-limits-grid">
              <div className="form-field">
                <label className="form-field-label">iOS</label>
                <input className="form-field-input" value={iosVersion} onChange={(event) => setIosVersion(event.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-field-label">Android</label>
                <input className="form-field-input" value={androidVersion} onChange={(event) => setAndroidVersion(event.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-field-label">Web</label>
                <input className="form-field-input" value={webVersion} onChange={(event) => setWebVersion(event.target.value)} />
              </div>
            </div>
            <div className="feature-toggle-row">
              <span className="feature-toggle-label">Anuncios AdMob encendidos</span>
              <button
                type="button"
                className={`toggle-switch ${admobEnabled ? 'on' : ''}`}
                onClick={() => setAdmobEnabled((current) => !current)}
              >
                <span className="toggle-switch-knob" />
              </button>
            </div>
            <div className="plan-limits-grid">
              <div className="form-field">
                <label className="form-field-label">Frecuencia</label>
                <input className="form-field-input" value={admobFrequency} onChange={(event) => setAdmobFrequency(event.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-field-label">Ubicaciones</label>
                <input className="form-field-input" value={admobPlacements} onChange={(event) => setAdmobPlacements(event.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="confirm-dialog-btn-confirm" type="button" onClick={() => void handleSave('plataforma')}>
                Guardar
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

const errorToastStyle: React.CSSProperties = {
  ...toastStyle,
  backgroundColor: '#F8D7DA',
  color: '#721C24',
  border: '1px solid #F5C6CB',
};
