'use client';

import React, { useState, useRef } from 'react';
import { User, Mail, Shield, Phone, AlertCircle, Camera, Check, RotateCcw } from 'lucide-react';

export default function AdminProfilePage() {
  // Reference initial values
  const initialValues = {
    nombre: 'Santiago Valencia',
    email: 'santiago@beeapp.ai',
    telefono: '+57 300 123 4567',
    photoUrl: null as string | null
  };

  const [nombre, setNombre] = useState(initialValues.nombre);
  const [email, setEmail] = useState(initialValues.email);
  const [telefono] = useState(initialValues.telefono);
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialValues.photoUrl);

  const [savedNombre, setSavedNombre] = useState(initialValues.nombre);
  const [savedEmail, setSavedEmail] = useState(initialValues.email);
  const [savedPhotoUrl, setSavedPhotoUrl] = useState<string | null>(initialValues.photoUrl);

  const [saveFeedback, setSaveFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if anything has been modified since last save
  const hasChanges = nombre !== savedNombre || email !== savedEmail || photoUrl !== savedPhotoUrl;

  // Real-time email validation
  const isEmailValid = email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('El nombre no puede estar vacío.');
      return;
    }
    if (!isEmailValid || !email.trim()) {
      alert('Ingresa un correo electrónico válido.');
      return;
    }

    setIsSaving(true);
    setSaveFeedback('');

    // Simulate server save
    setTimeout(() => {
      setSavedNombre(nombre);
      setSavedEmail(email);
      setSavedPhotoUrl(photoUrl);
      setIsSaving(false);
      setSaveFeedback('¡Perfil actualizado con éxito!');
      setTimeout(() => setSaveFeedback(''), 3000);
    }, 1000);
  };

  const handleDiscard = () => {
    setNombre(savedNombre);
    setEmail(savedEmail);
    setPhotoUrl(savedPhotoUrl);
  };

  // Get initials for avatar placeholder
  const getInitials = (nameStr: string) => {
    if (!nameStr) return 'AD';
    return nameStr
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '12px 0' }}>
      <form onSubmit={handleSave} className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header/Avatar Area with selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid #E9ECEF', paddingBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={avatarButtonStyle}
              title="Cambiar foto de perfil"
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt="Avatar"
                  style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={avatarPlaceholderStyle}>
                  {getInitials(nombre)}
                </div>
              )}
              <div style={cameraBadgeStyle}>
                <Camera size={14} color="#FFFFFF" />
              </div>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1A1A2E', margin: '0 0 4px 0' }}>
              {savedNombre}
            </h2>
            <span style={roleBadgeStyle}>
              <Shield size={12} />
              Administrador Principal
            </span>
          </div>
        </div>

        {/* Informative Banner */}
        <div style={bannerStyle}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', fontWeight: '400' }}>
            El número de teléfono está enlazado a las credenciales seguras de autenticación del administrador principal y no es modificable desde este módulo.
          </p>
        </div>

        {/* Save feedback indicator */}
        {saveFeedback && (
          <div style={toastStyle}>
            <Check size={16} />
            <span>{saveFeedback}</span>
          </div>
        )}

        {/* Profile Edit Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-field">
            <label className="form-field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={13} />
              Nombre Completo
            </label>
            <input
              className="form-field-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ingresa tu nombre"
              maxLength={50}
            />
          </div>

          <div className="form-field">
            <label className="form-field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={13} />
              Correo Electrónico
            </label>
            <input
              className={`form-field-input ${!isEmailValid ? 'error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              style={!isEmailValid ? { borderColor: '#F44336', backgroundColor: '#FFF5F5' } : {}}
            />
            {!isEmailValid && (
              <p style={{ color: '#F44336', fontSize: '11px', marginTop: '4px', margin: '4px 0 0 0' }}>
                Ingresa un formato de correo electrónico válido.
              </p>
            )}
          </div>

          <div className="form-field">
            <label className="form-field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={13} />
              Número de Teléfono (Asociado)
            </label>
            <input
              className="form-field-input"
              value={telefono}
              disabled
              style={{ backgroundColor: '#F8F9FC', color: '#ADB5BD', cursor: 'not-allowed' }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #E9ECEF', paddingTop: '20px', marginTop: '8px' }}>
          {hasChanges && (
            <button
              type="button"
              onClick={handleDiscard}
              style={discardButtonStyle}
              disabled={isSaving}
            >
              <RotateCcw size={15} />
              <span>Descartar cambios</span>
            </button>
          )}
          <button
            type="submit"
            className="confirm-dialog-btn-confirm"
            disabled={!hasChanges || !isEmailValid || isSaving || !nombre.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              opacity: (!hasChanges || !isEmailValid || isSaving || !nombre.trim()) ? 0.6 : 1,
              cursor: (!hasChanges || !isEmailValid || isSaving || !nombre.trim()) ? 'not-allowed' : 'pointer'
            }}
          >
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Inline Styles
const avatarButtonStyle: React.CSSProperties = {
  position: 'relative',
  border: 'none',
  background: 'none',
  padding: 0,
  cursor: 'pointer',
  outline: 'none',
};

const avatarPlaceholderStyle: React.CSSProperties = {
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  backgroundColor: '#6025d2',
  color: '#FFFFFF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '28px',
  fontWeight: '400',
  boxShadow: '0 4px 12px rgba(96, 37, 210, 0.15)',
};

const cameraBadgeStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 0,
  right: 0,
  backgroundColor: '#5B2CD9',
  border: '2px solid #FFFFFF',
  borderRadius: '50%',
  width: '26px',
  height: '26px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
};

const roleBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  backgroundColor: '#F3EDFC',
  color: '#6025d2',
  fontSize: '12px',
  fontWeight: '400',
  padding: '4px 10px',
  borderRadius: '20px',
};

const bannerStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  backgroundColor: '#FFF9DB',
  border: '1px solid #FFF3BF',
  borderRadius: '12px',
  padding: '14px 16px',
  color: '#8A6D3B',
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
};

const discardButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  border: '1.5px solid #E9ECEF',
  borderRadius: '12px',
  backgroundColor: '#FFFFFF',
  color: '#495057',
  padding: '10px 20px',
  fontSize: '14px',
  fontWeight: '400',
  cursor: 'pointer',
  transition: 'all 0.2s',
};
