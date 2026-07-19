import { useEffect, useMemo, useState } from 'react';
import { Award, Building2, ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import {
  catalogosService,
  extractErrorMessage,
  personalService,
  type Compania,
  type CompaniaPayload,
  type Jerarquia,
  type JerarquiaPayload,
  type PersonalMilitar,
  type PersonalPayload,
} from '../services/databaseService';
import { extractCedulaDigits, formatCedula } from '../utils/cedula';

interface PersonalView {
  cedula: string;
  jerarquia: string;
  nombre: string;
  apellido: string;
  contingente: string;
  compania: string;
  telefono: string;
  idJerarquia: number;
  idCompania: number;
}

interface PersonalFormState {
  cedula: string;
  idJerarquia: string;
  nombre: string;
  apellido: string;
  contingente: string;
  idCompania: string;
  telefono: string;
}

interface CatalogoFormState {
  nombre: string;
  regimiento: string;
}

type CatalogoModalTipo = 'jerarquias' | 'companias' | null;
type FiltroTipo = 'todos' | 'cedula' | 'compania' | 'jerarquia';

const initialFormState: PersonalFormState = {
  cedula: '',
  idJerarquia: '',
  nombre: '',
  apellido: '',
  contingente: '',
  idCompania: '',
  telefono: '',
};

const initialCatalogoFormState: CatalogoFormState = {
  nombre: '',
  regimiento: '',
};

const ITEMS_PER_PAGE = 6;

export function PersonalModule() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [personal, setPersonal] = useState<PersonalView[]>([]);
  const [jerarquias, setJerarquias] = useState<Jerarquia[]>([]);
  const [companias, setCompanias] = useState<Compania[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [filtroValor, setFiltroValor] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);
  const [expandedCedula, setExpandedCedula] = useState<string | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarCatalogoModal, setMostrarCatalogoModal] = useState<CatalogoModalTipo>(null);
  const [formState, setFormState] = useState<PersonalFormState>(initialFormState);
  const [catalogoFormState, setCatalogoFormState] = useState<CatalogoFormState>(initialCatalogoFormState);
  const [editingCedula, setEditingCedula] = useState<string | null>(null);
  const [editingCatalogoId, setEditingCatalogoId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCatalogo, setIsSavingCatalogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [catalogoError, setCatalogoError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    setPaginaActual(1);
    setExpandedCedula(null);
  }, [busqueda, filtroTipo, filtroValor]);

  useEffect(() => {
    setFiltroValor('');
  }, [filtroTipo]);

  useEffect(() => {
    if (!mostrarFormulario && !mostrarCatalogoModal) {
      return;
    }

    document.body.classList.add('nova-modal-open');
    return () => {
      document.body.classList.remove('nova-modal-open');
    };
  }, [mostrarFormulario, mostrarCatalogoModal]);

  const personalFiltrado = useMemo(() => {
    const valorBusqueda = busqueda.trim().toLowerCase();

    const filtered = personal.filter((persona) => {
      const coincideBusqueda =
        !valorBusqueda ||
        persona.cedula.toLowerCase().includes(valorBusqueda) ||
        persona.nombre.toLowerCase().includes(valorBusqueda) ||
        persona.apellido.toLowerCase().includes(valorBusqueda) ||
        persona.compania.toLowerCase().includes(valorBusqueda) ||
        persona.jerarquia.toLowerCase().includes(valorBusqueda);

      if (!coincideBusqueda) {
        return false;
      }

      if (filtroTipo === 'todos' || !filtroValor) {
        return true;
      }

      if (filtroTipo === 'cedula') {
        return persona.cedula === filtroValor;
      }

      if (filtroTipo === 'compania') {
        return String(persona.idCompania) === filtroValor;
      }

      if (filtroTipo === 'jerarquia') {
        return String(persona.idJerarquia) === filtroValor;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const nombreA = `${a.nombre} ${a.apellido}`.toLowerCase();
      const nombreB = `${b.nombre} ${b.apellido}`.toLowerCase();
      return nombreA.localeCompare(nombreB) || a.cedula.localeCompare(b.cedula);
    });
  }, [busqueda, filtroTipo, filtroValor, personal]);

  const totalPages = Math.max(1, Math.ceil(personalFiltrado.length / ITEMS_PER_PAGE));
  const paginaSegura = Math.min(paginaActual, totalPages);
  const personalPaginado = useMemo(() => {
    const startIndex = (paginaSegura - 1) * ITEMS_PER_PAGE;
    return personalFiltrado.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [paginaSegura, personalFiltrado]);

  async function loadInitialData() {
    setIsLoading(true);
    setError(null);

    try {
      const [personalRows, jerarquiasRows, companiasRows] = await Promise.all([
        personalService.getAll(),
        catalogosService.getJerarquias(),
        catalogosService.getCompanias(),
      ]);

      setPersonal(personalRows.map(mapPersonalToView));
      setJerarquias(jerarquiasRows);
      setCompanias(companiasRows);
    } catch (loadError) {
      setError(extractErrorMessage(loadError, 'No se pudo cargar el modulo de personal.'));
      setPersonal([]);
      setJerarquias([]);
      setCompanias([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function reloadPersonal() {
    try {
      const personalRows = await personalService.getAll();
      setPersonal(personalRows.map(mapPersonalToView));
    } catch (reloadError) {
      setError(extractErrorMessage(reloadError, 'No se pudo recargar el personal.'));
    }
  }

  async function reloadCatalogos() {
    try {
      const [jerarquiasRows, companiasRows] = await Promise.all([
        catalogosService.getJerarquias(),
        catalogosService.getCompanias(),
      ]);
      setJerarquias(jerarquiasRows);
      setCompanias(companiasRows);
    } catch (reloadError) {
      setError(extractErrorMessage(reloadError, 'No se pudieron recargar los catalogos.'));
    }
  }

  function resetForm() {
    setFormState(initialFormState);
    setEditingCedula(null);
    setFormError(null);
    setMostrarFormulario(false);
  }

  function resetCatalogoForm() {
    setCatalogoFormState(initialCatalogoFormState);
    setEditingCatalogoId(null);
    setCatalogoError(null);
  }

  function closeCatalogoModal() {
    setMostrarCatalogoModal(null);
    resetCatalogoForm();
  }

  function openCreateForm() {
    setSuccessMessage(null);
    setFormError(null);
    setEditingCedula(null);
    setFormState(initialFormState);
    setMostrarFormulario(true);
  }

  function openEditForm(persona: PersonalView) {
    setSuccessMessage(null);
    setFormError(null);
    setEditingCedula(persona.cedula);
    setFormState({
      cedula: extractCedulaDigits(persona.cedula),
      idJerarquia: String(persona.idJerarquia),
      nombre: persona.nombre,
      apellido: persona.apellido,
      contingente: persona.contingente,
      idCompania: String(persona.idCompania),
      telefono: persona.telefono,
    });
    setMostrarFormulario(true);
  }

  function openCatalogoModal(tipo: Exclude<CatalogoModalTipo, null>) {
    setSuccessMessage(null);
    setCatalogoError(null);
    setEditingCatalogoId(null);
    setCatalogoFormState(initialCatalogoFormState);
    setMostrarCatalogoModal(tipo);
  }

  function openEditJerarquia(jerarquia: Jerarquia) {
    setCatalogoError(null);
    setEditingCatalogoId(jerarquia.ID_JERARQUIA);
    setCatalogoFormState({
      nombre: jerarquia.NOMBRE_JERARQUIA,
      regimiento: '',
    });
    setMostrarCatalogoModal('jerarquias');
  }

  function openEditCompania(compania: Compania) {
    setCatalogoError(null);
    setEditingCatalogoId(compania.ID_COMPANIA);
    setCatalogoFormState({
      nombre: compania.NOMBRE_COMPANIA,
      regimiento: compania.NUM_REGIMIENTO,
    });
    setMostrarCatalogoModal('companias');
  }

  async function handleSubmit() {
    setFormError(null);
    setSuccessMessage(null);

    if (
      !formState.cedula.trim() ||
      !formState.idJerarquia ||
      !formState.nombre.trim() ||
      !formState.apellido.trim() ||
      !formState.contingente.trim() ||
      !formState.idCompania
    ) {
      setFormError('Complete los campos obligatorios antes de guardar.');
      return;
    }

    const payload: PersonalPayload = {
      CEDULA: formState.cedula.trim(),
      ID_JERARQUIA: Number(formState.idJerarquia),
      NOMBRE: formState.nombre.trim(),
      APELLIDO: formState.apellido.trim(),
      CONTINGENTE: formState.contingente.trim(),
      ID_COMPANIA: Number(formState.idCompania),
      TELEFONO: formState.telefono.trim() || null,
    };

    setIsSaving(true);

    try {
      if (editingCedula) {
        await personalService.update(editingCedula, {
          ID_JERARQUIA: payload.ID_JERARQUIA,
          NOMBRE: payload.NOMBRE,
          APELLIDO: payload.APELLIDO,
          CONTINGENTE: payload.CONTINGENTE,
          ID_COMPANIA: payload.ID_COMPANIA,
          TELEFONO: payload.TELEFONO,
        });
        setSuccessMessage('Personal actualizado correctamente.');
      } else {
        await personalService.create(payload);
        setSuccessMessage('Personal registrado correctamente.');
      }

      await reloadPersonal();
      resetForm();
    } catch (saveError) {
      setFormError(extractErrorMessage(saveError, 'No se pudo guardar el personal.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeletePersonal(cedula: string) {
    const confirmed = window.confirm(`Se eliminara el personal ${cedula}. Desea continuar?`);
    if (!confirmed) {
      return;
    }

    try {
      setSuccessMessage(null);
      await personalService.delete(cedula);
      await reloadPersonal();
      setSuccessMessage('Personal eliminado correctamente.');
    } catch (deleteError) {
      setError(extractErrorMessage(deleteError, 'No se pudo eliminar el personal.'));
    }
  }

  async function handleGuardarCatalogo() {
    if (!mostrarCatalogoModal) {
      return;
    }

    setCatalogoError(null);
    setSuccessMessage(null);

    if (!catalogoFormState.nombre.trim()) {
      setCatalogoError('El nombre es obligatorio.');
      return;
    }

    if (mostrarCatalogoModal === 'companias' && !catalogoFormState.regimiento.trim()) {
      setCatalogoError('El regimiento es obligatorio.');
      return;
    }

    setIsSavingCatalogo(true);

    try {
      if (mostrarCatalogoModal === 'jerarquias') {
        const payload: JerarquiaPayload = {
          NOMBRE_JERARQUIA: catalogoFormState.nombre.trim(),
        };

        if (editingCatalogoId !== null) {
          await catalogosService.updateJerarquia(editingCatalogoId, payload);
          setSuccessMessage('Jerarquia actualizada correctamente.');
        } else {
          await catalogosService.createJerarquia(payload);
          setSuccessMessage('Jerarquia creada correctamente.');
        }
      } else {
        const payload: CompaniaPayload = {
          NOMBRE_COMPANIA: catalogoFormState.nombre.trim(),
          NUM_REGIMIENTO: catalogoFormState.regimiento.trim(),
        };

        if (editingCatalogoId !== null) {
          await catalogosService.updateCompania(editingCatalogoId, payload);
          setSuccessMessage('Compania actualizada correctamente.');
        } else {
          await catalogosService.createCompania(payload);
          setSuccessMessage('Compania creada correctamente.');
        }
      }

      await Promise.all([reloadCatalogos(), reloadPersonal()]);
      resetCatalogoForm();
    } catch (saveError) {
      setCatalogoError(extractErrorMessage(saveError, 'No se pudo guardar el catalogo.'));
    } finally {
      setIsSavingCatalogo(false);
    }
  }

  async function handleEliminarJerarquia(id: number) {
    const confirmed = window.confirm('Se eliminara la jerarquia seleccionada. Desea continuar?');
    if (!confirmed) {
      return;
    }

    try {
      setSuccessMessage(null);
      await catalogosService.deleteJerarquia(id);
      await Promise.all([reloadCatalogos(), reloadPersonal()]);
      setSuccessMessage('Jerarquia eliminada correctamente.');
      if (editingCatalogoId === id) {
        resetCatalogoForm();
      }
    } catch (deleteError) {
      setCatalogoError(extractErrorMessage(deleteError, 'No se pudo eliminar la jerarquia.'));
    }
  }

  async function handleEliminarCompania(id: number) {
    const confirmed = window.confirm('Se eliminara la compania seleccionada. Desea continuar?');
    if (!confirmed) {
      return;
    }

    try {
      setSuccessMessage(null);
      await catalogosService.deleteCompania(id);
      await Promise.all([reloadCatalogos(), reloadPersonal()]);
      setSuccessMessage('Compania eliminada correctamente.');
      if (editingCatalogoId === id) {
        resetCatalogoForm();
      }
    } catch (deleteError) {
      setCatalogoError(extractErrorMessage(deleteError, 'No se pudo eliminar la compania.'));
    }
  }

  const filtroOpciones = useMemo(() => {
    if (filtroTipo === 'cedula') {
      return personal.map((persona) => ({ value: persona.cedula, label: `${formatCedula(persona.cedula)} - ${persona.nombre} ${persona.apellido}` }));
    }

    if (filtroTipo === 'compania') {
      return companias.map((compania) => ({ value: String(compania.ID_COMPANIA), label: compania.NOMBRE_COMPANIA }));
    }

    if (filtroTipo === 'jerarquia') {
      return jerarquias.map((jerarquia) => ({ value: String(jerarquia.ID_JERARQUIA), label: jerarquia.NOMBRE_JERARQUIA }));
    }

    return [];
  }, [companias, filtroTipo, jerarquias, personal]);

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h1 className="mb-3 text-center">Gestion de Personal</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Esta seccion solo esta disponible para administradores.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-center">Gestion de Personal</h1>

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

      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              onClick={openCreateForm}
              className="flex items-center justify-center gap-2 rounded-lg bg-[#0066ff] px-4 py-2 text-white transition-colors hover:bg-[#0052cc]"
            >
              <Plus size={18} />
              Agregar
            </button>
            <button
              onClick={() => openCatalogoModal('jerarquias')}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Award size={18} />
              Jerarquias
            </button>
            <button
              onClick={() => openCatalogoModal('companias')}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Building2 size={18} />
              Companias
            </button>
          </div>

          <div className={`grid gap-3 ${filtroTipo === 'todos' ? 'lg:grid-cols-[minmax(0,1fr)_220px]' : 'lg:grid-cols-[minmax(0,1fr)_220px_260px]'}`}>
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={20} />
              <input
                type="text"
                placeholder="Buscar por cedula, nombre, apellido, compania o jerarquia..."
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <select
              value={filtroTipo}
              onChange={(event) => setFiltroTipo(event.target.value as FiltroTipo)}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="todos">Sin filtro</option>
              <option value="cedula">Filtrar por cedula</option>
              <option value="compania">Filtrar por compania</option>
              <option value="jerarquia">Filtrar por jerarquia</option>
            </select>

            {filtroTipo !== 'todos' && (
              <select
                value={filtroValor}
                onChange={(event) => setFiltroValor(event.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">Seleccione una opcion</option>
                {filtroOpciones.map((opcion) => (
                  <option key={opcion.value} value={opcion.value}>
                    {opcion.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/76 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-slate-100">
                  {editingCedula ? 'Editar Personal' : 'Nuevo Personal'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-300">
                  Completa la informacion del personal para guardarla en el sistema.
                </p>
              </div>
              <button
                onClick={resetForm}
                className="rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Cerrar formulario"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                {formError}
              </div>
            )}

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <input
                type="text"
                placeholder="Cedula"
                value={formState.cedula}
                disabled={Boolean(editingCedula)}
                onChange={(event) =>
                  setFormState({
                    ...formState,
                    cedula: extractCedulaDigits(event.target.value),
                  })
                }
                className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff] disabled:bg-gray-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800"
              />
              <select
                value={formState.idJerarquia}
                onChange={(event) => setFormState({ ...formState, idJerarquia: event.target.value })}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">Seleccione jerarquia</option>
                {jerarquias.map((jerarquia) => (
                  <option key={jerarquia.ID_JERARQUIA} value={jerarquia.ID_JERARQUIA}>
                    {jerarquia.NOMBRE_JERARQUIA}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Nombre"
                value={formState.nombre}
                onChange={(event) => setFormState({ ...formState, nombre: event.target.value })}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <input
                type="text"
                placeholder="Apellido"
                value={formState.apellido}
                onChange={(event) => setFormState({ ...formState, apellido: event.target.value })}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <input
                type="text"
                placeholder="Contingente"
                value={formState.contingente}
                onChange={(event) => setFormState({ ...formState, contingente: event.target.value })}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <select
                value={formState.idCompania}
                onChange={(event) => setFormState({ ...formState, idCompania: event.target.value })}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="">Seleccione compania</option>
                {companias.map((compania) => (
                  <option key={compania.ID_COMPANIA} value={compania.ID_COMPANIA}>
                    {compania.NOMBRE_COMPANIA}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                placeholder="Telefono"
                value={formState.telefono}
                onChange={(event) => setFormState({ ...formState, telefono: event.target.value })}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => void handleSubmit()}
                disabled={isSaving}
                className="rounded-lg bg-[#0066ff] px-4 py-2 text-white transition-colors hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={resetForm}
                disabled={isSaving}
                className="rounded-lg bg-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarCatalogoModal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/76 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-slate-100">
                  {mostrarCatalogoModal === 'jerarquias' ? 'Gestionar jerarquias' : 'Gestionar companias'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-300">
                  {mostrarCatalogoModal === 'jerarquias'
                    ? 'Crea, edita o elimina las jerarquias disponibles.'
                    : 'Crea, edita o elimina las companias disponibles.'}
                </p>
              </div>
              <button
                onClick={closeCatalogoModal}
                className="rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Cerrar catalogo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {catalogoError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-300">
                {catalogoError}
              </div>
            )}

            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <input
                type="text"
                placeholder={mostrarCatalogoModal === 'jerarquias' ? 'Nombre de jerarquia' : 'Nombre de compania'}
                value={catalogoFormState.nombre}
                onChange={(event) => setCatalogoFormState({ ...catalogoFormState, nombre: event.target.value })}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              {mostrarCatalogoModal === 'companias' && (
                <input
                  type="text"
                  placeholder="Regimiento"
                  value={catalogoFormState.regimiento}
                  onChange={(event) => setCatalogoFormState({ ...catalogoFormState, regimiento: event.target.value })}
                  className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => void handleGuardarCatalogo()}
                  disabled={isSavingCatalogo}
                  className="flex-1 rounded-lg bg-[#0066ff] px-4 py-2 text-white transition-colors hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSavingCatalogo ? 'Guardando...' : editingCatalogoId !== null ? 'Guardar' : 'Crear'}
                </button>
                {editingCatalogoId !== null && (
                  <button
                    onClick={resetCatalogoForm}
                    className="rounded-lg bg-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-400 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {mostrarCatalogoModal === 'jerarquias' ? (
                jerarquias.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-gray-500 dark:border-slate-700 dark:text-slate-300">
                    No hay jerarquias registradas.
                  </div>
                ) : (
                  jerarquias.map((jerarquia) => (
                    <div key={jerarquia.ID_JERARQUIA} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-950">
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-slate-100">{jerarquia.NOMBRE_JERARQUIA}</p>
                        <p className="text-sm text-gray-500 dark:text-slate-300">ID: {jerarquia.ID_JERARQUIA}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditJerarquia(jerarquia)}
                          className="rounded-lg bg-gray-200 px-3 py-2 text-gray-800 transition-colors hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => void handleEliminarJerarquia(jerarquia.ID_JERARQUIA)}
                          className="rounded-lg bg-red-600 px-3 py-2 text-white transition-colors hover:bg-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : companias.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 px-4 py-8 text-center text-gray-500 dark:border-slate-700 dark:text-slate-300">
                  No hay companias registradas.
                </div>
              ) : (
                companias.map((compania) => (
                  <div key={compania.ID_COMPANIA} className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-950">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-slate-100">{compania.NOMBRE_COMPANIA}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-300">{compania.NUM_REGIMIENTO}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditCompania(compania)}
                        className="rounded-lg bg-gray-200 px-3 py-2 text-gray-800 transition-colors hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => void handleEliminarCompania(compania.ID_COMPANIA)}
                        className="rounded-lg bg-red-600 px-3 py-2 text-white transition-colors hover:bg-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-gray-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Cargando personal...
        </div>
      )}

      {!isLoading && personalFiltrado.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-gray-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          No hay personal registrado.
        </div>
      )}

      {!isLoading && personalFiltrado.length > 0 && (
        <div className="space-y-4">
          {personalPaginado.map((persona) => {
            const isOpen = expandedCedula === persona.cedula;
            return (
              <div key={persona.cedula} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <button
                  onClick={() => setExpandedCedula((current) => (current === persona.cedula ? null : persona.cedula))}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/60"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-slate-100">{persona.nombre} {persona.apellido}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-slate-300">
                      <span>{formatCedula(persona.cedula)}</span>
                      <span>{persona.jerarquia}</span>
                      <span>{persona.compania}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-gray-500 dark:text-slate-300">
                    {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-200 px-4 py-4 dark:border-slate-700">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <InfoItem label="Cedula" value={formatCedula(persona.cedula)} />
                      <InfoItem label="Jerarquia" value={persona.jerarquia} />
                      <InfoItem label="Compania" value={persona.compania} />
                      <InfoItem label="Contingente" value={persona.contingente} />
                      <InfoItem label="Telefono" value={persona.telefono || '-'} />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => openEditForm(persona)}
                        className="flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm text-gray-800 transition-colors hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                      >
                        <Pencil size={16} />
                        Editar
                      </button>
                      <button
                        onClick={() => void handleDeletePersonal(persona.cedula)}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white transition-colors hover:bg-red-700"
                      >
                        <Trash2 size={16} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPaginaActual((current) => Math.max(1, current - 1))}
                disabled={paginaSegura === 1}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600 dark:text-slate-300">
                Pagina {paginaSegura} de {totalPages}
              </span>
              <button
                onClick={() => setPaginaActual((current) => Math.min(totalPages, current + 1))}
                disabled={paginaSegura === totalPages}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Siguiente
              </button>
            </div>
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

function mapPersonalToView(persona: PersonalMilitar): PersonalView {
  return {
    cedula: persona.CEDULA,
    jerarquia: persona.JERARQUIA_NOMBRE || `Jerarquia #${persona.ID_JERARQUIA}`,
    nombre: persona.NOMBRE,
    apellido: persona.APELLIDO,
    contingente: persona.CONTINGENTE,
    compania: persona.COMPANIA_NOMBRE || `Compania #${persona.ID_COMPANIA}`,
    telefono: persona.TELEFONO || '',
    idJerarquia: persona.ID_JERARQUIA,
    idCompania: persona.ID_COMPANIA,
  };
}
