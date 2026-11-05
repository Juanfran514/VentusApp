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
 * Obtiene el usuario autenticado actual
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (err) {
    console.error('Error al obtener usuario actual:', err);
    return null;
  }
};

/**
 * Obtiene el ID del gimnasio del usuario autenticado.
 * Si el usuario aún no está logueado en modo desarrollo/demo, retorna un UUID por defecto.
 */
export const getActiveGimnasioId = async () => {
  const user = await getCurrentUser();
  if (user) {
    return user.user_metadata?.gimnasio_id || user.id;
  }
  // Fallback para desarrollo sin auth obligatoria inicial
  let localDevId = localStorage.getItem('ventus_dev_gimnasio_id');
  if (!localDevId) {
    localDevId = '00000000-0000-0000-0000-000000000001';
    localStorage.setItem('ventus_dev_gimnasio_id', localDevId);
  }
  return localDevId;
};
