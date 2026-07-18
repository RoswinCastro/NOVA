import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, Plus } from 'lucide-react';
import {
  armasService,
  extractErrorMessage,
  type Arma,
  type ArmaPayload,
} from '../services/databaseService';

interface ArmaView {
  serial: string;
  tagNfc: string;
  nombre: string;
  modelo: string;
  tipo: string;
  carga: number;
  calibre: string;
  estado: Arma['ESTADO_DISPONIBILIDAD'];
}

interface ArmaFormState {
  serial: string;
  tagNfc: string;
  modelo: string;
  tipo: string;
  carga: string;
  calibre: string;
  estado: Arma['ESTADO_DISPONIBILIDAD'];
}

const initialFormState: ArmaFormState = {
  serial: '',
  tagNfc: '',
  modelo: '',
  tipo: '',
  carga: '',
  calibre: '',
  estado: 'DISPONIBLE',
};

export function ArmasModule() {
  const [armas, setArmas] = useState<ArmaView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [vistaActual, setVistaActual] = useState<'armas' | 'cargadores'>('armas');
  const [formState, setFormState] = useState<ArmaFormState>(initialFormState);
  const [vista, setVista] = useState<'lista' | 'menuParques' | 'detalle'>('lista');
  const [armaSeleccionada, setArmaSeleccionada] = useState<ArmaView | null>(null);
  const [parqueSeleccionado, setParqueSeleccionado] = useState<number | null>(null);

  useEffect(() => {
    void loadArmas();
  }, []);

  const armasFiltradas = useMemo(() => {
    const valor = busqueda.trim().toLowerCase();
    return armas.filter((arma) => {
      if (!valor) {
        return true;
      }

      return (
        arma.modelo.toLowerCase().includes(valor) ||
        arma.tipo.toLowerCase().includes(valor) ||
        arma.serial.toLowerCase().includes(valor) ||
        arma.tagNfc.toLowerCase().includes(valor)
      );
    });
  }, [armas, busqueda]);

  async function loadArmas() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await armasService.getAll();
      setArmas(response.map(mapArmaToView));
    } catch (loadError) {
      setError(extractErrorMessage(loadError, 'No se pudieron cargar las armas.'));
      setArmas([]);
    } finally {
      setIsLoading(false);
    }
  }

  function resetFormulario() {
    setFormState(initialFormState);
    setSaveError(null);
    setMostrarFormulario(false);
  }

  async function handleAgregarArma() {
    setSaveError(null);
    setSuccessMessage(null);

    if (!formState.serial.trim() || !formState.tagNfc.trim() || !formState.modelo.trim() || !formState.tipo.trim() || !formState.carga.trim() || !formState.calibre.trim()) {
      setSaveError('Complete todos los campos obligatorios del arma.');
      return;
    }

    const payload: ArmaPayload = {
      SERIAL_ARMA: formState.serial.trim(),
      TAG_NFC: formState.tagNfc.trim(),
      MODELO: formState.modelo.trim(),
      TIPO: formState.tipo.trim(),
      CALIBRE: formState.calibre.trim(),
      CAPACIDAD_CARGA: Number(formState.carga),
      ESTADO_DISPONIBILIDAD: formState.estado,
    };

    setIsSaving(true);

    try {
      await armasService.create(payload);
      await loadArmas();
      setSuccessMessage('Arma registrada correctamente.');
      resetFormulario();
    } catch (saveRequestError) {
      setSaveError(extractErrorMessage(saveRequestError, 'No se pudo registrar el arma.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6">Gestión de Armas</h1>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => {
            setVistaActual('armas');
            setVista('lista');
          }}
          className={`rounded-lg px-6 py-3 ${vistaActual === 'armas' ? 'bg-[#0066ff] text-white' : 'bg-gray-200'}`}
        >
          Armas
        </button>
        <button
          onClick={() => {
            setVistaActual('cargadores');
            setVista('lista');
          }}
          className={`rounded-lg px-6 py-3 ${vistaActual === 'cargadores' ? 'bg-[#0066ff] text-white' : 'bg-gray-200'}`}
        >
          Cargadores
        </button>
      </div>

      {vistaActual === 'armas' && (
        <>
          {vista === 'lista' && (
            <>
              <div className="mb-6 flex gap-4">
                <input
                  placeholder="Buscar por modelo, serial o TAG..."
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  className="flex-1 rounded-lg border py-2 pl-4 outline-none focus:ring-2 focus:ring-[#0066ff]"
                />
                <button
                  onClick={() => {
                    setSuccessMessage(null);
                    setMostrarFormulario((current) => !current);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-[#0066ff] px-4 py-2 text-white"
                >
                  <Plus size={20} />
                  Agregar
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse overflow-hidden rounded-lg bg-white shadow-sm">
                  <thead className="bg-[#0066ff] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Serial</th>
                      <th className="px-4 py-3 text-left">TAG NFC</th>
                      <th className="px-4 py-3 text-left">Modelo</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Carga</th>
                      <th className="px-4 py-3 text-left">Calibre</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr className="bg-white">
                        <td colSpan={8} className="border-t px-4 py-8 text-center text-gray-500">
                          Cargando armas...
                        </td>
                      </tr>
                    )}
                    {!isLoading && armasFiltradas.length === 0 && (
                      <tr className="bg-white">
                        <td colSpan={8} className="border-t px-4 py-8 text-center text-gray-500">
                          No hay armas registradas
                        </td>
                      </tr>
                    )}
                    {!isLoading &&
                      armasFiltradas.map((arma, index) => (
                        <tr key={arma.serial} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          <td className="border-t px-4 py-3 font-mono">{arma.serial}</td>
                          <td className="border-t px-4 py-3 font-mono">{arma.tagNfc}</td>
                          <td className="border-t px-4 py-3">{arma.modelo}</td>
                          <td className="border-t px-4 py-3">{arma.tipo}</td>
                          <td className="border-t px-4 py-3">{arma.carga}</td>
                          <td className="border-t px-4 py-3">{arma.calibre}</td>
                          <td className="border-t px-4 py-3">{arma.estado}</td>
                          <td className="border-t px-4 py-3 text-right">
                            <button
                              onClick={() => {
                                setArmaSeleccionada(arma);
                                setVista('menuParques');
                              }}
                              className="ml-auto flex items-center gap-2 rounded-lg bg-[#0066ff] px-4 py-2 text-white"
                            >
                              <Eye size={16} />
                              Ver Parques
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {vista === 'menuParques' && (
            <div>
              <button
                onClick={() => {
                  setVista('lista');
                  setArmaSeleccionada(null);
                }}
                className="mb-6 flex items-center gap-2 text-gray-600 hover:text-black"
              >
                <ArrowLeft />
                Volver al listado
              </button>
              <h2 className="mb-6 text-xl font-bold">Seleccione Parque para: {armaSeleccionada?.modelo}</h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setParqueSeleccionado(num);
                      setVista('detalle');
                    }}
                    className="rounded-lg bg-[#0066ff] px-8 py-6 text-xl font-bold text-white shadow-lg transition-colors hover:bg-[#0052cc]"
                  >
                    Parque {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {vista === 'detalle' && armaSeleccionada && (
            <div>
              <button
                onClick={() => {
                  setVista('menuParques');
                  setParqueSeleccionado(null);
                }}
                className="mb-6 flex items-center gap-2 text-gray-600 hover:text-black"
              >
                <ArrowLeft />
                Regresar a Parques
              </button>
              <h2 className="mb-4 text-2xl font-bold">Inventario - Parque {parqueSeleccionado}</h2>
              <div className="rounded-lg bg-white p-4 shadow">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="p-3 text-left">Serial</th>
                      <th className="p-3 text-left">TAG NFC</th>
                      <th className="p-3 text-left">Modelo</th>
                      <th className="p-3 text-left">Tipo</th>
                      <th className="p-3 text-left">Capacidad</th>
                      <th className="p-3 text-left">Calibre</th>
                      <th className="p-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-3">{armaSeleccionada.serial}</td>
                      <td className="p-3">{armaSeleccionada.tagNfc}</td>
                      <td className="p-3">{armaSeleccionada.modelo}</td>
                      <td className="p-3">{armaSeleccionada.tipo}</td>
                      <td className="p-3">{armaSeleccionada.carga}</td>
                      <td className="p-3">{armaSeleccionada.calibre}</td>
                      <td className="p-3">{armaSeleccionada.estado}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {mostrarFormulario && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
              <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6">
                <h2 className="mb-4 text-xl font-bold">Agregar Nueva Arma</h2>

                {saveError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {saveError}
                  </div>
                )}

                <div className="space-y-3">
                  <input
                    placeholder="Serial"
                    value={formState.serial}
                    onChange={(event) => setFormState({ ...formState, serial: event.target.value })}
                    className="w-full rounded border p-2"
                  />
                  <input
                    placeholder="TAG NFC"
                    value={formState.tagNfc}
                    onChange={(event) => setFormState({ ...formState, tagNfc: event.target.value })}
                    className="w-full rounded border p-2"
                  />
                  <input
                    placeholder="Modelo"
                    value={formState.modelo}
                    onChange={(event) => setFormState({ ...formState, modelo: event.target.value })}
                    className="w-full rounded border p-2"
                  />
                  <input
                    placeholder="Tipo"
                    value={formState.tipo}
                    onChange={(event) => setFormState({ ...formState, tipo: event.target.value })}
                    className="w-full rounded border p-2"
                  />
                  <input
                    type="number"
                    placeholder="Capacidad de carga"
                    value={formState.carga}
                    onChange={(event) => setFormState({ ...formState, carga: event.target.value })}
                    className="w-full rounded border p-2"
                  />
                  <input
                    placeholder="Calibre"
                    value={formState.calibre}
                    onChange={(event) => setFormState({ ...formState, calibre: event.target.value })}
                    className="w-full rounded border p-2"
                  />
                  <select
                    value={formState.estado}
                    onChange={(event) =>
                      setFormState({
                        ...formState,
                        estado: event.target.value as Arma['ESTADO_DISPONIBILIDAD'],
                      })
                    }
                    className="w-full rounded border p-2"
                  >
                    <option value="DISPONIBLE">DISPONIBLE</option>
                    <option value="ASIGNADO">ASIGNADO</option>
                    <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                  </select>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => void handleAgregarArma()}
                    disabled={isSaving}
                    className="flex-1 rounded-lg bg-[#0066ff] py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? 'Guardando...' : 'Agregar'}
                  </button>
                  <button
                    onClick={resetFormulario}
                    disabled={isSaving}
                    className="flex-1 rounded-lg bg-gray-300 py-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {vistaActual === 'cargadores' && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-yellow-800">
          La pestaña de cargadores no tiene persistencia en la base de datos actual. El esquema `control_armamento_nfc.sql`
          no incluye una tabla para cargadores, así que esta sección queda visible pero sin datos simulados.
        </div>
      )}
    </div>
  );
}

function mapArmaToView(arma: Arma): ArmaView {
  return {
    serial: arma.SERIAL_ARMA,
    tagNfc: arma.TAG_NFC,
    nombre: arma.MODELO,
    modelo: arma.MODELO,
    tipo: arma.TIPO,
    carga: arma.CAPACIDAD_CARGA,
    calibre: arma.CALIBRE,
    estado: arma.ESTADO_DISPONIBILIDAD,
  };
}
