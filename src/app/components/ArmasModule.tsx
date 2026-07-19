import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Building2, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import {
  armasService,
  cargadoresService,
  extractErrorMessage,
  parquesService,
  type Arma,
  type ArmaPayload,
  type Cargador,
  type CargadorPayload,
  type Parque,
  type ParquePayload,
} from '../services/databaseService';

interface ArmaView {
  serial: string;
  tagNfc: string;
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

interface CargadorView {
  id: number;
  nombre: string;
  capacidad: number;
  cantidadDisponible: number;
  estado: Cargador['ESTADO'];
}

interface CargadorFormState {
  nombre: string;
  capacidad: string;
  cantidadDisponible: string;
  estado: Cargador['ESTADO'];
}

interface ParqueView {
  id: number;
  nombre: string;
  descripcion: string;
  cantidadArmas: number;
  tieneArma: boolean;
}

interface ParqueFormState {
  nombre: string;
  descripcion: string;
}

const initialArmaFormState: ArmaFormState = {
  serial: '',
  tagNfc: '',
  modelo: '',
  tipo: '',
  carga: '',
  calibre: '',
  estado: 'DISPONIBLE',
};

const initialCargadorFormState: CargadorFormState = {
  nombre: '',
  capacidad: '',
  cantidadDisponible: '',
  estado: 'DISPONIBLE',
};

const initialParqueFormState: ParqueFormState = {
  nombre: '',
  descripcion: '',
};

export function ArmasModule() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [armas, setArmas] = useState<ArmaView[]>([]);
  const [cargadores, setCargadores] = useState<CargadorView[]>([]);
  const [parques, setParques] = useState<ParqueView[]>([]);
  const [parquesArma, setParquesArma] = useState<ParqueView[]>([]);
  const [isLoadingArmas, setIsLoadingArmas] = useState(true);
  const [isLoadingCargadores, setIsLoadingCargadores] = useState(true);
  const [isLoadingParques, setIsLoadingParques] = useState(true);
  const [isLoadingParquesArma, setIsLoadingParquesArma] = useState(false);
  const [isSavingArma, setIsSavingArma] = useState(false);
  const [isSavingCargador, setIsSavingCargador] = useState(false);
  const [isSavingParque, setIsSavingParque] = useState(false);
  const [parqueActionId, setParqueActionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [cargadoresBusqueda, setCargadoresBusqueda] = useState('');
  const [parquesBusqueda, setParquesBusqueda] = useState('');
  const [vistaActual, setVistaActual] = useState<'armas' | 'cargadores' | 'parques'>('armas');
  const [vistaArmas, setVistaArmas] = useState<'lista' | 'parques'>('lista');
  const [armaSeleccionada, setArmaSeleccionada] = useState<ArmaView | null>(null);
  const [mostrarArmaModal, setMostrarArmaModal] = useState(false);
  const [mostrarCargadorModal, setMostrarCargadorModal] = useState(false);
  const [mostrarParqueModal, setMostrarParqueModal] = useState(false);
  const [editingArmaSerial, setEditingArmaSerial] = useState<string | null>(null);
  const [editingCargadorId, setEditingCargadorId] = useState<number | null>(null);
  const [editingParqueId, setEditingParqueId] = useState<number | null>(null);
  const [armaFormState, setArmaFormState] = useState<ArmaFormState>(initialArmaFormState);
  const [cargadorFormState, setCargadorFormState] = useState<CargadorFormState>(initialCargadorFormState);
  const [parqueFormState, setParqueFormState] = useState<ParqueFormState>(initialParqueFormState);
  const [armaFormError, setArmaFormError] = useState<string | null>(null);
  const [cargadorFormError, setCargadorFormError] = useState<string | null>(null);
  const [parqueFormError, setParqueFormError] = useState<string | null>(null);

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (!mostrarArmaModal && !mostrarCargadorModal && !mostrarParqueModal) {
      return;
    }

    document.body.classList.add('nova-modal-open');
    return () => {
      document.body.classList.remove('nova-modal-open');
    };
  }, [mostrarArmaModal, mostrarCargadorModal, mostrarParqueModal]);

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

  const cargadoresFiltrados = useMemo(() => {
    const valor = cargadoresBusqueda.trim().toLowerCase();
    return cargadores.filter((cargador) => {
      if (!valor) {
        return true;
      }

      return (
        cargador.nombre.toLowerCase().includes(valor) ||
        String(cargador.capacidad).includes(valor) ||
        String(cargador.cantidadDisponible).includes(valor) ||
        cargador.estado.toLowerCase().includes(valor)
      );
    });
  }, [cargadores, cargadoresBusqueda]);

  const parquesFiltrados = useMemo(() => {
    const valor = parquesBusqueda.trim().toLowerCase();
    return parques.filter((parque) => {
      if (!valor) {
        return true;
      }

      return (
        parque.nombre.toLowerCase().includes(valor) ||
        parque.descripcion.toLowerCase().includes(valor)
      );
    });
  }, [parques, parquesBusqueda]);

  async function loadInitialData() {
    setError(null);
    await Promise.all([loadArmas(), loadCargadores(), loadParques()]);
  }

  async function loadArmas() {
    setIsLoadingArmas(true);

    try {
      const response = await armasService.getAll();
      setArmas(response.map(mapArmaToView));
    } catch (loadError) {
      setError(extractErrorMessage(loadError, 'No se pudieron cargar las armas.'));
      setArmas([]);
    } finally {
      setIsLoadingArmas(false);
    }
  }

  async function loadCargadores() {
    setIsLoadingCargadores(true);

    try {
      const response = await cargadoresService.getAll();
      setCargadores(response.map(mapCargadorToView));
    } catch (loadError) {
      setError(extractErrorMessage(loadError, 'No se pudieron cargar los cargadores.'));
      setCargadores([]);
    } finally {
      setIsLoadingCargadores(false);
    }
  }

  async function loadParques() {
    setIsLoadingParques(true);

    try {
      const response = await parquesService.getAll();
      setParques(response.map(mapParqueToView));
    } catch (loadError) {
      setError(extractErrorMessage(loadError, 'No se pudieron cargar los parques.'));
      setParques([]);
    } finally {
      setIsLoadingParques(false);
    }
  }

  async function loadParquesDeArma(serial: string) {
    setIsLoadingParquesArma(true);

    try {
      const response = await parquesService.getAll(serial);
      setParquesArma(response.map(mapParqueToView));
    } catch (loadError) {
      setError(extractErrorMessage(loadError, 'No se pudieron cargar los parques del arma.'));
      setParquesArma([]);
    } finally {
      setIsLoadingParquesArma(false);
    }
  }

  function resetArmaForm() {
    setArmaFormState(initialArmaFormState);
    setArmaFormError(null);
    setEditingArmaSerial(null);
    setMostrarArmaModal(false);
  }

  function resetCargadorForm() {
    setCargadorFormState(initialCargadorFormState);
    setCargadorFormError(null);
    setEditingCargadorId(null);
    setMostrarCargadorModal(false);
  }

  function resetParqueForm() {
    setParqueFormState(initialParqueFormState);
    setParqueFormError(null);
    setEditingParqueId(null);
    setMostrarParqueModal(false);
  }

  function openCreateArmaModal() {
    setSuccessMessage(null);
    setEditingArmaSerial(null);
    setArmaFormState(initialArmaFormState);
    setArmaFormError(null);
    setMostrarArmaModal(true);
  }

  function openEditArmaModal(arma: ArmaView) {
    setSuccessMessage(null);
    setEditingArmaSerial(arma.serial);
    setArmaFormState({
      serial: arma.serial,
      tagNfc: arma.tagNfc,
      modelo: arma.modelo,
      tipo: arma.tipo,
      carga: String(arma.carga),
      calibre: arma.calibre,
      estado: arma.estado,
    });
    setArmaFormError(null);
    setMostrarArmaModal(true);
  }

  function openCreateCargadorModal() {
    setSuccessMessage(null);
    setEditingCargadorId(null);
    setCargadorFormState(initialCargadorFormState);
    setCargadorFormError(null);
    setMostrarCargadorModal(true);
  }

  function openEditCargadorModal(cargador: CargadorView) {
    setSuccessMessage(null);
    setEditingCargadorId(cargador.id);
    setCargadorFormState({
      nombre: cargador.nombre,
      capacidad: String(cargador.capacidad),
      cantidadDisponible: String(cargador.cantidadDisponible),
      estado: cargador.estado,
    });
    setCargadorFormError(null);
    setMostrarCargadorModal(true);
  }

  function openCreateParqueModal() {
    setSuccessMessage(null);
    setEditingParqueId(null);
    setParqueFormState(initialParqueFormState);
    setParqueFormError(null);
    setMostrarParqueModal(true);
  }

  function openEditParqueModal(parque: ParqueView) {
    setSuccessMessage(null);
    setEditingParqueId(parque.id);
    setParqueFormState({
      nombre: parque.nombre,
      descripcion: parque.descripcion,
    });
    setParqueFormError(null);
    setMostrarParqueModal(true);
  }

  async function openParquesView(arma: ArmaView) {
    setError(null);
    setSuccessMessage(null);
    setArmaSeleccionada(arma);
    setVistaArmas('parques');
    await loadParquesDeArma(arma.serial);
  }

  async function handleGuardarArma() {
    setArmaFormError(null);
    setSuccessMessage(null);

    if (
      !armaFormState.serial.trim() ||
      !armaFormState.tagNfc.trim() ||
      !armaFormState.modelo.trim() ||
      !armaFormState.tipo.trim() ||
      !armaFormState.carga.trim() ||
      !armaFormState.calibre.trim()
    ) {
      setArmaFormError('Todos los campos del arma son obligatorios.');
      return;
    }

    const payload: ArmaPayload = {
      SERIAL_ARMA: armaFormState.serial.trim(),
      TAG_NFC: armaFormState.tagNfc.trim(),
      MODELO: armaFormState.modelo.trim(),
      TIPO: armaFormState.tipo.trim(),
      CAPACIDAD_CARGA: Number(armaFormState.carga),
      CALIBRE: armaFormState.calibre.trim(),
      ESTADO_DISPONIBILIDAD: armaFormState.estado,
    };

    setIsSavingArma(true);

    try {
      if (editingArmaSerial) {
        await armasService.update(editingArmaSerial, {
          TAG_NFC: payload.TAG_NFC,
          MODELO: payload.MODELO,
          TIPO: payload.TIPO,
          CAPACIDAD_CARGA: payload.CAPACIDAD_CARGA,
          CALIBRE: payload.CALIBRE,
          ESTADO_DISPONIBILIDAD: payload.ESTADO_DISPONIBILIDAD,
        });
        setSuccessMessage('Arma actualizada correctamente.');
      } else {
        await armasService.create(payload);
        setSuccessMessage('Arma registrada correctamente.');
      }

      await loadArmas();
      resetArmaForm();
    } catch (saveError) {
      setArmaFormError(extractErrorMessage(saveError, 'No se pudo guardar el arma.'));
    } finally {
      setIsSavingArma(false);
    }
  }

  async function handleGuardarCargador() {
    setCargadorFormError(null);
    setSuccessMessage(null);

    if (
      !cargadorFormState.nombre.trim() ||
      !cargadorFormState.capacidad.trim() ||
      !cargadorFormState.cantidadDisponible.trim()
    ) {
      setCargadorFormError('Todos los campos del cargador son obligatorios.');
      return;
    }

    const payload: CargadorPayload = {
      NOMBRE: cargadorFormState.nombre.trim(),
      CAPACIDAD: Number(cargadorFormState.capacidad),
      CANTIDAD_DISPONIBLE: Number(cargadorFormState.cantidadDisponible),
      ESTADO: cargadorFormState.estado,
    };

    setIsSavingCargador(true);

    try {
      if (editingCargadorId !== null) {
        await cargadoresService.update(editingCargadorId, payload);
        setSuccessMessage('Cargador actualizado correctamente.');
      } else {
        await cargadoresService.create(payload);
        setSuccessMessage('Cargador registrado correctamente.');
      }

      await loadCargadores();
      resetCargadorForm();
    } catch (saveError) {
      setCargadorFormError(extractErrorMessage(saveError, 'No se pudo guardar el cargador.'));
    } finally {
      setIsSavingCargador(false);
    }
  }

  async function handleGuardarParque() {
    setParqueFormError(null);
    setSuccessMessage(null);

    if (!parqueFormState.nombre.trim()) {
      setParqueFormError('El nombre del parque es obligatorio.');
      return;
    }

    const payload: ParquePayload = {
      NOMBRE: parqueFormState.nombre.trim(),
      DESCRIPCION: parqueFormState.descripcion.trim() || null,
    };

    setIsSavingParque(true);

    try {
      if (editingParqueId !== null) {
        await parquesService.update(editingParqueId, payload);
        setSuccessMessage('Parque actualizado correctamente.');
      } else {
        await parquesService.create(payload);
        setSuccessMessage('Parque registrado correctamente.');
      }

      await loadParques();
      if (armaSeleccionada && vistaArmas === 'parques') {
        await loadParquesDeArma(armaSeleccionada.serial);
      }
      resetParqueForm();
    } catch (saveError) {
      setParqueFormError(extractErrorMessage(saveError, 'No se pudo guardar el parque.'));
    } finally {
      setIsSavingParque(false);
    }
  }

  async function handleEliminarArma(serial: string) {
    const confirmed = window.confirm(`Se eliminara el arma ${serial}. Desea continuar?`);
    if (!confirmed) {
      return;
    }

    try {
      setSuccessMessage(null);
      await armasService.delete(serial);
      await loadArmas();
      if (armaSeleccionada?.serial === serial) {
        setVistaArmas('lista');
        setArmaSeleccionada(null);
        setParquesArma([]);
      }
      setSuccessMessage('Arma eliminada correctamente.');
    } catch (deleteError) {
      setError(extractErrorMessage(deleteError, 'No se pudo eliminar el arma.'));
    }
  }

  async function handleEliminarCargador(id: number) {
    const confirmed = window.confirm('Se eliminara el cargador seleccionado. Desea continuar?');
    if (!confirmed) {
      return;
    }

    try {
      setSuccessMessage(null);
      await cargadoresService.delete(id);
      await loadCargadores();
      setSuccessMessage('Cargador eliminado correctamente.');
    } catch (deleteError) {
      setError(extractErrorMessage(deleteError, 'No se pudo eliminar el cargador.'));
    }
  }

  async function handleEliminarParque(id: number) {
    const confirmed = window.confirm('Se eliminara el parque seleccionado. Desea continuar?');
    if (!confirmed) {
      return;
    }

    try {
      setSuccessMessage(null);
      await parquesService.delete(id);
      await loadParques();
      if (armaSeleccionada && vistaArmas === 'parques') {
        await loadParquesDeArma(armaSeleccionada.serial);
      }
      setSuccessMessage('Parque eliminado correctamente.');
    } catch (deleteError) {
      setError(extractErrorMessage(deleteError, 'No se pudo eliminar el parque.'));
    }
  }

  async function handleToggleParqueArma(parque: ParqueView) {
    if (!armaSeleccionada) {
      return;
    }

    setParqueActionId(parque.id);
    setSuccessMessage(null);

    try {
      if (parque.tieneArma) {
        await parquesService.removeArma(parque.id, armaSeleccionada.serial);
        setSuccessMessage(`El arma ${armaSeleccionada.serial} fue retirada de ${parque.nombre}.`);
      } else {
        await parquesService.assignArma(parque.id, armaSeleccionada.serial);
        setSuccessMessage(`El arma ${armaSeleccionada.serial} fue asignada a ${parque.nombre}.`);
      }

      await Promise.all([loadParques(), loadParquesDeArma(armaSeleccionada.serial)]);
    } catch (actionError) {
      setError(extractErrorMessage(actionError, 'No se pudo actualizar la asignacion del arma.'));
    } finally {
      setParqueActionId(null);
    }
  }

  function handleChangeVistaActual(nextVista: 'armas' | 'cargadores' | 'parques') {
    setVistaActual(nextVista);
    setVistaArmas('lista');
    setArmaSeleccionada(null);
    setParquesArma([]);
    setSuccessMessage(null);
    setError(null);
  }

  return (
    <div>
      <h1 className="mb-6">Gestion de Armas</h1>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-700/40 dark:bg-green-900/20 dark:text-green-300">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => handleChangeVistaActual('armas')}
          className={`min-w-[140px] rounded-xl px-6 py-3 font-medium transition-colors ${
            vistaActual === 'armas'
              ? 'bg-[#0066ff] text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Armas
        </button>
        <button
          onClick={() => handleChangeVistaActual('cargadores')}
          className={`min-w-[140px] rounded-xl px-6 py-3 font-medium transition-colors ${
            vistaActual === 'cargadores'
              ? 'bg-[#0066ff] text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
          }`}
        >
          Cargadores
        </button>
        {isAdmin && (
          <button
            onClick={() => handleChangeVistaActual('parques')}
            className={`min-w-[140px] rounded-xl px-6 py-3 font-medium transition-colors ${
              vistaActual === 'parques'
                ? 'bg-[#0066ff] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            Parques
          </button>
        )}
      </div>

      {vistaActual === 'armas' && (
        <>
          {vistaArmas === 'lista' && (
            <>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row">
                <input
                  placeholder="Buscar por modelo, serial o TAG..."
                  value={busqueda}
                  onChange={(event) => setBusqueda(event.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                {isAdmin && (
                  <button
                    onClick={openCreateArmaModal}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0066ff] px-4 py-2 text-white transition-colors hover:bg-[#0052cc] sm:w-auto"
                  >
                    <Plus size={20} />
                    Agregar
                  </button>
                )}
              </div>

              <div className="space-y-4 md:hidden">
                {isLoadingArmas && (
                  <div className="rounded-lg bg-white px-4 py-8 text-center text-gray-500 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                    Cargando armas...
                  </div>
                )}
                {!isLoadingArmas && armasFiltradas.length === 0 && (
                  <div className="rounded-lg bg-white px-4 py-8 text-center text-gray-500 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                    No hay armas registradas
                  </div>
                )}
                {!isLoadingArmas &&
                  armasFiltradas.map((arma) => (
                    <div key={arma.serial} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-3">
                        <p className="font-semibold text-gray-800 dark:text-slate-100">{arma.modelo}</p>
                        <p className="font-mono text-sm text-gray-500 dark:text-slate-300">{arma.serial}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 dark:text-slate-300">
                        <p><strong>TAG NFC:</strong> {arma.tagNfc}</p>
                        <p><strong>Tipo:</strong> {arma.tipo}</p>
                        <p><strong>Capacidad:</strong> {arma.carga}</p>
                        <p><strong>Calibre:</strong> {arma.calibre}</p>
                        <p><strong>Estado:</strong> {arma.estado}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => void openParquesView(arma)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0066ff] px-4 py-2 text-white transition-colors hover:bg-[#0052cc]"
                        >
                          <Eye size={16} />
                          Ver Parques
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditArmaModal(arma)}
                              className="rounded-lg bg-gray-200 px-3 py-2 text-gray-800 transition-colors hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => void handleEliminarArma(arma.serial)}
                              className="rounded-lg bg-red-600 px-3 py-2 text-white transition-colors hover:bg-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[980px] border-collapse overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-900">
                  <thead className="bg-[#0066ff] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Serial</th>
                      <th className="px-4 py-3 text-left">TAG NFC</th>
                      <th className="px-4 py-3 text-left">Modelo</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Carga</th>
                      <th className="px-4 py-3 text-left">Calibre</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                      <th className="px-4 py-3 text-right">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingArmas && (
                      <tr className="bg-white dark:bg-slate-900">
                        <td colSpan={8} className="border-t px-4 py-8 text-center text-gray-500 dark:border-slate-700 dark:text-slate-300">
                          Cargando armas...
                        </td>
                      </tr>
                    )}
                    {!isLoadingArmas && armasFiltradas.length === 0 && (
                      <tr className="bg-white dark:bg-slate-900">
                        <td colSpan={8} className="border-t px-4 py-8 text-center text-gray-500 dark:border-slate-700 dark:text-slate-300">
                          No hay armas registradas
                        </td>
                      </tr>
                    )}
                    {!isLoadingArmas &&
                      armasFiltradas.map((arma, index) => (
                        <tr key={arma.serial} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-slate-950' : 'bg-white dark:bg-slate-900'}>
                          <td className="border-t px-4 py-3 font-mono dark:border-slate-700 dark:text-slate-100">{arma.serial}</td>
                          <td className="border-t px-4 py-3 font-mono dark:border-slate-700 dark:text-slate-100">{arma.tagNfc}</td>
                          <td className="border-t px-4 py-3 dark:border-slate-700 dark:text-slate-100">{arma.modelo}</td>
                          <td className="border-t px-4 py-3 dark:border-slate-700 dark:text-slate-100">{arma.tipo}</td>
                          <td className="border-t px-4 py-3 dark:border-slate-700 dark:text-slate-100">{arma.carga}</td>
                          <td className="border-t px-4 py-3 dark:border-slate-700 dark:text-slate-100">{arma.calibre}</td>
                          <td className="border-t px-4 py-3 dark:border-slate-700 dark:text-slate-100">{arma.estado}</td>
                          <td className="border-t px-4 py-3 text-right dark:border-slate-700">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => void openParquesView(arma)}
                                className="flex items-center gap-2 rounded-lg bg-[#0066ff] px-4 py-2 text-white transition-colors hover:bg-[#0052cc]"
                              >
                                <Eye size={16} />
                                Ver Parques
                              </button>
                              {isAdmin && (
                                <>
                                  <button
                                    onClick={() => openEditArmaModal(arma)}
                                    className="rounded-lg bg-gray-200 px-3 py-2 text-gray-800 transition-colors hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                                  >
                                    <Pencil size={16} />
                                  </button>
                                  <button
                                    onClick={() => void handleEliminarArma(arma.serial)}
                                    className="rounded-lg bg-red-600 px-3 py-2 text-white transition-colors hover:bg-red-700"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {vistaArmas === 'parques' && armaSeleccionada && (
            <div className="space-y-6">
              <button
                onClick={() => {
                  setVistaArmas('lista');
                  setArmaSeleccionada(null);
                  setParquesArma([]);
                }}
                className="flex items-center gap-2 text-gray-600 transition-colors hover:text-black dark:text-slate-300 dark:hover:text-white"
              >
                <ArrowLeft size={18} />
                Volver al listado
              </button>

              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">{armaSeleccionada.modelo}</h2>
                <div className="mt-4 grid gap-3 text-sm text-gray-600 dark:text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                  <p><strong>Serial:</strong> {armaSeleccionada.serial}</p>
                  <p><strong>TAG NFC:</strong> {armaSeleccionada.tagNfc}</p>
                  <p><strong>Tipo:</strong> {armaSeleccionada.tipo}</p>
                  <p><strong>Estado:</strong> {armaSeleccionada.estado}</p>
                </div>
              </div>

              {isLoadingParquesArma && (
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  Cargando parques...
                </div>
              )}

              {!isLoadingParquesArma && parquesArma.length === 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-8 text-center text-gray-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  No hay parques registrados.
                </div>
              )}

              {!isLoadingParquesArma && parquesArma.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  {parquesArma.map((parque) => (
                    <div key={parque.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">{parque.nombre}</h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
                            {parque.descripcion || 'Sin descripcion registrada'}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          parque.tieneArma
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}>
                          {parque.tieneArma ? 'Asignada' : 'No asignada'}
                        </span>
                      </div>
                      <p className="mt-4 text-sm text-gray-600 dark:text-slate-300">
                        Armas en este parque: <strong>{parque.cantidadArmas}</strong>
                      </p>
                      {isAdmin && (
                        <button
                          onClick={() => void handleToggleParqueArma(parque)}
                          disabled={parqueActionId === parque.id}
                          className={`mt-4 w-full rounded-lg px-4 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            parque.tieneArma ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0066ff] hover:bg-[#0052cc]'
                          }`}
                        >
                          {parqueActionId === parque.id
                            ? 'Guardando...'
                            : parque.tieneArma
                              ? 'Retirar de este parque'
                              : 'Asignar a este parque'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {vistaActual === 'cargadores' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <input
              placeholder="Buscar cargador..."
              value={cargadoresBusqueda}
              onChange={(event) => setCargadoresBusqueda(event.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            {isAdmin && (
              <button
                onClick={openCreateCargadorModal}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0066ff] px-4 py-2 text-white transition-colors hover:bg-[#0052cc] sm:w-auto"
              >
                <Plus size={20} />
                Agregar
              </button>
            )}
          </div>

          <div className="space-y-4 md:hidden">
            {isLoadingCargadores && (
              <div className="rounded-lg bg-white px-4 py-8 text-center text-gray-500 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                Cargando cargadores...
              </div>
            )}
            {!isLoadingCargadores && cargadoresFiltrados.length === 0 && (
              <div className="rounded-lg bg-white px-4 py-8 text-center text-gray-500 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                No hay cargadores registrados
              </div>
            )}
            {!isLoadingCargadores &&
              cargadoresFiltrados.map((cargador) => (
                <div key={cargador.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-slate-100">{cargador.nombre}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-300">Capacidad: {cargador.capacidad}</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                      {cargador.estado}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">Disponibles: {cargador.cantidadDisponible}</p>
                  {isAdmin && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openEditCargadorModal(cargador)}
                        className="rounded-lg bg-gray-200 px-3 py-2 text-gray-800 transition-colors hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => void handleEliminarCargador(cargador.id)}
                        className="rounded-lg bg-red-600 px-3 py-2 text-white transition-colors hover:bg-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-900">
              <thead className="bg-[#0066ff] text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Capacidad</th>
                  <th className="px-4 py-3 text-left">Disponibles</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">Accion</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingCargadores && (
                  <tr className="bg-white dark:bg-slate-900">
                    <td colSpan={5} className="border-t px-4 py-8 text-center text-gray-500 dark:border-slate-700 dark:text-slate-300">
                      Cargando cargadores...
                    </td>
                  </tr>
                )}
                {!isLoadingCargadores && cargadoresFiltrados.length === 0 && (
                  <tr className="bg-white dark:bg-slate-900">
                    <td colSpan={5} className="border-t px-4 py-8 text-center text-gray-500 dark:border-slate-700 dark:text-slate-300">
                      No hay cargadores registrados
                    </td>
                  </tr>
                )}
                {!isLoadingCargadores &&
                  cargadoresFiltrados.map((cargador, index) => (
                    <tr key={cargador.id} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-slate-950' : 'bg-white dark:bg-slate-900'}>
                      <td className="border-t px-4 py-3 dark:border-slate-700 dark:text-slate-100">{cargador.nombre}</td>
                      <td className="border-t px-4 py-3 dark:border-slate-700 dark:text-slate-100">{cargador.capacidad}</td>
                      <td className="border-t px-4 py-3 dark:border-slate-700 dark:text-slate-100">{cargador.cantidadDisponible}</td>
                      <td className="border-t px-4 py-3 dark:border-slate-700 dark:text-slate-100">{cargador.estado}</td>
                      <td className="border-t px-4 py-3 text-right dark:border-slate-700">
                        {isAdmin && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditCargadorModal(cargador)}
                              className="rounded-lg bg-gray-200 px-3 py-2 text-gray-800 transition-colors hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => void handleEliminarCargador(cargador.id)}
                              className="rounded-lg bg-red-600 px-3 py-2 text-white transition-colors hover:bg-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vistaActual === 'parques' && isAdmin && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <input
              placeholder="Buscar parque..."
              value={parquesBusqueda}
              onChange={(event) => setParquesBusqueda(event.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <button
              onClick={openCreateParqueModal}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0066ff] px-4 py-2 text-white transition-colors hover:bg-[#0052cc] sm:w-auto"
            >
              <Plus size={20} />
              Agregar
            </button>
          </div>

          <div className="space-y-4 md:hidden">
            {isLoadingParques && (
              <div className="rounded-lg bg-white px-4 py-8 text-center text-gray-500 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                Cargando parques...
              </div>
            )}
            {!isLoadingParques && parquesFiltrados.length === 0 && (
              <div className="rounded-lg bg-white px-4 py-8 text-center text-gray-500 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                No hay parques registrados
              </div>
            )}
            {!isLoadingParques &&
              parquesFiltrados.map((parque) => (
                <div key={parque.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-slate-100">{parque.nombre}</p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">
                        {parque.descripcion || 'Sin descripcion registrada'}
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                      {parque.cantidadArmas} armas
                    </span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openEditParqueModal(parque)}
                      className="rounded-lg bg-gray-200 px-3 py-2 text-gray-800 transition-colors hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => void handleEliminarParque(parque.id)}
                      className="rounded-lg bg-red-600 px-3 py-2 text-white transition-colors hover:bg-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse overflow-hidden rounded-lg bg-white shadow-sm dark:bg-slate-900">
              <thead className="bg-[#0066ff] text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Descripcion</th>
                  <th className="px-4 py-3 text-left">Armas</th>
                  <th className="px-4 py-3 text-right">Accion</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingParques && (
                  <tr className="bg-white dark:bg-slate-900">
                    <td colSpan={4} className="border-t px-4 py-8 text-center text-gray-500 dark:border-slate-700 dark:text-slate-300">
                      Cargando parques...
                    </td>
                  </tr>
                )}
                {!isLoadingParques && parquesFiltrados.length === 0 && (
                  <tr className="bg-white dark:bg-slate-900">
                    <td colSpan={4} className="border-t px-4 py-8 text-center text-gray-500 dark:border-slate-700 dark:text-slate-300">
                      No hay parques registrados
                    </td>
                  </tr>
                )}
                {!isLoadingParques &&
                  parquesFiltrados.map((parque, index) => (
                    <tr key={parque.id} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-slate-950' : 'bg-white dark:bg-slate-900'}>
                      <td className="border-t px-4 py-3 dark:border-slate-700 dark:text-slate-100">{parque.nombre}</td>
                      <td className="border-t px-4 py-3 dark:border-slate-700 dark:text-slate-100">{parque.descripcion || '-'}</td>
                      <td className="border-t px-4 py-3 dark:border-slate-700 dark:text-slate-100">{parque.cantidadArmas}</td>
                      <td className="border-t px-4 py-3 text-right dark:border-slate-700">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditParqueModal(parque)}
                            className="rounded-lg bg-gray-200 px-3 py-2 text-gray-800 transition-colors hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => void handleEliminarParque(parque.id)}
                            className="rounded-lg bg-red-600 px-3 py-2 text-white transition-colors hover:bg-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {mostrarArmaModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/76 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-bold text-gray-800 dark:text-slate-100">
              {editingArmaSerial ? 'Editar Arma' : 'Agregar Nueva Arma'}
            </h2>

            {armaFormError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                {armaFormError}
              </div>
            )}

            <div className="space-y-3">
              <input
                placeholder="Serial"
                value={armaFormState.serial}
                disabled={Boolean(editingArmaSerial)}
                onChange={(event) => setArmaFormState({ ...armaFormState, serial: event.target.value })}
                className="w-full rounded border border-gray-300 p-2 disabled:bg-gray-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800"
              />
              <input
                placeholder="TAG NFC"
                value={armaFormState.tagNfc}
                onChange={(event) => setArmaFormState({ ...armaFormState, tagNfc: event.target.value })}
                className="w-full rounded border border-gray-300 p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <input
                placeholder="Modelo"
                value={armaFormState.modelo}
                onChange={(event) => setArmaFormState({ ...armaFormState, modelo: event.target.value })}
                className="w-full rounded border border-gray-300 p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <input
                placeholder="Tipo"
                value={armaFormState.tipo}
                onChange={(event) => setArmaFormState({ ...armaFormState, tipo: event.target.value })}
                className="w-full rounded border border-gray-300 p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <input
                type="number"
                min="0"
                placeholder="Capacidad de carga"
                value={armaFormState.carga}
                onChange={(event) => setArmaFormState({ ...armaFormState, carga: event.target.value })}
                className="w-full rounded border border-gray-300 p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <input
                placeholder="Calibre"
                value={armaFormState.calibre}
                onChange={(event) => setArmaFormState({ ...armaFormState, calibre: event.target.value })}
                className="w-full rounded border border-gray-300 p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <select
                value={armaFormState.estado}
                onChange={(event) =>
                  setArmaFormState({
                    ...armaFormState,
                    estado: event.target.value as Arma['ESTADO_DISPONIBILIDAD'],
                  })
                }
                className="w-full rounded border border-gray-300 p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="DISPONIBLE">DISPONIBLE</option>
                <option value="ASIGNADO">ASIGNADO</option>
                <option value="MANTENIMIENTO">MANTENIMIENTO</option>
              </select>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => void handleGuardarArma()}
                disabled={isSavingArma}
                className="flex-1 rounded-lg bg-[#0066ff] py-2 text-white transition-colors hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingArma ? 'Guardando...' : editingArmaSerial ? 'Guardar cambios' : 'Agregar'}
              </button>
              <button
                onClick={resetArmaForm}
                disabled={isSavingArma}
                className="flex-1 rounded-lg bg-gray-300 py-2 text-gray-800 transition-colors hover:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarCargadorModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/76 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 text-xl font-bold text-gray-800 dark:text-slate-100">
              {editingCargadorId !== null ? 'Editar Cargador' : 'Agregar Cargador'}
            </h2>

            {cargadorFormError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                {cargadorFormError}
              </div>
            )}

            <div className="space-y-3">
              <input
                placeholder="Nombre o modelo"
                value={cargadorFormState.nombre}
                onChange={(event) => setCargadorFormState({ ...cargadorFormState, nombre: event.target.value })}
                className="w-full rounded border border-gray-300 p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <input
                type="number"
                min="0"
                placeholder="Capacidad"
                value={cargadorFormState.capacidad}
                onChange={(event) => setCargadorFormState({ ...cargadorFormState, capacidad: event.target.value })}
                className="w-full rounded border border-gray-300 p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <input
                type="number"
                min="0"
                placeholder="Cantidad disponible"
                value={cargadorFormState.cantidadDisponible}
                onChange={(event) => setCargadorFormState({ ...cargadorFormState, cantidadDisponible: event.target.value })}
                className="w-full rounded border border-gray-300 p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <select
                value={cargadorFormState.estado}
                onChange={(event) =>
                  setCargadorFormState({
                    ...cargadorFormState,
                    estado: event.target.value as Cargador['ESTADO'],
                  })
                }
                className="w-full rounded border border-gray-300 p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="DISPONIBLE">DISPONIBLE</option>
                <option value="RESERVA">RESERVA</option>
                <option value="MANTENIMIENTO">MANTENIMIENTO</option>
              </select>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => void handleGuardarCargador()}
                disabled={isSavingCargador}
                className="flex-1 rounded-lg bg-[#0066ff] py-2 text-white transition-colors hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingCargador ? 'Guardando...' : editingCargadorId !== null ? 'Guardar cambios' : 'Agregar'}
              </button>
              <button
                onClick={resetCargadorForm}
                disabled={isSavingCargador}
                className="flex-1 rounded-lg bg-gray-300 py-2 text-gray-800 transition-colors hover:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarParqueModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/76 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-slate-100">
              <Building2 size={20} />
              {editingParqueId !== null ? 'Editar Parque' : 'Agregar Parque'}
            </h2>

            {parqueFormError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                {parqueFormError}
              </div>
            )}

            <div className="space-y-3">
              <input
                placeholder="Nombre del parque"
                value={parqueFormState.nombre}
                onChange={(event) => setParqueFormState({ ...parqueFormState, nombre: event.target.value })}
                className="w-full rounded border border-gray-300 p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <textarea
                rows={4}
                placeholder="Descripcion"
                value={parqueFormState.descripcion}
                onChange={(event) => setParqueFormState({ ...parqueFormState, descripcion: event.target.value })}
                className="w-full rounded border border-gray-300 p-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => void handleGuardarParque()}
                disabled={isSavingParque}
                className="flex-1 rounded-lg bg-[#0066ff] py-2 text-white transition-colors hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingParque ? 'Guardando...' : editingParqueId !== null ? 'Guardar cambios' : 'Agregar'}
              </button>
              <button
                onClick={resetParqueForm}
                disabled={isSavingParque}
                className="flex-1 rounded-lg bg-gray-300 py-2 text-gray-800 transition-colors hover:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function mapArmaToView(arma: Arma): ArmaView {
  return {
    serial: arma.SERIAL_ARMA,
    tagNfc: arma.TAG_NFC,
    modelo: arma.MODELO,
    tipo: arma.TIPO,
    carga: arma.CAPACIDAD_CARGA,
    calibre: arma.CALIBRE,
    estado: arma.ESTADO_DISPONIBILIDAD,
  };
}

function mapCargadorToView(cargador: Cargador): CargadorView {
  return {
    id: cargador.ID_CARGADOR,
    nombre: cargador.NOMBRE,
    capacidad: cargador.CAPACIDAD,
    cantidadDisponible: cargador.CANTIDAD_DISPONIBLE,
    estado: cargador.ESTADO,
  };
}

function mapParqueToView(parque: Parque): ParqueView {
  return {
    id: parque.ID_PARQUE,
    nombre: parque.NOMBRE,
    descripcion: parque.DESCRIPCION ?? '',
    cantidadArmas: Number(parque.CANTIDAD_ARMAS ?? 0),
    tieneArma: Boolean(Number(parque.TIENE_ARMA ?? 0)),
  };
}
