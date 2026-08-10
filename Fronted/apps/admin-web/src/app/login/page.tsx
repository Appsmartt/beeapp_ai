'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AnimatedLogo from '../../components/AnimatedLogo';
import { COUNTRIES, Country } from '../../mocks/countries';

export default function AdminLoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 7 || cleaned.length > 15) {
      setError('Ingresa un número celular válido.');
      return;
    }
    setError('');
    router.push(`/verify?phone=${encodeURIComponent(cleaned)}&dialCode=${encodeURIComponent(selectedCountry.dialCode)}&flag=${encodeURIComponent(selectedCountry.flag)}`);
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery)
  );

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Top Logo (AnimatedLogo, plays once 2.5s) */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <AnimatedLogo size={80} showText={false} autoStopAfter={2500} />
        </div>
        <h1 style={titleStyle}>BeeApp AI</h1>
        <p style={{ textAlign: 'center', color: '#6C757D', fontSize: '14px', marginBottom: '28px', marginTop: '-4px' }}>
          Acceso Personal Administrativo
        </p>

        <form onSubmit={handleContinue}>
          <div style={inputGroupStyle}>
            <div style={phoneRowStyle}>
              {/* Country Code Dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={badgeStyle}
                >
                  <span style={{ marginRight: '6px', fontSize: '16px' }}>{selectedCountry.flag}</span>
                  <span style={{ fontWeight: '400', fontSize: '15px', color: '#1A1A2E' }}>{selectedCountry.dialCode}</span>
                </button>

                {dropdownOpen && (
                  <>
                    <div style={backdropStyle} onClick={() => setDropdownOpen(false)} />
                    <div style={dropdownContainerStyle}>
                      <input
                        type="text"
                        placeholder="Buscar país o código..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={dropdownSearchStyle}
                        autoFocus
                      />
                      <div style={dropdownListStyle}>
                        {filteredCountries.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(c);
                              setDropdownOpen(false);
                              setSearchQuery('');
                            }}
                            style={dropdownItemStyle}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F3F5')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <span style={{ marginRight: '10px', fontSize: '18px' }}>{c.flag}</span>
                            <span style={{ flex: 1, textAlign: 'left', fontWeight: '400', color: '#1A1A2E', fontSize: '13px' }}>{c.name}</span>
                            <span style={{ fontWeight: '400', color: '#6025d2', fontSize: '13px' }}>{c.dialCode}</span>
                          </button>
                        ))}
                        {filteredCountries.length === 0 && (
                          <p style={{ padding: '8px', fontSize: '12px', color: '#ADB5BD', textAlign: 'center', margin: 0 }}>
                            Sin resultados
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Phone number input */}
              <input
                type="tel"
                placeholder="300 000 0000"
                maxLength={15}
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value.replace(/\D/g, ''));
                  if (error) setError('');
                }}
                style={inputStyle}
              />
            </div>
            {error && <p style={errorStyle}>{error}</p>}
          </div>

          <button type="submit" style={buttonStyle}>
            Continuar
          </button>
        </form>

        {/* Footer Legal */}
        <div style={footerStyle}>
          <p style={{ fontSize: '12px', color: '#ADB5BD', marginBottom: '6px' }}>
            Acceso exclusivo para personal administrativo autorizado
          </p>
          <div>
            <Link href="/terms" style={linkStyle}>
              Términos y Condiciones
            </Link>
            <span style={{ margin: '0 8px', color: '#ADB5BD' }}>•</span>
            <Link href="/privacy" style={linkStyle}>
              Política de Privacidad
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline responsive styling for web admin login
const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  width: '100vw',
  backgroundColor: '#F8F9FC',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '24px',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '24px',
  padding: '40px 32px',
  width: '100%',
  maxWidth: '460px',
  boxShadow: '0 12px 32px rgba(96, 37, 210, 0.08)',
  border: '1px solid #E9ECEF',
  display: 'flex',
  flexDirection: 'column',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#1A1A2E',
  textAlign: 'center',
  marginBottom: '8px',
};

const inputGroupStyle: React.CSSProperties = {
  marginBottom: '24px',
};

const phoneRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  border: '1.5px solid #E9ECEF',
  borderRadius: '12px',
  padding: '6px 12px',
};

const badgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#F1F3F5',
  padding: '8px 12px',
  borderRadius: '8px',
  marginRight: '10px',
  border: 'none',
  cursor: 'pointer',
};

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 90,
  backgroundColor: 'transparent',
};

const dropdownContainerStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  width: '280px',
  backgroundColor: '#FFFFFF',
  border: '1px solid #E9ECEF',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(26, 26, 46, 0.12)',
  padding: '12px',
  zIndex: 100,
  marginTop: '6px',
};

const dropdownSearchStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1.5px solid #E9ECEF',
  fontSize: '13px',
  outline: 'none',
  marginBottom: '10px',
  color: '#1A1A2E',
  boxSizing: 'border-box',
};

const dropdownListStyle: React.CSSProperties = {
  maxHeight: '180px',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const dropdownItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 10px',
  border: 'none',
  backgroundColor: 'transparent',
  borderRadius: '6px',
  cursor: 'pointer',
  width: '100%',
  transition: 'background-color 0.2s',
  boxSizing: 'border-box',
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  outline: 'none',
  fontSize: '18px',
  fontWeight: '400',
  color: '#1A1A2E',
  letterSpacing: '1px',
  backgroundColor: 'transparent',
};

const errorStyle: React.CSSProperties = {
  color: '#F44336',
  fontSize: '12px',
  marginTop: '8px',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#6025d2',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: '12px',
  padding: '16px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  boxShadow: '0 6px 16px rgba(96, 37, 210, 0.25)',
  transition: 'all 0.2s ease',
};

const footerStyle: React.CSSProperties = {
  marginTop: '32px',
  textAlign: 'center',
};

const linkStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: '400',
  color: '#6025d2',
  textDecoration: 'none',
};
