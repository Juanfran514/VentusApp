import { supabase, getActiveGimnasioId } from '../supabase';

const getLocalStorageBrandingKey = (gymId) => `ventus_branding_${gymId}`;

export const gimnasioService = {
  /**
   * Obtiene los datos del gimnasio por ID (con merge de branding local si existe)
   */
  async getGimnasio(id) {
    const gymId = id || (await getActiveGimnasioId());
    if (!gymId) return null;

    let gym = null;
    try {
      const queryPromise = supabase
        .from('gimnasios')
        .select('*')
        .eq('id', gymId)
        .maybeSingle();

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Timeout' } }), 2500)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (!error && data) {
        gym = data;
      }
    } catch (err) {
      console.warn('gimnasioService: Error al consultar Supabase, usando fallback:', err);
    }

    // Merge con overrides guardados localmente (garantiza compatibilidad si Supabase no tiene aún las columnas)
    try {
      const local = localStorage.getItem(getLocalStorageBrandingKey(gymId));
      if (local) {
        const parsed = JSON.parse(local);
        gym = {
          ...(gym || { id: gymId, nombre: 'Mi Club / Gimnasio' }),
          ...parsed
        };
      }
    } catch (e) {
      console.warn('Error al leer branding local:', e);
    }

    return gym;
  },

  /**
   * Actualiza la identidad de marca (logo y colores) del gimnasio
   */
  async actualizarBranding(gymId, { logoUrl, colorPrimario, colorSecundario }) {
    if (!gymId) throw new Error('ID de gimnasio requerido.');

    const payload = {
      fecha_actualizacion: new Date().toISOString()
    };
    if (logoUrl !== undefined) payload.logo_url = logoUrl;
    if (colorPrimario !== undefined) payload.color_primario = colorPrimario;
    if (colorSecundario !== undefined) payload.color_secundario = colorSecundario;

    // 1. Guardar en localStorage para disponibilidad instantánea y offline
    try {
      const existing = localStorage.getItem(getLocalStorageBrandingKey(gymId));
      const parsed = existing ? JSON.parse(existing) : {};
      const updatedLocal = {
        ...parsed,
        logo_url: logoUrl !== undefined ? logoUrl : parsed.logo_url,
        color_primario: colorPrimario !== undefined ? colorPrimario : parsed.color_primario,
        color_secundario: colorSecundario !== undefined ? colorSecundario : parsed.color_secundario
      };
      localStorage.setItem(getLocalStorageBrandingKey(gymId), JSON.stringify(updatedLocal));
    } catch (e) {
      console.warn('No se pudo guardar branding en localStorage:', e);
    }

    // 2. Intentar persistir en Supabase con timeout de 2.5s para no bloquear la interfaz
    try {
      const supabasePromise = supabase
        .from('gimnasios')
        .update(payload)
        .eq('id', gymId)
        .select()
        .maybeSingle();

      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Timeout Supabase' } }), 2500)
      );

      const { data, error } = await Promise.race([supabasePromise, timeoutPromise]);

      if (error && error.message !== 'Timeout Supabase') {
        console.warn('Aviso Supabase al guardar branding (usando fallback local):', error.message);
      } else if (data) {
        return data;
      }
    } catch (err) {
      console.warn('Error al actualizar gimnasio en Supabase:', err);
    }

    return {
      id: gymId,
      logo_url: logoUrl,
      color_primario: colorPrimario,
      color_secundario: colorSecundario
    };
  }
};

