#!/usr/bin/env node
/**
 * Comprueba preparación de Twilio para SMS OTP en producción.
 * No usa secretos del repo; lee TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN del entorno.
 *
 * Uso (PowerShell):
 *   $env:TWILIO_ACCOUNT_SID="AC..."
 *   $env:TWILIO_AUTH_TOKEN="..."
 *   node scripts/verify-sms-production-readiness.mjs
 */

const SUPABASE_PROJECT_REF = 'elwnmmznlqihruveqlye';
const SUPABASE_AUTH_PHONE_URL =
  `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/auth/providers`;

const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
const token = process.env.TWILIO_AUTH_TOKEN?.trim();

function basicAuthHeader(accountSid, authToken) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
}

async function twilioGet(path, accountSid, authToken) {
  const url = `https://api.twilio.com${path}`;
  const response = await fetch(url, {
    headers: { Authorization: basicAuthHeader(accountSid, authToken) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Twilio HTTP ${response.status} ${path}`);
  }
  return body;
}

async function twilioFetchMessaging(path, accountSid, authToken) {
  const url = `https://messaging.twilio.com${path}`;
  const response = await fetch(url, {
    headers: { Authorization: basicAuthHeader(accountSid, authToken) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Twilio Messaging HTTP ${response.status}`);
  }
  return body;
}

function printChecklist() {
  console.log('\n--- Checklist manual (Twilio + Supabase) ---');
  console.log('Guía: scripts/sms-login-production-setup.md');
  console.log(`Supabase Phone provider: ${SUPABASE_AUTH_PHONE_URL}`);
  console.log([
    '[ ] Cuenta Twilio Full (no Trial)',
    '[ ] Primary Customer Profile enviado/aprobado en Trust Hub',
    '[ ] Geo permissions: Colombia habilitada',
    '[ ] Messaging Service (MG...) con remitente SMS',
    '[ ] Supabase Auth > Phone: SID, token y Message Service SID',
  ].join('\n'));
}

async function main() {
  printChecklist();

  if (!sid || !token) {
    console.log(
      '\nSin TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN en el entorno.',
    );
    console.log(
      'Configura las variables y vuelve a ejecutar para validación automática.',
    );
    process.exit(0);
  }

  console.log('\n--- Validación Twilio (API) ---');

  const account = await twilioGet(
    `/2010-04-01/Accounts/${sid}.json`,
    sid,
    token,
  );
  const accountType = account.type || 'unknown';
  const isTrial = accountType === 'Trial';
  console.log(`Cuenta: ${account.friendly_name || sid}`);
  console.log(`Tipo: ${accountType}${isTrial ? '  ⚠ Upgrade requerido para producción' : '  ✓'}`);

  const services = await twilioFetchMessaging(
    '/v1/Services?PageSize=20',
    sid,
    token,
  );
  const serviceList = services.services || [];
  console.log(`Messaging Services: ${serviceList.length}`);
  serviceList.slice(0, 5).forEach((service) => {
    console.log(`  - ${service.sid}  ${service.friendly_name || '(sin nombre)'}`);
  });
  if (serviceList.length === 0) {
    console.log('  ⚠ Crea un Messaging Service y úsalo en Supabase Phone provider.');
  }

  try {
    const geo = await twilioFetchMessaging(
      '/v1/GeoPermissions/Countries/CO',
      sid,
      token,
    );
    const enabled = geo.enabled === true;
    console.log(`Colombia (CO): ${enabled ? 'habilitada ✓' : 'deshabilitada ⚠'}`);
    if (!enabled) {
      console.log(
        '  Habilita CO en Messaging > Settings > Geo permissions.',
      );
    }
  } catch (error) {
    console.log(`No se pudo leer permiso CO: ${error.message}`);
  }

  console.log('\nTrust Hub: revisa en consola que el Primary Profile esté Approved.');
  console.log('https://console.twilio.com/us1/trusthub/compliance-profiles/primary');

  if (isTrial) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
