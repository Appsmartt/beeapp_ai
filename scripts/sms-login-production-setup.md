# Login por SMS en producción (Twilio + Supabase)

Buddy AI envía OTP con **Supabase Auth** → **Twilio**. El error **21608** indica cuenta Twilio en trial o sin **Primary Customer Profile** aprobado en Trust Hub.

Proyecto Supabase: `elwnmmznlqihruveqlye`  
URL: https://elwnmmznlqihruveqlye.supabase.co

## 1. Twilio: cuenta de pago (quitar trial)

1. Entra a https://console.twilio.com/
2. **Billing** → **Upgrade account** / agrega tarjeta y saldo.
3. Verifica con el script (abajo): el campo `type` debe ser **Full**, no **Trial**.

## 2. Twilio: Primary Customer Profile (Trust Hub)

1. **Trust Hub** → **Customer profiles** → **Create** → **Primary Customer Profile**.
2. Completa datos legales de la empresa (Appsmartt / Buddy AI) y documentos solicitados.
3. Envía a revisión. La aprobación puede tardar horas o días.
4. Enlace directo (ajusta si tu región difiere):  
   https://console.twilio.com/us1/trusthub/compliance-profiles/primary

Mientras esperas aprobación, para pruebas internas:

- **Phone Numbers** → **Verified Caller IDs** → agrega cada celular del equipo, **o**
- Supabase **Auth** → **Phone** → **Test phone numbers** (OTP fijo sin SMS real).

## 3. Twilio: Colombia + remitente

1. **Messaging** → **Settings** → **Geo permissions** → habilita **Colombia (CO)**.
2. **Messaging** → **Services** → **Create Messaging Service**.
3. Agrega al menos un remitente (número Twilio con SMS o remitente alfanumérico permitido en CO).
4. Copia el **Messaging Service SID** (`MG...`).

## 4. Supabase: proveedor Phone

1. Dashboard: https://supabase.com/dashboard/project/elwnmmznlqihruveqlye/auth/providers
2. Abre **Phone** y confirma:
   - Proveedor **Twilio**
   - **Twilio Account SID** (`AC...`)
   - **Twilio Auth Token** (rotar si alguna vez se expuso)
   - **Twilio Message Service SID** (`MG...`) — recomendado en producción
3. Revisa **Auth** → **Rate limits** (OTP por hora) y tiempo de expiración del código.
4. Guarda cambios.

## 5. Probar

1. En la app: **Inicia sesión** → **Mensaje SMS** → número colombiano **no** verificado en Twilio.
2. Debe llegar el SMS y permitir verificar el código.
3. Si falla, ejecuta `node scripts/verify-sms-production-readiness.mjs` con credenciales Twilio en variables de entorno (ver script).

## Referencias

- Twilio error 21608: https://www.twilio.com/docs/errors/21608
- Supabase Phone Auth (Twilio): https://supabase.com/docs/guides/auth/phone-login?showSmsProvider=Twilio
