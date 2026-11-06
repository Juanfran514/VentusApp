import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    '⚠️ [VentusApp] Faltan las variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY en tu archivo .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'ventus_auth_token'
  }
});

/**
 * Obtiene el usuario autenticado actual desde la sesión local
 */
export const getCurrentUser = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session?.user) return null;
    return session.user;
  } catch (err) {
    console.error('Error al obtener usuario actual:', err);
    return null;
  }
};

/**
 * Obtiene el ID del gimnasio del usuario autenticado.
 * Usa caché en localStorage para máximo rendimiento y evita peticiones redundantes.
 */
export const getActiveGimnasioId = async () => {
  const cached = localStorage.getItem('ventus_active_gimnasio_id');
  if (cached) return cached;

  const user = await getCurrentUser();
  if (user) {
    // Si viene en los metadatos de usuario
    if (user.user_metadata?.gimnasio_id) {
      localStorage.setItem('ventus_active_gimnasio_id', user.user_metadata.gimnasio_id);
      return user.user_metadata.gimnasio_id;
    }

    // Consultar tabla usuarios
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('gimnasio_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && data?.gimnasio_id) {
        localStorage.setItem('ventus_active_gimnasio_id', data.gimnasio_id);
        return data.gimnasio_id;
      }
    } catch (e) {
      console.warn('No se pudo obtener gimnasio_id de la tabla usuarios:', e);
    }
  }

  // Fallback para desarrollo sin auth obligatoria inicial
  let localDevId = localStorage.getItem('ventus_dev_gimnasio_id');
  if (!localDevId) {
    localDevId = '00000000-0000-0000-0000-000000000001';
    localStorage.setItem('ventus_dev_gimnasio_id', localDevId);
  }
  return localDevId;
};
