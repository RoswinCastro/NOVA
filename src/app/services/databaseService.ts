import axios from 'axios';

export interface PersonalMilitar {
  CEDULA: string;
  ID_JERARQUIA: number;
  NOMBRE: string;
  APELLIDO: string;
  CONTINGENTE: string;
  ID_COMPANIA: number;
  TELEFONO?: string | null;
  JERARQUIA_NOMBRE?: string;
  COMPANIA_NOMBRE?: string;
  NUM_REGIMIENTO?: string;
}

export interface PersonalPayload {
  CEDULA: string;
  ID_JERARQUIA: number;
  NOMBRE: string;
  APELLIDO: string;
  CONTINGENTE: string;
  ID_COMPANIA: number;
  TELEFONO?: string | null;
}

export interface Arma {
  SERIAL_ARMA: string;
  TAG_NFC: string;
  MODELO: string;
  TIPO: string;
  CALIBRE: string;
  CAPACIDAD_CARGA: number;
  ESTADO_DISPONIBILIDAD: 'DISPONIBLE' | 'ASIGNADO' | 'MANTENIMIENTO';
  URL_IMAGEN_ACCION?: string | null;
}

export interface ArmaPayload {
  SERIAL_ARMA: string;
  TAG_NFC: string;
  MODELO: string;
  TIPO: string;
  CALIBRE: string;
  CAPACIDAD_CARGA: number;
  ESTADO_DISPONIBILIDAD?: Arma['ESTADO_DISPONIBILIDAD'];
  URL_IMAGEN_ACCION?: string | null;
}

export interface Movimiento {
  ID_MOVIMIENTO: number;
  TIPO_MOVIMIENTO: 'ENTRADA' | 'SALIDA';
  ID_CEDULA_PERSONAL: string;
  SERIAL_ARMA: string;
  CANTIDAD_CARGADORES: number;
  CANTIDAD_MUNICION: number;
  GRUPO_FECHA_HORA: string;
  MOTIVO: string;
  UID_LECTOR_NFC: string;
  NOMBRE_COMPLETO?: string;
  NOMBRE?: string;
  APELLIDO?: string;
  JERARQUIA_NOMBRE?: string;
  COMPANIA_NOMBRE?: string;
  MODELO_ARMA?: string;
  TAG_NFC?: string;
  ESTADO_DISPONIBILIDAD?: Arma['ESTADO_DISPONIBILIDAD'];
}

export interface MovimientoPayload {
  TIPO_MOVIMIENTO: Movimiento['TIPO_MOVIMIENTO'];
  ID_CEDULA_PERSONAL: string;
  SERIAL_ARMA: string;
  CANTIDAD_CARGADORES?: number;
  CANTIDAD_MUNICION?: number;
  MOTIVO?: string;
  UID_LECTOR_NFC?: string;
}

export interface MovimientoFilters {
  cedula?: string;
  serial?: string;
  fechaInicio?: string;
  fechaFin?: string;
  limite?: number;
}

export interface FolioRevista {
  ID_FOLIO: number;
  GRUPO_FECHA_HORA: string;
  ID_CEDULA_PERSONAL: string;
  PUESTO_SERVICIO: string;
  REVISTA_GRUPO: string;
  CEDULA_INSPECTOR: string;
  OBSERVACION?: string | null;
  NOMBRE_PERSONAL?: string;
  NOMBRE_INSPECTOR?: string;
}

export interface FolioRevistaPayload {
  GRUPO_FECHA_HORA?: string;
  ID_CEDULA_PERSONAL: string;
  PUESTO_SERVICIO: string;
  REVISTA_GRUPO: string;
  CEDULA_INSPECTOR: string;
  OBSERVACION?: string | null;
}

export interface FolioFilters {
  cedula?: string;
  fechaInicio?: string;
  fechaFin?: string;
  limite?: number;
}

export interface Jerarquia {
  ID_JERARQUIA: number;
  NOMBRE_JERARQUIA: string;
}

export interface Compania {
  ID_COMPANIA: number;
  NOMBRE_COMPANIA: string;
  NUM_REGIMIENTO: string;
}

export interface LecturaNFCResponse {
  arma: Arma;
  personalCedula: string | null;
  uidLector?: string | null;
  message: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function extractErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const backendMessage = error.response?.data?.error;
    if (typeof backendMessage === 'string' && backendMessage.trim().length > 0) {
      return backendMessage;
    }

