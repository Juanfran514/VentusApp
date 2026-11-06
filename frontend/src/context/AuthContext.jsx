import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, getActiveGimnasioId } from '../supabase';
import { aplicarTema, restablecerTemaPorDefecto, THEME_DEFAULT } from '../utils/theme';
import { gimnasioService } from '../services/gimnasioService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [gimnasio, setGimnasio] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  // Carga los datos de usuario y gimnasio
  const fetchTenantData = async (authUser) => {
    if (!authUser) {
      setUser(null);
      setPerfil(null);
      setGimnasio(null);
      localStorage.removeItem('ventus_active_gimnasio_id');
      restablecerTemaPorDefecto();
      setLoading(false);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      setUser(authUser);

      // 1. Obtener perfil del usuario (rol, nombre, gimnasio_id)
      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (userError) {
        console.error('Error al cargar perfil de usuario:', userError);
      }

      if (userData?.gimnasio_id) {
        setPerfil(userData);
        localStorage.setItem('ventus_active_gimnasio_id', userData.gimnasio_id);

        // 2. Obtener datos del gimnasio con branding (vía servicio con fallback)
        const gymData = await gimnasioService.getGimnasio(userData.gimnasio_id);
        if (gymData) {
          setGimnasio(gymData);
          aplicarTema(gymData.color_primario, gymData.color_secundario);
        }
      }
    } catch (err) {
      console.error('Error general en fetchTenantData:', err);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Obtener sesión inicial
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (isMounted) {
        if (session?.user) {
          fetchTenantData(session.user);
        } else {
          // Si no hay sesión Supabase activa, cargamos el gimnasio fallback o dev
          try {
            const devGymId = await getActiveGimnasioId();
            if (devGymId) {
              const gymData = await gimnasioService.getGimnasio(devGymId);
              if (gymData && isMounted) {
                setGimnasio(gymData);
                aplicarTema(gymData.color_primario, gymData.color_secundario);
              }
            }
          } catch (e) {
            console.warn('Aviso al cargar fallback de gimnasio:', e);
          }
          setLoading(false);
        }
      }
    });

    // Escuchar eventos auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setPerfil(null);
        setGimnasio(null);
        localStorage.removeItem('ventus_active_gimnasio_id');
        localStorage.removeItem('ventus_auth_token');
        restablecerTemaPorDefecto();
        setLoading(false);
      } else if (session?.user) {
        await fetchTenantData(session.user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Iniciar sesión
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) throw error;
    if (data?.user) {
      setUser(data.user);
      fetchTenantData(data.user);
    }
    return data;
  };

  // Registrar nuevo gimnasio
  const register = async ({ email, password, nombre, nombreGimnasio, logoUrl }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          nombre: nombre.trim(),
          nombre_gimnasio: nombreGimnasio.trim(),
          logo_url: logoUrl || ''
        }
      }
    });

    if (error) throw error;

    // Guardar temporalmente el logo si se proporcionó durante el registro
    if (logoUrl) {
      try {
        localStorage.setItem('ventus_pending_registration_logo', logoUrl);
      } catch (e) {
        console.warn('Error al almacenar logo temporal:', e);
      }
    }

    if (data?.user && data?.session) {
      setUser(data.user);
      await fetchTenantData(data.user);
    }
    return data;
  };

  // Actualizar branding de forma reactiva en el gimnasio actual
  const actualizarBranding = async ({ logoUrl, colorPrimario, colorSecundario }) => {
    let targetGymId = gimnasio?.id || localStorage.getItem('ventus_active_gimnasio_id');
    if (!targetGymId) {
      targetGymId = await getActiveGimnasioId();
    }
    if (!targetGymId) {
      targetGymId = '00000000-0000-0000-0000-000000000001';
      localStorage.setItem('ventus_active_gimnasio_id', targetGymId);
    }

    const res = await gimnasioService.actualizarBranding(targetGymId, {
      logoUrl,
      colorPrimario,
      colorSecundario
    });

    setGimnasio((prev) => {
      const updated = {
        ...(prev || { id: targetGymId, nombre: 'Mi Club / Gimnasio' }),
        ...res,
        logo_url: logoUrl !== undefined ? logoUrl : prev?.logo_url,
        color_primario: colorPrimario !== undefined ? colorPrimario : prev?.color_primario,
        color_secundario: colorSecundario !== undefined ? colorSecundario : prev?.color_secundario
      };
      return updated;
    });

    const activeColorPrimario = colorPrimario !== undefined ? colorPrimario : (gimnasio?.color_primario || THEME_DEFAULT.primary);
    const activeColorSecundario = colorSecundario !== undefined ? colorSecundario : (gimnasio?.color_secundario || THEME_DEFAULT.dark);
    aplicarTema(activeColorPrimario, activeColorSecundario);

    return res;
  };

  // Cerrar sesión garantizado
  const logout = async () => {
    // 1. Limpieza inmediata del estado en React y almacenamiento local
    setUser(null);
    setPerfil(null);
    setGimnasio(null);
    localStorage.removeItem('ventus_active_gimnasio_id');
    localStorage.removeItem('ventus_auth_token');
    restablecerTemaPorDefecto();

    // 2. Notificar a Supabase
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('Aviso durante signOut:', err);
    }
  };

  const value = {
    user,
    perfil,
    gimnasio,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    actualizarBranding,
    refreshTenant: () => fetchTenantData(user)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};
