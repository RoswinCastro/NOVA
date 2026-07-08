import React, { useState, useEffect } from 'react';
import {
  Radio,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  AlertCircle,
  User,
  Clock,
  Calendar,
  Smartphone,
  RefreshCw,
  Search,
  Shield
} from 'lucide-react';
import {
  useNFC,
  type NFCData,
  isNFCSupported,
  checkNFCPermissions
} from '../services/nfcServices';

interface PersonalInfo {
  cedula: string;
  jerarquia: string;
  nombre: string;
  apellido: string;
  compania: string;
}

interface RegistroEntradaSalida {
  id: string;
  fechaHora: string;
  tipo: 'entrada' | 'salida';
  cedula: string;
  nombreCompleto: string;
  jerarquia: string;
  compania: string;
  serial: string;
  cargadores: number;
  municiones: number;
  motivo: string;
  nfcConfirmado: boolean;
}

const personalDB: PersonalInfo[] = [
  { cedula: '30763261', jerarquia: 'SLDDO', nombre: 'José', apellido: 'Lázaro', compania: '1ra Compañía' },
  { cedula: '29557321', jerarquia: 'SLDDO', nombre: 'Gabriel', apellido: 'Marques', compania: '2da Compañía' },
  { cedula: '34190900', jerarquia: 'S/1', nombre: 'David', apellido: 'Reyes', compania: '3ra Compañía' },
  { cedula: '31559942', jerarquia: 'C/1', nombre: 'Nelson', apellido: 'Chirino', compania: '1ra Compañía' },
  { cedula: '27881882', jerarquia: 'C/2', nombre: 'Mariángel', apellido: 'García', compania: '2da Compañía' },
  { cedula: '30987119', jerarquia: 'SLDDO', nombre: 'Pedro', apellido: 'González', compania: '3ra Compañía' }
];