    if (typeof error.message === 'string' && error.message.trim().length > 0) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function logAndThrow(error: unknown, fallback: string) {
  console.error(fallback, error);
  throw error;
}

export const personalService = {
  getAll: async (q?: string): Promise<PersonalMilitar[]> => {
    try {
      const response = await api.get('/personal', {
        params: q ? { q } : undefined,
      });
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al obtener personal');
    }
  },

  getByCedula: async (cedula: string): Promise<PersonalMilitar | null> => {
    try {
      const response = await api.get(`/personal/${cedula}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      logAndThrow(error, 'Error al buscar personal por cédula');
    }
  },

  search: async (query: string): Promise<PersonalMilitar[]> => {
    try {
      const response = await api.get('/personal', {
        params: { q: query },
      });
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al buscar personal');
    }
  },

  create: async (personal: PersonalPayload): Promise<PersonalMilitar> => {
    try {
      const response = await api.post('/personal', personal);
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al crear personal');
    }
  },

  update: async (cedula: string, personal: Omit<PersonalPayload, 'CEDULA'>): Promise<PersonalMilitar> => {
    try {
      const response = await api.put(`/personal/${cedula}`, personal);
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al actualizar personal');
    }
  },
};

export const armasService = {
  getAll: async (estado?: string): Promise<Arma[]> => {
    try {
      const response = await api.get('/armas', {
        params: estado ? { estado } : undefined,
      });
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al obtener armas');
    }
  },

  getBySerial: async (serial: string): Promise<Arma | null> => {
    try {
      const response = await api.get(`/armas/${serial}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      logAndThrow(error, 'Error al buscar arma por serial');
    }
  },

  getByNFC: async (tagNFC: string): Promise<Arma | null> => {
    try {
      const response = await api.get(`/armas/nfc/${tagNFC}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      logAndThrow(error, 'Error al buscar arma por TAG NFC');
    }
  },

  create: async (arma: ArmaPayload): Promise<Arma> => {
    try {
      const response = await api.post('/armas', arma);
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al crear arma');
    }
  },

  update: async (serial: string, arma: Omit<ArmaPayload, 'SERIAL_ARMA'>): Promise<Arma> => {
    try {
      const response = await api.put(`/armas/${serial}`, arma);
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al actualizar arma');
    }
  },

  updateEstado: async (serial: string, estado: Arma['ESTADO_DISPONIBILIDAD']): Promise<Arma> => {
    try {
      const response = await api.patch(`/armas/${serial}/estado`, { estado });
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al actualizar estado del arma');
    }
  },
};

export const movimientosService = {
  registrar: async (movimiento: MovimientoPayload): Promise<Movimiento> => {
    try {
      const response = await api.post('/movimientos', movimiento);
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al registrar movimiento');
    }
  },

  list: async (filters?: MovimientoFilters): Promise<Movimiento[]> => {
    try {
      const response = await api.get('/movimientos', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al obtener movimientos');
    }
  },

  getByFecha: async (fechaInicio: string, fechaFin: string): Promise<Movimiento[]> => {
    return movimientosService.list({ fechaInicio, fechaFin });
  },

  getByPersonal: async (cedula: string): Promise<Movimiento[]> => {
    return movimientosService.list({ cedula });
  },

  getByArma: async (serial: string): Promise<Movimiento[]> => {
    return movimientosService.list({ serial });
  },

  getUltimos: async (limite = 50): Promise<Movimiento[]> => {
    try {
      const response = await api.get('/movimientos/ultimos', {
        params: { limite },
      });
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al obtener últimos movimientos');
    }
  },
};

export const folioRevistasService = {
  getAll: async (filters?: FolioFilters): Promise<FolioRevista[]> => {
    try {
      const response = await api.get('/folio-revistas', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al obtener folios de revista');
    }
  },

  getById: async (id: number): Promise<FolioRevista | null> => {
    try {
      const response = await api.get(`/folio-revistas/${id}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }

      logAndThrow(error, 'Error al obtener folio de revista');
    }
  },

  crear: async (folio: FolioRevistaPayload): Promise<FolioRevista> => {
    try {
      const response = await api.post('/folio-revistas', folio);
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al crear folio de revista');
    }
  },

  getByFecha: async (fechaInicio: string, fechaFin: string): Promise<FolioRevista[]> => {
    return folioRevistasService.getAll({ fechaInicio, fechaFin });
  },

  getByPersonal: async (cedula: string): Promise<FolioRevista[]> => {
    return folioRevistasService.getAll({ cedula });
  },
};

export const catalogosService = {
  getJerarquias: async (): Promise<Jerarquia[]> => {
    try {
      const response = await api.get('/catalogos/jerarquias');
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al obtener jerarquías');
    }
  },

  getCompanias: async (): Promise<Compania[]> => {
    try {
      const response = await api.get('/catalogos/companias');
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al obtener compañías');
    }
  },
};

export const lectoresService = {
  procesarLectura: async (
    tagNFC: string,
    tipoMovimiento: 'ENTRADA' | 'SALIDA',
    uidLector: string
  ): Promise<LecturaNFCResponse> => {
    try {
      const response = await api.post('/lectores/procesar', {
        tagNFC,
        tipoMovimiento,
        uidLector,
      });
      return response.data;
    } catch (error) {
      logAndThrow(error, 'Error al procesar lectura NFC');
    }
  },
};

export { API_BASE_URL, extractErrorMessage };

export default {
  personal: personalService,
  armas: armasService,
  movimientos: movimientosService,
  folioRevistas: folioRevistasService,
  catalogos: catalogosService,
  lectores: lectoresService,
};
