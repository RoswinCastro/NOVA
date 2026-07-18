import { useEffect, useState } from 'react';
import { Search, Plus, Eye, ArrowLeft } from 'lucide-react';
import { armasService, type Arma as DatabaseArma } from '../services/databaseService';

interface ArmaView {
  serial: string;
  nombre: string;
  modelo: string;
  tipo: string;
  carga: string;
  municion: string | null;
  calibre: string;
  estado: DatabaseArma['ESTADO_DISPONIBILIDAD'];
}

interface Cargador {
  id: string;
  tipo: string;
  calibre: string;
  municion: string;
  disponibles: number;
  entregados: number;
}

const generarSerial = () => Math.floor(10000000 + Math.random() * 90000000).toString();

const cargadoresIniciales: Cargador[] = [
  { id: '1', tipo: 'Cargador AK-103', calibre: '7,62 x 39 mm', municion: '7,62 mm', disponibles: 50, entregados: 15 },
  { id: '2', tipo: 'Cargador FAL', calibre: '7,62 x 51 mm OTAN', municion: '7,62 mm', disponibles: 40, entregados: 10 },
  { id: '3', tipo: 'Cinta FN MAG', calibre: '7,62 x 51 mm OTAN', municion: '7,62 mm', disponibles: 30, entregados: 8 }
];