// COMPONENTE PRINCIPAL
export function RegistroEntradaSalidaModule() {

  const [modoLectura, setModoLectura] = useState<'nfc' | 'manual'>('nfc');
  const [cedula, setCedula] = useState('');
  const [personalEncontrado, setPersonalEncontrado] = useState<PersonalInfo | null>(null);
  const [serial, setSerial] = useState('');
  const [cargadores, setCargadores] = useState('');
  const [municiones, setMuniciones] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tipoRegistro, setTipoRegistro] = useState<'entrada' | 'salida'>('entrada');
  const [registros, setRegistros] = useState<RegistroEntradaSalida[]>([]);
  const [registroMensaje, setRegistroMensaje] = useState<{
    mensaje: string;
    exito: boolean;
    empleado?: PersonalInfo;
  } | null>(null);

  // NFC

  const {
    isScanning,
    nfcData,
    error: nfcError,
    progress: nfcProgress,
    isSupported,
    startScan,
    stopScan,
    resetData: resetNFCData,
  } = useNFC();

  const buscarPersonal = () => {
    const persona = personalDB.find(p => p.cedula === cedula);
    if (persona) {
      setPersonalEncontrado(persona);
      setRegistroMensaje(null);
    } else {
      setPersonalEncontrado(null);
      setRegistroMensaje({
        mensaje: '❌ Persona no encontrada en el sistema',
        exito: false,
      });
    }
  };

  const procesarRegistro = (personal: PersonalInfo, tipo: 'entrada' | 'salida') => {
    if (!serial || !cargadores || !municiones || !motivo) {
      setRegistroMensaje({
        mensaje: '⚠️ Complete todos los campos del arma',
        exito: false,
      });
      return;
    }

    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const hora = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const mes = meses[ahora.getMonth()];
    const ano = String(ahora.getFullYear()).slice(-2);
    const fechaHoraGFM = `${dia}${hora}${minutos}${mes}${ano}`;

    const nuevoRegistro: RegistroEntradaSalida = {
      id: String(registros.length + 1),
      fechaHora: fechaHoraGFM,
      tipo: tipo,
      cedula: personal.cedula,
      nombreCompleto: `${personal.nombre} ${personal.apellido}`,
      jerarquia: personal.jerarquia,
      compania: personal.compania,
      serial: serial,
      cargadores: parseInt(cargadores),
      municiones: parseInt(municiones),
      motivo: motivo,
      nfcConfirmado: true
    };

    setRegistros([nuevoRegistro, ...registros]);
    setRegistroMensaje({
      mensaje: `✅ ${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada exitosamente para ${personal.nombre} ${personal.apellido}`,
      exito: true,
      empleado: personal,
    });

    setPersonalEncontrado(null);
    setCedula('');
    setSerial('');
    setCargadores('');
    setMuniciones('');
    setMotivo('');
    resetNFCData();
  };

  // Manejar lectura NFC
  const handleNFCRead = (data: NFCData) => {
    console.log('📱 NFC Data recibida:', data);
    
    // Extraer el serial del arma de los datos del NFC
    let armaSerial = data.id || data.rawData;
    if (armaSerial.startsWith('Serial: ')) {
      armaSerial = armaSerial.replace('Serial: ', '');
    }
    
    setSerial(armaSerial);
    setRegistroMensaje({
      mensaje: `✅ Armamento detectado. Serial: ${armaSerial}`,
      exito: true,
    });
  };

  // Manejar registro manual
  const handleManualRegistro = (tipo: 'entrada' | 'salida') => {
    if (!personalEncontrado) {
      setRegistroMensaje({
        mensaje: '⚠️ Primero busque un empleado por cédula',
        exito: false,
      });
      return;
    }
    procesarRegistro(personalEncontrado, tipo);
  };

  // Iniciar escaneo NFC
  const handleNFCScan = async () => {
    if (isScanning) {
      stopScan();
      return;
    }

    resetNFCData();
    setRegistroMensaje(null);
    await startScan();
  };

  // Efecto para procesar datos NFC cuando llegan
  useEffect(() => {
    if (nfcData && !isScanning) {
      handleNFCRead(nfcData);
    }
  }, [nfcData, isScanning]);

  // RENDERIZADO DEL COMPONENTE
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <Shield className="w-6 h-6 text-blue-600" />
        Registro de Entrada/Salida de Armas
      </h1>

      {/*       SELECTOR DE MODO LECTURA */}
      <div className="flex gap-4 p-1 bg-gray-100 rounded-lg w-full max-w-xs">
        <button
          onClick={() => setModoLectura('nfc')}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium
            transition-all duration-200
            ${modoLectura === 'nfc'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          <Smartphone className="w-4 h-4" />
          NFC
        </button>
        <button
          onClick={() => setModoLectura('manual')}
          className={`
            flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium
            transition-all duration-200
            ${modoLectura === 'manual'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          <User className="w-4 h-4" />
          Manual
        </button>
      </div>

      {/* MODO NFC - LECTURA DE ETIQUETA */}
      {modoLectura === 'nfc' && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-700 mb-4">Lectura NFC</h3>
          
          {/* Información de NFC */}
          {!isSupported && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-800">NFC no disponible</p>
                  <p className="text-sm text-yellow-700">
                    Para usar NFC necesitas:
                    <br />
                    • Chrome en Android (versión 89+)
                    <br />
                    • NFC activado en el dispositivo
                    <br />
                    • Acceso vía HTTPS o localhost
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Botón NFC */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleNFCScan}
              disabled={isScanning || !isSupported}
              className={`
                flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold
                transition-all duration-200 w-full
                ${isScanning
                  ? 'bg-yellow-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
                ${!isSupported && 'opacity-50 cursor-not-allowed'}
                hover:scale-[1.02] active:scale-[0.98]
              `}
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Escaneando... acerca el armamento</span>
                </>
              ) : (
                <>
                  <Radio className="w-5 h-5" />
                  <span>Leer NFC</span>
                </>
              )}
            </button>

            {/* Progreso NFC */}
            {nfcProgress && (
              <div className={`p-3 rounded-lg flex items-center gap-3 text-sm
                ${isScanning ? 'bg-blue-50 text-blue-700' : ''}
                ${nfcError ? 'bg-red-50 text-red-700' : ''}
                ${nfcData && !nfcError ? 'bg-green-50 text-green-700' : ''}
              `}>
                {isScanning && <Loader2 className="w-4 h-4 animate-spin" />}
                {nfcError && <XCircle className="w-4 h-4" />}
                {nfcData && !nfcError && <CheckCircle className="w-4 h-4" />}
                <span>{nfcProgress}</span>
              </div>
            )}

            {/* Error NFC */}
            {nfcError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-700">Error NFC</p>
                    <p className="text-sm text-red-600">{nfcError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Datos NFC leídos */}
          {nfcData && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Leído</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">ID:</span>
                  <span className="ml-2 font-mono">{nfcData.id}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Tipo:</span>
                  <span className="ml-2">{nfcData.type}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FORMULARIO DE REGISTRO (Común para ambos modos) */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-4">Datos del Registro</h3>

        {/* Tipo de registro */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Movimiento</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tipo"
                value="entrada"
                checked={tipoRegistro === 'entrada'}
                onChange={(e) => setTipoRegistro(e.target.value as 'entrada' | 'salida')}
                className="accent-[#0066ff]"
              />
              <span className="text-sm">Entrada</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tipo"
                value="salida"
                checked={tipoRegistro === 'salida'}
                onChange={(e) => setTipoRegistro(e.target.value as 'entrada' | 'salida')}
                className="accent-[#0066ff]"
              />
              <span className="text-sm">Salida</span>
            </label>
          </div>
        </div>

        {/* Búsqueda por cédula (modo manual) */}
        {modoLectura === 'manual' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cédula de Identidad</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ingrese cédula..."
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    buscarPersonal();
                  }
                }}
              />
              <button
                onClick={buscarPersonal}
                className="px-4 py-2 bg-[#0066ff] text-white rounded-lg hover:bg-[#0052cc] transition-colors flex items-center gap-2"
              >
                <Search size={20} />
                Buscar
              </button>
            </div>
          </div>
        )}

        {/* Información del personal */}
        {personalEncontrado && (
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">Información del Personal</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p><strong>Nombre:</strong> {personalEncontrado.nombre} {personalEncontrado.apellido}</p>
              <p><strong>Jerarquía:</strong> {personalEncontrado.jerarquia}</p>
              <p><strong>Cédula:</strong> {personalEncontrado.cedula}</p>
              <p><strong>Compañía:</strong> {personalEncontrado.compania}</p>
            </div>
          </div>
        )}

        {/* Datos del arma */}
        {personalEncontrado && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Serial del Arma</label>
                <input
                  type="text"
                  placeholder="Número de serial"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cant. Cargadores</label>
                <input
                  type="number"
                  placeholder="0"
                  value={cargadores}
                  onChange={(e) => setCargadores(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cant. Municiones</label>
                <input
                  type="number"
                  placeholder="0"
                  value={municiones}
                  onChange={(e) => setMuniciones(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
              <input
                type="text"
                placeholder="Folio de guardia, folio de parque, etc."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
              />
            </div>

            {/* Botones de registro */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleManualRegistro('entrada')}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                disabled={!serial || !cargadores || !municiones || !motivo}
              >
                <CheckCircle size={20} />
                Registrar Entrada
              </button>
              <button
                onClick={() => handleManualRegistro('salida')}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                disabled={!serial || !cargadores || !municiones || !motivo}
              >
                <XCircle size={20} />
                Registrar Salida
              </button>
            </div>
          </>
        )}

        {/* Mensaje de registro */}
        {registroMensaje && (
          <div className={`mt-4 p-4 rounded-lg border
            ${registroMensaje.exito
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
            }
          `}>
            <div className="flex items-start gap-3">
              {registroMensaje.exito ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${registroMensaje.exito ? 'text-green-800' : 'text-red-800'}`}>
                  {registroMensaje.mensaje}
                </p>
                {registroMensaje.empleado && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>👤 {registroMensaje.empleado.nombre} {registroMensaje.empleado.apellido}</p>
                    <p>📋 {registroMensaje.empleado.jerarquia} - {registroMensaje.empleado.compania}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TABLA DE REGISTROS RECIENTE */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Registros Recientes
          </h3>
          {registros.length > 0 && (
            <button
              onClick={() => setRegistros([])}
              className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Limpiar
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-[#0066ff] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm">G-F-M</th>
                <th className="px-4 py-3 text-left text-sm">Tipo</th>
                <th className="px-4 py-3 text-left text-sm">Cédula</th>
                <th className="px-4 py-3 text-left text-sm">Nombre</th>
                <th className="px-4 py-3 text-left text-sm">Jerarquía</th>
                <th className="px-4 py-3 text-left text-sm">Serial</th>
                <th className="px-4 py-3 text-left text-sm">Carg.</th>
                <th className="px-4 py-3 text-left text-sm">Munic.</th>
                <th className="px-4 py-3 text-left text-sm">Motivo</th>
                <th className="px-4 py-3 text-left text-sm">NFC</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((registro, index) => (
                <tr key={registro.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                  <td className="px-4 py-3 border-t border-gray-200 text-sm">{registro.fechaHora}</td>
                  <td className="px-4 py-3 border-t border-gray-200 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      registro.tipo === 'entrada'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {registro.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                    </span>
                  </td>
                  <td className="px-4 py-3 border-t border-gray-200 text-sm">{registro.cedula}</td>
                  <td className="px-4 py-3 border-t border-gray-200 text-sm">{registro.nombreCompleto}</td>
                  <td className="px-4 py-3 border-t border-gray-200 text-sm">{registro.jerarquia}</td>
                  <td className="px-4 py-3 border-t border-gray-200 text-sm font-mono">{registro.serial}</td>
                  <td className="px-4 py-3 border-t border-gray-200 text-sm text-center">{registro.cargadores}</td>
                  <td className="px-4 py-3 border-t border-gray-200 text-sm text-center">{registro.municiones}</td>
                  <td className="px-4 py-3 border-t border-gray-200 text-sm">{registro.motivo}</td>
                  <td className="px-4 py-3 border-t border-gray-200 text-center">
                    {registro.nfcConfirmado ? (
                      <CheckCircle size={18} className="text-green-500 inline" />
                    ) : (
                      <XCircle size={18} className="text-red-500 inline" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {registros.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay registros todavía
            </div>
          )}
        </div>
      </div>
    </div>
  );
}