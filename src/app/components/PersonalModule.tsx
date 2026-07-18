import { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, Pencil, Plus, Search } from 'lucide-react';
import {
  catalogosService,
  extractErrorMessage,
  personalService,
  type Compania,
  type Jerarquia,
  type PersonalMilitar,
  type PersonalPayload,
} from '../services/databaseService';

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

type OrdenTipo = 'cedula' | 'compania';
type BusquedaTipo = 'cedula' | 'nombre' | 'apellido' | 'compania';

const initialFormState: PersonalFormState = {
  cedula: '',
  idJerarquia: '',
  nombre: '',
  apellido: '',
  contingente: '',
  idCompania: '',
  telefono: '',
};

export function PersonalModule() {
  const [personal, setPersonal] = useState<PersonalView[]>([]);
  const [jerarquias, setJerarquias] = useState<Jerarquia[]>([]);
  const [companias, setCompanias] = useState<Compania[]>([]);
  const [orden, setOrden] = useState<OrdenTipo>('cedula');
  const [busquedaTipo, setBusquedaTipo] = useState<BusquedaTipo>('cedula');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [formState, setFormState] = useState<PersonalFormState>(initialFormState);
  const [editingCedula, setEditingCedula] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadInitialData();
  }, []);

  const personalFiltrado = useMemo(() => {
    const valor = busqueda.trim().toLowerCase();
    const filtered = personal.filter((persona) => {
      if (!valor) {
        return true;
      }

      switch (busquedaTipo) {
        case 'cedula':
          return persona.cedula.toLowerCase().includes(valor);
        case 'nombre':
          return persona.nombre.toLowerCase().includes(valor);
        case 'apellido':
          return persona.apellido.toLowerCase().includes(valor);
        case 'compania':
          return persona.compania.toLowerCase().includes(valor);
        default:
          return true;
      }
    });

    return [...filtered].sort((a, b) => {
      if (orden === 'cedula') {
        return a.cedula.localeCompare(b.cedula);
      }

      return a.compania.localeCompare(b.compania) || a.cedula.localeCompare(b.cedula);
    });
  }, [busqueda, busquedaTipo, orden, personal]);

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
      setError(extractErrorMessage(loadError, 'No se pudo cargar el módulo de personal.'));
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

  function resetForm() {
    setFormState(initialFormState);
    setEditingCedula(null);
    setFormError(null);
    setMostrarFormulario(false);
  }

  function openCreateForm() {
    setSuccessMessage(null);
    setFormError(null);
    setEditingCedula(null);
    setFormState(initialFormState);
    setMostrarFormulario((current) => {
      if (current && !editingCedula) {
        return false;
      }

      return true;
    });
  }

  function openEditForm(persona: PersonalView) {
    setSuccessMessage(null);
    setFormError(null);
    setEditingCedula(persona.cedula);
    setFormState({
      cedula: persona.cedula,
      idJerarquia: String(persona.idJerarquia),
      nombre: persona.nombre,
      apellido: persona.apellido,
      contingente: persona.contingente,
      idCompania: String(persona.idCompania),
      telefono: persona.telefono,
    });
    setMostrarFormulario(true);
  }

  async function handleSubmit() {
    setFormError(null);
    setSuccessMessage(null);

    if (!formState.cedula.trim() || !formState.idJerarquia || !formState.nombre.trim() || !formState.apellido.trim() || !formState.contingente.trim() || !formState.idCompania) {
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

  return (
    <div>
      <h1 className="mb-6">Gestión de Personal</h1>

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

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setOrden('cedula')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
              orden === 'cedula'
                ? 'bg-[#0066ff] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <ArrowUpDown size={16} />
            Por Cédula
          </button>
          <button
            onClick={() => setOrden('compania')}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 transition-colors ${
              orden === 'compania'
                ? 'bg-[#0066ff] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <ArrowUpDown size={16} />
            Por Compañía
          </button>
        </div>

        <select
          value={busquedaTipo}
          onChange={(event) => setBusquedaTipo(event.target.value as BusquedaTipo)}
          className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
        >
          <option value="cedula">Buscar por Cédula</option>
          <option value="nombre">Buscar por Nombre</option>
          <option value="apellido">Buscar por Apellido</option>
          <option value="compania">Buscar por Compañía</option>
        </select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
          />
        </div>

        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 rounded-lg bg-[#0066ff] px-4 py-2 text-white hover:bg-[#0052cc] transition-colors"
        >
          <Plus size={20} />
          Agregar
        </button>
      </div>

      {mostrarFormulario && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="mb-4">{editingCedula ? 'Editar Personal' : 'Nuevo Personal'}</h3>

          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <input
              type="text"
              placeholder="Cédula"
              value={formState.cedula}
              disabled={Boolean(editingCedula)}
              onChange={(event) => setFormState({ ...formState, cedula: event.target.value })}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff] disabled:bg-gray-100"
            />
            <select
              value={formState.idJerarquia}
              onChange={(event) => setFormState({ ...formState, idJerarquia: event.target.value })}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
            >
              <option value="">Seleccione jerarquía</option>
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
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
            />
            <input
              type="text"
              placeholder="Apellido"
              value={formState.apellido}
              onChange={(event) => setFormState({ ...formState, apellido: event.target.value })}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
            />
            <input
              type="text"
              placeholder="Contingente"
              value={formState.contingente}
              onChange={(event) => setFormState({ ...formState, contingente: event.target.value })}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
            />
            <select
              value={formState.idCompania}
              onChange={(event) => setFormState({ ...formState, idCompania: event.target.value })}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
            >
              <option value="">Seleccione compañía</option>
              {companias.map((compania) => (
                <option key={compania.ID_COMPANIA} value={compania.ID_COMPANIA}>
                  {compania.NOMBRE_COMPANIA}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Teléfono"
              value={formState.telefono}
              onChange={(event) => setFormState({ ...formState, telefono: event.target.value })}
              className="rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => void handleSubmit()}
              disabled={isSaving}
              className="rounded-lg bg-[#0066ff] px-4 py-2 text-white hover:bg-[#0052cc] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={resetForm}
              disabled={isSaving}
              className="rounded-lg bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse overflow-hidden rounded-lg bg-white shadow-sm">
          <thead className="bg-[#0066ff] text-white">
            <tr>
              <th className="px-4 py-3 text-left">Cédula</th>
              <th className="px-4 py-3 text-left">Jerarquía</th>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Apellido</th>
              <th className="px-4 py-3 text-left">Contingente</th>
              <th className="px-4 py-3 text-left">Compañía</th>
              <th className="px-4 py-3 text-left">Teléfono</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr className="bg-white">
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Cargando personal...
                </td>
              </tr>
            )}
            {!isLoading && personalFiltrado.length === 0 && (
              <tr className="bg-white">
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No hay personal registrado
                </td>
              </tr>
            )}
            {!isLoading &&
              personalFiltrado.map((persona, index) => (
                <tr key={persona.cedula} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="border-t border-gray-200 px-4 py-3">{persona.cedula}</td>
                  <td className="border-t border-gray-200 px-4 py-3">{persona.jerarquia}</td>
                  <td className="border-t border-gray-200 px-4 py-3">{persona.nombre}</td>
                  <td className="border-t border-gray-200 px-4 py-3">{persona.apellido}</td>
                  <td className="border-t border-gray-200 px-4 py-3">{persona.contingente}</td>
                  <td className="border-t border-gray-200 px-4 py-3">{persona.compania}</td>
                  <td className="border-t border-gray-200 px-4 py-3">{persona.telefono || '—'}</td>
                  <td className="border-t border-gray-200 px-4 py-3 text-right">
                    <button
                      onClick={() => openEditForm(persona)}
                      className="ml-auto flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-2 text-sm text-gray-800 hover:bg-gray-300 transition-colors"
                    >
                      <Pencil size={16} />
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function mapPersonalToView(persona: PersonalMilitar): PersonalView {
  return {
    cedula: persona.CEDULA,
    jerarquia: persona.JERARQUIA_NOMBRE || `Jerarquía #${persona.ID_JERARQUIA}`,
    nombre: persona.NOMBRE,
    apellido: persona.APELLIDO,
    contingente: persona.CONTINGENTE,
    compania: persona.COMPANIA_NOMBRE || `Compañía #${persona.ID_COMPANIA}`,
    telefono: persona.TELEFONO || '',
    idJerarquia: persona.ID_JERARQUIA,
    idCompania: persona.ID_COMPANIA,
  };
}
