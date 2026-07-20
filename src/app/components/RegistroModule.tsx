import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import {
  extractErrorMessage,
  folioRevistasService,
  movimientosService,
  type FolioRevista,
  type Movimiento,
} from '../services/databaseService';
import { formatCedula } from '../utils/cedula';
import { formatMilitaryDisplayName } from '../utils/militaryDisplay';

type VistaHistorial = 'movimientos' | 'folios';

const ITEMS_PER_PAGE = 6;

export function RegistroModule() {
  const [vista, setVista] = useState<VistaHistorial>('movimientos');
  const [busqueda, setBusqueda] = useState('');
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [folios, setFolios] = useState<FolioRevista[]>([]);
  const [isLoadingMovimientos, setIsLoadingMovimientos] = useState(true);
  const [isLoadingFolios, setIsLoadingFolios] = useState(true);
  const [errorMovimientos, setErrorMovimientos] = useState<string | null>(null);
  const [errorFolios, setErrorFolios] = useState<string | null>(null);
  const [expandedMovimientoId, setExpandedMovimientoId] = useState<number | null>(null);
  const [expandedFolioId, setExpandedFolioId] = useState<number | null>(null);
  const [paginaMovimientos, setPaginaMovimientos] = useState(1);
  const [paginaFolios, setPaginaFolios] = useState(1);

  useEffect(() => {
    void loadMovimientos();
    void loadFolios();
  }, []);

  useEffect(() => {
    if (vista === 'movimientos') {
      setPaginaMovimientos(1);
      setExpandedMovimientoId(null);
    } else {
      setPaginaFolios(1);
      setExpandedFolioId(null);
    }
  }, [busqueda, vista]);

  const movimientosFiltrados = useMemo(() => {
    const valor = busqueda.trim().toLowerCase();

    return movimientos.filter((movimiento) => {
      if (!valor) {
        return true;
      }

      return (
        formatDateTime(movimiento.GRUPO_FECHA_HORA).toLowerCase().includes(valor) ||
        (movimiento.NOMBRE_COMPLETO || '').toLowerCase().includes(valor) ||
        movimiento.ID_CEDULA_PERSONAL.toLowerCase().includes(valor) ||
        (movimiento.JERARQUIA_NOMBRE || '').toLowerCase().includes(valor) ||
        (movimiento.COMPANIA_NOMBRE || '').toLowerCase().includes(valor) ||
        (movimiento.MODELO_ARMA || '').toLowerCase().includes(valor) ||
        movimiento.SERIAL_ARMA.toLowerCase().includes(valor)
      );
    });
  }, [busqueda, movimientos]);

  const foliosFiltrados = useMemo(() => {
    const valor = busqueda.trim().toLowerCase();

    return folios.filter((folio) => {
      if (!valor) {
        return true;
      }

      return (
        formatDateTime(folio.GRUPO_FECHA_HORA).toLowerCase().includes(valor) ||
        (folio.NOMBRE_PERSONAL || '').toLowerCase().includes(valor) ||
        (folio.NOMBRE_INSPECTOR || '').toLowerCase().includes(valor) ||
        folio.ID_CEDULA_PERSONAL.toLowerCase().includes(valor) ||
        folio.CEDULA_INSPECTOR.toLowerCase().includes(valor) ||
        folio.PUESTO_SERVICIO.toLowerCase().includes(valor) ||
        folio.REVISTA_GRUPO.toLowerCase().includes(valor) ||
        (folio.OBSERVACION || '').toLowerCase().includes(valor)
      );
    });
  }, [busqueda, folios]);

  const totalMovimientoPages = Math.max(1, Math.ceil(movimientosFiltrados.length / ITEMS_PER_PAGE));
  const totalFolioPages = Math.max(1, Math.ceil(foliosFiltrados.length / ITEMS_PER_PAGE));
  const currentMovimientoPage = Math.min(paginaMovimientos, totalMovimientoPages);
  const currentFolioPage = Math.min(paginaFolios, totalFolioPages);

  const movimientosPaginados = useMemo(() => {
    const startIndex = (currentMovimientoPage - 1) * ITEMS_PER_PAGE;
    return movimientosFiltrados.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentMovimientoPage, movimientosFiltrados]);

  const foliosPaginados = useMemo(() => {
    const startIndex = (currentFolioPage - 1) * ITEMS_PER_PAGE;
    return foliosFiltrados.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentFolioPage, foliosFiltrados]);

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
      <h1 className="mb-6 text-center">Historial</h1>

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setVista('movimientos')}
              className={`min-w-[180px] rounded-xl px-6 py-3 text-center font-medium transition-colors ${
                vista === 'movimientos'
                  ? 'bg-[#0066ff] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Movimientos
            </button>
            <button
              onClick={() => setVista('folios')}
              className={`min-w-[180px] rounded-xl px-6 py-3 text-center font-medium transition-colors ${
                vista === 'folios'
                  ? 'bg-[#0066ff] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              Folios de Revista
            </button>
          </div>

          <div>
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={20} />
              <input
                type="text"
                placeholder="Buscar por fecha, personal, cedula, serial, puesto o motivo..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>
          </div>
        </div>
      </div>

      {vista === 'movimientos' && (
        <div className="space-y-4">
          {errorMovimientos && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
              {errorMovimientos}
            </div>
          )}

          {isLoadingMovimientos && (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-gray-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Cargando movimientos...
            </div>
          )}

          {!isLoadingMovimientos && movimientosFiltrados.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-gray-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              No hay movimientos registrados.
            </div>
          )}

          {!isLoadingMovimientos &&
            movimientosPaginados.map((movimiento) => {
              const isOpen = expandedMovimientoId === movimiento.ID_MOVIMIENTO;
              return (
                <div key={movimiento.ID_MOVIMIENTO} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <button
                    onClick={() =>
                      setExpandedMovimientoId((current) => (current === movimiento.ID_MOVIMIENTO ? null : movimiento.ID_MOVIMIENTO))
                    }
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/60"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-800 dark:text-slate-100">
                          {formatMilitaryDisplayName({
                            jerarquia: movimiento.JERARQUIA_NOMBRE,
                            nombre: movimiento.NOMBRE,
                            apellido: movimiento.APELLIDO,
                            nombreCompleto: movimiento.NOMBRE_COMPLETO,
                          })}
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            movimiento.TIPO_MOVIMIENTO === 'ENTRADA'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}
                        >
                          {movimiento.TIPO_MOVIMIENTO}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-slate-300">
                        <span>{formatDateTime(movimiento.GRUPO_FECHA_HORA)}</span>
                        <span>{movimiento.SERIAL_ARMA}</span>
                        <span>{formatCedula(movimiento.ID_CEDULA_PERSONAL)}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-gray-500 dark:text-slate-300">
                      {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-200 px-4 py-4 dark:border-slate-700">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <InfoItem label="Cedula" value={formatCedula(movimiento.ID_CEDULA_PERSONAL)} />
                        <InfoItem label="Jerarquia" value={movimiento.JERARQUIA_NOMBRE || '-'} />
                        <InfoItem label="Compania" value={movimiento.COMPANIA_NOMBRE || '-'} />
                        <InfoItem label="Arma" value={movimiento.MODELO_ARMA || '-'} />
                        <InfoItem label="Serial" value={movimiento.SERIAL_ARMA} />
                        <InfoItem label="Cargadores" value={String(movimiento.CANTIDAD_CARGADORES)} />
                        <InfoItem label="Municion" value={String(movimiento.CANTIDAD_MUNICION)} />
                        <InfoItem label="UID" value={movimiento.UID_LECTOR_NFC || 'WEB_APP'} />
                        <InfoItem label="Motivo" value={movimiento.MOTIVO || '-'} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          {!isLoadingMovimientos && movimientosFiltrados.length > 0 && totalMovimientoPages > 1 && (
            <PaginationControls
              currentPage={currentMovimientoPage}
              totalPages={totalMovimientoPages}
              onPrevious={() => setPaginaMovimientos((current) => Math.max(1, current - 1))}
              onNext={() => setPaginaMovimientos((current) => Math.min(totalMovimientoPages, current + 1))}
            />
          )}
        </div>
      )}

      {vista === 'folios' && (
        <div className="space-y-4">
          {errorFolios && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
              {errorFolios}
            </div>
          )}

          {isLoadingFolios && (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-gray-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Cargando folios...
            </div>
          )}

          {!isLoadingFolios && foliosFiltrados.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-gray-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              No hay folios registrados.
            </div>
          )}

          {!isLoadingFolios &&
            foliosPaginados.map((folio) => {
              const isOpen = expandedFolioId === folio.ID_FOLIO;
              return (
                <div key={folio.ID_FOLIO} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <button
                    onClick={() => setExpandedFolioId((current) => (current === folio.ID_FOLIO ? null : folio.ID_FOLIO))}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/60"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-slate-100">
                        {formatMilitaryDisplayName({
                          jerarquia: folio.JERARQUIA_PERSONAL,
                          nombre: folio.PERSONAL_NOMBRE,
                          apellido: folio.PERSONAL_APELLIDO,
                          nombreCompleto: folio.NOMBRE_PERSONAL,
                        })}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-slate-300">
                        <span>{formatDateTime(folio.GRUPO_FECHA_HORA)}</span>
                        <span>{formatCedula(folio.ID_CEDULA_PERSONAL)}</span>
                        <span>{folio.PUESTO_SERVICIO}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-gray-500 dark:text-slate-300">
                      {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-200 px-4 py-4 dark:border-slate-700">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <InfoItem label="Cedula" value={formatCedula(folio.ID_CEDULA_PERSONAL)} />
                        <InfoItem label="Puesto" value={folio.PUESTO_SERVICIO} />
                        <InfoItem label="Grupo" value={folio.REVISTA_GRUPO} />
                        <InfoItem
                          label="Inspector"
                          value={formatMilitaryDisplayName({
                            jerarquia: folio.JERARQUIA_INSPECTOR,
                            nombre: folio.INSPECTOR_NOMBRE,
                            apellido: folio.INSPECTOR_APELLIDO,
                            nombreCompleto: folio.NOMBRE_INSPECTOR,
                          })}
                        />
                        <InfoItem label="Cedula inspector" value={formatCedula(folio.CEDULA_INSPECTOR)} />
                        <InfoItem label="Observacion" value={folio.OBSERVACION || '-'} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          {!isLoadingFolios && foliosFiltrados.length > 0 && totalFolioPages > 1 && (
            <PaginationControls
              currentPage={currentFolioPage}
              totalPages={totalFolioPages}
              onPrevious={() => setPaginaFolios((current) => Math.max(1, current - 1))}
              onNext={() => setPaginaFolios((current) => Math.min(totalFolioPages, current + 1))}
            />
          )}
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/70">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-sm text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

function PaginationControls({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
      <button
        onClick={onPrevious}
        disabled={currentPage === 1}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        Anterior
      </button>
      <span className="text-sm text-gray-600 dark:text-slate-300">
        Pagina {currentPage} de {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={currentPage === totalPages}
        className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
      >
        Siguiente
      </button>
    </div>
  );
}

function formatDateTime(value: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
