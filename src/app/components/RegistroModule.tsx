import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  extractErrorMessage,
  folioRevistasService,
  movimientosService,
  type FolioRevista,
  type Movimiento,
} from '../services/databaseService';

type VistaHistorial = 'movimientos' | 'folios';
type BusquedaTipo = 'fecha' | 'personal';

export function RegistroModule() {
  const [vista, setVista] = useState<VistaHistorial>('movimientos');
  const [busquedaTipo, setBusquedaTipo] = useState<BusquedaTipo>('fecha');
  const [busqueda, setBusqueda] = useState('');
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [folios, setFolios] = useState<FolioRevista[]>([]);
  const [isLoadingMovimientos, setIsLoadingMovimientos] = useState(true);
  const [isLoadingFolios, setIsLoadingFolios] = useState(true);
  const [errorMovimientos, setErrorMovimientos] = useState<string | null>(null);
  const [errorFolios, setErrorFolios] = useState<string | null>(null);

  useEffect(() => {
    void loadMovimientos();
    void loadFolios();
  }, []);

  const movimientosFiltrados = useMemo(() => {
    const valor = busqueda.trim().toLowerCase();

    return movimientos.filter((movimiento) => {
      if (!valor) {
        return true;
      }

      if (busquedaTipo === 'fecha') {
        return formatDateTime(movimiento.GRUPO_FECHA_HORA).toLowerCase().includes(valor);
      }

      return (
        (movimiento.NOMBRE_COMPLETO || '').toLowerCase().includes(valor) ||
        movimiento.ID_CEDULA_PERSONAL.toLowerCase().includes(valor)
      );
    });
  }, [busqueda, busquedaTipo, movimientos]);

  const foliosFiltrados = useMemo(() => {
    const valor = busqueda.trim().toLowerCase();

    return folios.filter((folio) => {
      if (!valor) {
        return true;
      }

      if (busquedaTipo === 'fecha') {
        return formatDateTime(folio.GRUPO_FECHA_HORA).toLowerCase().includes(valor);
      }

      return (
        (folio.NOMBRE_PERSONAL || '').toLowerCase().includes(valor) ||
        (folio.NOMBRE_INSPECTOR || '').toLowerCase().includes(valor) ||
        folio.ID_CEDULA_PERSONAL.toLowerCase().includes(valor) ||
        folio.CEDULA_INSPECTOR.toLowerCase().includes(valor)
      );
    });
  }, [busqueda, busquedaTipo, folios]);

  async function loadMovimientos() {
    setIsLoadingMovimientos(true);
    setErrorMovimientos(null);

    try {
      const response = await movimientosService.list({ limite: 200 });
      setMovimientos(response);
    } catch (loadError) {
      setErrorMovimientos(extractErrorMessage(loadError, 'No se pudo cargar el historial de movimientos.'));
      setMovimientos([]);
    } finally {
      setIsLoadingMovimientos(false);
    }
  }

  async function loadFolios() {
    setIsLoadingFolios(true);
    setErrorFolios(null);

    try {
      const response = await folioRevistasService.getAll({ limite: 200 });
      setFolios(response);
    } catch (loadError) {
      setErrorFolios(extractErrorMessage(loadError, 'No se pudo cargar el historial de folios.'));
      setFolios([]);
    } finally {
      setIsLoadingFolios(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6">Historial</h1>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setVista('movimientos')}
          className={`rounded-lg px-6 py-3 ${vista === 'movimientos' ? 'bg-[#0066ff] text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Movimientos
        </button>
        <button
          onClick={() => setVista('folios')}
          className={`rounded-lg px-6 py-3 ${vista === 'folios' ? 'bg-[#0066ff] text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Folios de Revista
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setBusquedaTipo('fecha')}
            className={`rounded-lg px-4 py-2 transition-colors ${
              busquedaTipo === 'fecha' ? 'bg-[#0066ff] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Por Fecha
          </button>
          <button
            onClick={() => setBusquedaTipo('personal')}
            className={`rounded-lg px-4 py-2 transition-colors ${
              busquedaTipo === 'personal' ? 'bg-[#0066ff] text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Por Personal
          </button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={busquedaTipo === 'fecha' ? 'Buscar por fecha...' : 'Buscar por personal o cédula...'}
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
          />
        </div>
      </div>

      {vista === 'movimientos' && (
        <div className="overflow-x-auto">
          {errorMovimientos && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMovimientos}
            </div>
          )}

          <table className="w-full border-collapse overflow-hidden rounded-lg bg-white text-sm shadow-sm">
            <thead className="bg-[#0066ff] text-white">
              <tr>
                <th className="px-3 py-3 text-left">ID</th>
                <th className="px-3 py-3 text-left">Fecha</th>
                <th className="px-3 py-3 text-left">Tipo</th>
                <th className="px-3 py-3 text-left">Personal</th>
                <th className="px-3 py-3 text-left">Cédula</th>
                <th className="px-3 py-3 text-left">Jerarquía</th>
                <th className="px-3 py-3 text-left">Compañía</th>
                <th className="px-3 py-3 text-left">Arma</th>
                <th className="px-3 py-3 text-left">Serial</th>
                <th className="px-3 py-3 text-left">Carg.</th>
                <th className="px-3 py-3 text-left">Munic.</th>
                <th className="px-3 py-3 text-left">Motivo</th>
                <th className="px-3 py-3 text-left">UID</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingMovimientos && (
                <tr className="bg-white">
                  <td colSpan={13} className="px-3 py-8 text-center text-gray-500">
                    Cargando movimientos...
                  </td>
                </tr>
              )}
              {!isLoadingMovimientos && movimientosFiltrados.length === 0 && (
                <tr className="bg-white">
                  <td colSpan={13} className="px-3 py-8 text-center text-gray-500">
                    No hay movimientos registrados
                  </td>
                </tr>
              )}
              {!isLoadingMovimientos &&
                movimientosFiltrados.map((movimiento, index) => (
                  <tr key={movimiento.ID_MOVIMIENTO} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="border-t border-gray-200 px-3 py-3">{movimiento.ID_MOVIMIENTO}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{formatDateTime(movimiento.GRUPO_FECHA_HORA)}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{movimiento.TIPO_MOVIMIENTO}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{movimiento.NOMBRE_COMPLETO || '—'}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{movimiento.ID_CEDULA_PERSONAL}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{movimiento.JERARQUIA_NOMBRE || '—'}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{movimiento.COMPANIA_NOMBRE || '—'}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{movimiento.MODELO_ARMA || '—'}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{movimiento.SERIAL_ARMA}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{movimiento.CANTIDAD_CARGADORES}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{movimiento.CANTIDAD_MUNICION}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{movimiento.MOTIVO || '—'}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{movimiento.UID_LECTOR_NFC || 'WEB_APP'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {vista === 'folios' && (
        <div className="overflow-x-auto">
          {errorFolios && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorFolios}
            </div>
          )}

          <table className="w-full border-collapse overflow-hidden rounded-lg bg-white text-sm shadow-sm">
            <thead className="bg-[#0066ff] text-white">
              <tr>
                <th className="px-3 py-3 text-left">ID</th>
                <th className="px-3 py-3 text-left">Fecha</th>
                <th className="px-3 py-3 text-left">Personal</th>
                <th className="px-3 py-3 text-left">Cédula</th>
                <th className="px-3 py-3 text-left">Puesto</th>
                <th className="px-3 py-3 text-left">Grupo</th>
                <th className="px-3 py-3 text-left">Inspector</th>
                <th className="px-3 py-3 text-left">Cédula Inspector</th>
                <th className="px-3 py-3 text-left">Observación</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingFolios && (
                <tr className="bg-white">
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                    Cargando folios...
                  </td>
                </tr>
              )}
              {!isLoadingFolios && foliosFiltrados.length === 0 && (
                <tr className="bg-white">
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                    No hay folios registrados
                  </td>
                </tr>
              )}
              {!isLoadingFolios &&
                foliosFiltrados.map((folio, index) => (
                  <tr key={folio.ID_FOLIO} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="border-t border-gray-200 px-3 py-3">{folio.ID_FOLIO}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{formatDateTime(folio.GRUPO_FECHA_HORA)}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{folio.NOMBRE_PERSONAL || '—'}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{folio.ID_CEDULA_PERSONAL}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{folio.PUESTO_SERVICIO}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{folio.REVISTA_GRUPO}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{folio.NOMBRE_INSPECTOR || '—'}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{folio.CEDULA_INSPECTOR}</td>
                    <td className="border-t border-gray-200 px-3 py-3">{folio.OBSERVACION || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDateTime(value: string) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
