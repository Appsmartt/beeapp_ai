'use client';

export function TermsPanel() {
  return (
    <div className="space-y-4 text-xs text-neutral-700 font-normal leading-relaxed select-none">
      <div className="border-b border-neutral-100 pb-2">
        <span className="text-xs font-semibold text-neutral-900 block">Términos y Condiciones</span>
        <span className="text-[11px] text-neutral-500">Última actualización: 22 de Julio, 2026</span>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-xs text-neutral-900">1. Aceptación de los Términos</h4>
          <p className="mt-1 text-neutral-600">
            Al descargar, instalar o utilizar BeeApp AI, usted acepta quedar sujeto a estos Términos y Condiciones de Uso. Si no está de acuerdo con alguna parte de los términos descritos aquí, no debe acceder ni utilizar ninguno de nuestros servicios.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-xs text-neutral-900">2. Descripción del Servicio</h4>
          <p className="mt-1 text-neutral-600">
            BeeApp AI provee una plataforma móvil y web de comunicación corporativa y productividad laboral. La herramienta facilita la mensajería interna, la colaboración por canales, la gestión de chats grupales y el uso de asistentes inteligentes basados en IA.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-xs text-neutral-900">3. Cuenta de Usuario y Registro</h4>
          <p className="mt-1 text-neutral-600">
            Para registrarse, debe proveer un número de teléfono celular activo de Colombia. Usted es el único responsable de la seguridad de su código OTP de verificación y de restringir el acceso a su dispositivo para proteger su cuenta.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-xs text-neutral-900">4. Propiedad Intelectual</h4>
          <p className="mt-1 text-neutral-600">
            Toda la tecnología, marcas, código de programación, interfaces gráficas, logotipos y base de datos de BeeApp AI son propiedad exclusiva de la empresa y están protegidos por las leyes locales e internacionales de propiedad intelectual.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-xs text-neutral-900">5. Limitación de Responsabilidad</h4>
          <p className="mt-1 text-neutral-600">
            El servicio se proporciona &quot;tal cual&quot; y &quot;según disponibilidad&quot;. No garantizamos que el funcionamiento de la plataforma sea 100% ininterrumpido o libre de errores de red. No nos hacemos responsables de pérdidas financieras o de información que ocurran por incidentes ajenos a nuestro control de infraestructura.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-xs text-neutral-900">6. Ley Aplicable y Jurisdicción</h4>
          <p className="mt-1 text-neutral-600">
            Estos términos se rigen por las leyes de la República de Colombia. Cualquier disputa derivada del uso del servicio se resolverá ante los tribunales competentes de este país.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-xs text-neutral-900">7. Contacto</h4>
          <p className="mt-1 text-neutral-600">
            Para soporte, sugerencias o aclaraciones legales, puede escribirnos a soporte@beeapp.ai o consultar directamente con el administrador asignado por su empresa.
          </p>
        </div>
      </div>

      <div className="pt-3 border-t border-neutral-100 text-center">
        <p className="text-[11px] text-neutral-500 font-normal">
          Al hacer uso de la plataforma BeeApp AI, confirmas que aceptas íntegramente estos términos de uso.
        </p>
      </div>
    </div>
  );
}

export function PrivacyPanel() {
  return (
    <div className="space-y-4 text-xs text-neutral-700 font-normal leading-relaxed select-none">
      <div className="border-b border-neutral-100 pb-2">
        <span className="text-xs font-semibold text-neutral-900 block">Política de Privacidad</span>
        <span className="text-[11px] text-neutral-500">Última actualización: 22 de Julio, 2026</span>
      </div>

      <div className="space-y-3">
        <div>
          <h4 className="font-semibold text-xs text-neutral-900">1. Información que Recopilamos</h4>
          <p className="mt-1 text-neutral-600">
            Para prestar nuestros servicios, recopilamos la siguiente información técnica y personal:
          </p>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-neutral-600 pl-1">
            <li>Número de teléfono celular utilizado para el registro.</li>
            <li>Datos de perfil opcionales (nombre, foto de perfil, cargo).</li>
            <li>Contenido de mensajes, imágenes y archivos compartidos voluntariamente.</li>
            <li>Datos de diagnóstico e información de uso del dispositivo (modelo, SO, IP).</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-xs text-neutral-900">2. Uso de la Información</h4>
          <p className="mt-1 text-neutral-600">
            La información recopilada se utiliza exclusivamente para:
          </p>
          <ul className="list-disc list-inside mt-1 space-y-0.5 text-neutral-600 pl-1">
            <li>Proveer, operar y dar mantenimiento a los chats de comunicación corporativa.</li>
            <li>Enviar notificaciones de seguridad y códigos OTP de acceso.</li>
            <li>Optimizar modelos internos de IA para mejorar tu productividad laboral.</li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-xs text-neutral-900">3. Almacenamiento y Seguridad</h4>
          <p className="mt-1 text-neutral-600">
            Toda la información se transmite mediante protocolos HTTPS/TLS y se almacena utilizando cifrado en reposo (AES-256). Implementamos medidas técnicas robustas para prevenir accesos no autorizados.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-xs text-neutral-900">4. Compartición de Datos y Terceros</h4>
          <p className="mt-1 text-neutral-600">
            No vendemos, alquilamos ni comercializamos sus datos personales con terceras partes bajo ningún concepto. Los datos solo se compartirán con proveedores esenciales de infraestructura en la nube bajo estrictas cláusulas de confidencialidad.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-xs text-neutral-900">5. Derechos del Usuario (ARCO)</h4>
          <p className="mt-1 text-neutral-600">
            Como titular de los datos en Colombia (bajo la Ley 1581 de 2012), usted tiene derecho a conocer, actualizar, rectificar y solicitar la eliminación de su información personal escribiendo a privacidad@beeapp.ai.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-xs text-neutral-900">6. Cambios a esta Política</h4>
          <p className="mt-1 text-neutral-600">
            Podemos actualizar nuestra Política de Privacidad periódicamente. Le notificaremos cualquier cambio mediante alertas internas en la plataforma o por correo electrónico.
          </p>
        </div>
      </div>
    </div>
  );
}