export function ArmasModule() {
  const [armas, setArmas] = useState<ArmaView[]>([]);
  const [cargadores] = useState<Cargador[]>(cargadoresIniciales);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [vistaActual, setVistaActual] = useState<'armas' | 'cargadores'>('armas');
  const [nuevaArma, setNuevaArma] = useState<ArmaView>({
    serial: '', nombre: '', modelo: '', tipo: '', carga: '', municion: null, calibre: '', estado: 'DISPONIBLE'
  });

  const [vista, setVista] = useState<'lista' | 'menuParques' | 'detalle'>('lista');
  const [armaSeleccionada, setArmaSeleccionada] = useState<ArmaView | null>(null);
  const [parqueSeleccionado, setParqueSeleccionado] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadArmas = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await armasService.getAll();

        if (!isMounted) {
          return;
        }

        setArmas(response.map(mapArmaToView));
      } catch (loadError: any) {
        if (!isMounted) {
          return;
        }

        const backendMessage =
          loadError?.response?.data?.error ||
          loadError?.message ||
          'No se pudieron cargar las armas.';

        setError(`No se pudieron cargar las armas. ${backendMessage}`);
        setArmas([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadArmas();

    return () => {
      isMounted = false;
    };
  }, []);

  const armasFiltradas = armas.filter(arma =>
    arma.modelo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleAgregarArma = () => {
    if (nuevaArma.modelo) {
      setArmas([...armas, { ...nuevaArma, serial: nuevaArma.serial || generarSerial() }]);
      setMostrarFormulario(false);
    }
  };

  const resetFormulario = () => {
    setNuevaArma({
      serial: '', nombre: '', modelo: '', tipo: '', carga: '', municion: null, calibre: '', estado: 'DISPONIBLE'
    });
    setMostrarFormulario(false);
  };

  return (
    <div>
      <h1 className="mb-6">Gestión de Armas</h1>

      <div className="flex gap-2 mb-6">
        <button onClick={() => {
          setVistaActual('armas');
          setVista('lista');
        }} className={`px-6 py-3 rounded-lg ${vistaActual === 'armas' ? 'bg-[#0066ff] text-white' : 'bg-gray-200'}`}>Armas</button>
        <button onClick={() => {
          setVistaActual('cargadores');
          setVista('lista');
        }} className={`px-6 py-3 rounded-lg ${vistaActual === 'cargadores' ? 'bg-[#0066ff] text-white' : 'bg-gray-200'}`}>Cargadores</button>
      </div>

      {vistaActual === 'armas' && (
        <>
          {vista === 'lista' && (
            <>
              <div className="flex gap-4 mb-6">
                <input 
                  placeholder="Buscar por modelo..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  className="flex-1 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0066ff] outline-none"
                />
                <button onClick={() => setMostrarFormulario(!mostrarFormulario)} className="flex items-center gap-2 px-4 py-2 bg-[#0066ff] text-white rounded-lg">
                  <Plus size={20} /> Agregar
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
                  <thead className="bg-[#0066ff] text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Modelo</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Carga</th>
                      <th className="px-4 py-3 text-left">Calibre</th>
                      <th className="px-4 py-3 text-left">Munición</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr className="bg-white">
                        <td colSpan={6} className="px-4 py-8 border-t text-center text-gray-500">
                          Cargando armas...
                        </td>
                      </tr>
                    )}
                    {!isLoading && error && (
                      <tr className="bg-white">
                        <td colSpan={6} className="px-4 py-8 border-t text-center text-red-600">
                          {error}
                        </td>
                      </tr>
                    )}
                    {!isLoading && !error && armasFiltradas.length === 0 && (
                      <tr className="bg-white">
                        <td colSpan={6} className="px-4 py-8 border-t text-center text-gray-500">
                          No hay armas registradas
                        </td>
                      </tr>
                    )}
                    {!isLoading && !error && armasFiltradas.map((arma, index) => (
                      <tr key={arma.serial} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                        <td className="px-4 py-3 border-t">{arma.modelo}</td>
                        <td className="px-4 py-3 border-t">{arma.tipo}</td>
                        <td className="px-4 py-3 border-t">{arma.carga}</td>
                        <td className="px-4 py-3 border-t">{arma.calibre}</td>
                        <td className="px-4 py-3 border-t">{arma.municion ?? '—'}</td>
                        <td className="px-4 py-3 border-t text-right">
                          <button 
                            onClick={() => {
                              setArmaSeleccionada(arma);
                              setVista('menuParques');
                            }}
                            className="bg-[#0066ff] text-white px-4 py-2 rounded-lg flex items-center gap-2 ml-auto"
                          >
                            <Eye size={16} /> Ver Parques
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
                <ArrowLeft /> Volver al listado
              </button>
              <h2 className="text-xl font-bold mb-6">Seleccione Parque para: {armaSeleccionada?.modelo}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setParqueSeleccionado(num);
                      setVista('detalle');
                    }}
                    className="px-8 py-6 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition-colors text-xl font-bold shadow-lg"
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
                <ArrowLeft /> Regresar a Parques
              </button>
              <h2 className="text-2xl font-bold mb-4">Inventario - Parque {parqueSeleccionado}</h2>
              <div className="overflow-x-auto bg-white p-4 rounded-lg shadow">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      <th className="p-3 text-left">Serial</th>
                      <th className="p-3 text-left">Nombre</th>
                      <th className="p-3 text-left">Modelo</th>
                      <th className="p-3 text-left">Tipo</th>
                      <th className="p-3 text-left">Alimentación</th>
                      <th className="p-3 text-left">Calibre</th>
                      <th className="p-3 text-left">Munición</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="p-3">{armaSeleccionada.serial}</td>
                      <td className="p-3">{armaSeleccionada.nombre}</td>
                      <td className="p-3">{armaSeleccionada.modelo}</td>
                      <td className="p-3">{armaSeleccionada.tipo}</td>
                      <td className="p-3">{armaSeleccionada.carga}</td>
                      <td className="p-3">{armaSeleccionada.calibre}</td>
                      <td className="p-3">{armaSeleccionada.municion ?? '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Formulario para agregar nueva arma */}
          {mostrarFormulario && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">Agregar Nueva Arma</h2>
                <div className="space-y-3">
                  <input 
                    placeholder="Nombre" 
                    value={nuevaArma.nombre} 
                    onChange={(e) => setNuevaArma({...nuevaArma, nombre: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                  <input 
                    placeholder="Modelo" 
                    value={nuevaArma.modelo} 
                    onChange={(e) => setNuevaArma({...nuevaArma, modelo: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                  <input 
                    placeholder="Tipo" 
                    value={nuevaArma.tipo} 
                    onChange={(e) => setNuevaArma({...nuevaArma, tipo: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                  <input 
                    placeholder="Carga/Alimentación" 
                    value={nuevaArma.carga} 
                    onChange={(e) => setNuevaArma({...nuevaArma, carga: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                  <input 
                    placeholder="Munición" 
                    value={nuevaArma.municion} 
                    onChange={(e) => setNuevaArma({...nuevaArma, municion: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                  <input 
                    placeholder="Calibre" 
                    value={nuevaArma.calibre} 
                    onChange={(e) => setNuevaArma({...nuevaArma, calibre: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                  <input 
                    type="number" 
                    placeholder="Disponibles" 
                    value={nuevaArma.carga} 
                    onChange={(e) => setNuevaArma({...nuevaArma, carga: e.target.value})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={handleAgregarArma}
                    className="flex-1 bg-[#0066ff] text-white py-2 rounded-lg"
                  >
                    Agregar
                  </button>
                  <button 
                    onClick={resetFormulario}
                    className="flex-1 bg-gray-300 py-2 rounded-lg"
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
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white shadow-sm rounded-lg overflow-hidden">
            <thead className="bg-[#0066ff] text-white">
              <tr>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Calibre</th>
                <th className="px-4 py-3 text-left">Munición</th>
                <th className="px-4 py-3 text-left">Disponibles</th>
                <th className="px-4 py-3 text-left">Entregados</th>
              </tr>
            </thead>
            <tbody>
              {cargadores.map((cargador) => (
                <tr key={cargador.id} className="bg-white">
                  <td className="px-4 py-3 border-t">{cargador.tipo}</td>
                  <td className="px-4 py-3 border-t">{cargador.calibre}</td>
                  <td className="px-4 py-3 border-t">{cargador.municion}</td>
                  <td className="px-4 py-3 border-t">{cargador.disponibles}</td>
                  <td className="px-4 py-3 border-t">{cargador.entregados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function mapArmaToView(arma: DatabaseArma): ArmaView {
  return {
    serial: arma.SERIAL_ARMA,
    nombre: arma.MODELO,
    modelo: arma.MODELO,
    tipo: arma.TIPO,
    carga: `${arma.CAPACIDAD_CARGA} cartuchos`,
    municion: null,
    calibre: arma.CALIBRE,
    estado: arma.ESTADO_DISPONIBILIDAD,
  };
}
