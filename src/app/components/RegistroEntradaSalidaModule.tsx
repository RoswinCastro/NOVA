import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Radio,
  Search,
  Shield,
  Smartphone,
  User,
  XCircle,
} from 'lucide-react';
import { type NFCData, useNFC } from '../services/nfcServices';
import {
  armasService,
  extractErrorMessage,
  movimientosService,
  personalService,
  type Arma,
  type Movimiento,
  type PersonalMilitar,
} from '../services/databaseService';

type ModoLectura = 'nfc' | 'manual';
type TipoRegistro = 'entrada' | 'salida';

interface RegistroMensaje {
  mensaje: string;
  exito: boolean;
}

export function RegistroEntradaSalidaModule() {
  const [modoLectura, setModoLectura] = useState<ModoLectura>('nfc');
  const [cedula, setCedula] = useState('');
  const [serial, setSerial] = useState('');
  const [cargadores, setCargadores] = useState('');
  const [municiones, setMuniciones] = useState('');
  const [motivo, setMotivo] = useState('');
  const [tipoRegistro, setTipoRegistro] = useState<TipoRegistro>('entrada');
  const [personalEncontrado, setPersonalEncontrado] = useState<PersonalMilitar | null>(null);
  const [armaEncontrada, setArmaEncontrada] = useState<Arma | null>(null);
  const [registros, setRegistros] = useState<Movimiento[]>([]);
  const [registroMensaje, setRegistroMensaje] = useState<RegistroMensaje | null>(null);
  const [isLoadingPersonal, setIsLoadingPersonal] = useState(false);
  const [isLoadingArma, setIsLoadingArma] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRegistros, setIsLoadingRegistros] = useState(true);

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

  useEffect(() => {
    void loadRecentMovements();
  }, []);

  useEffect(() => {
    if (nfcData && !isScanning) {
      void handleNFCRead(nfcData);
    }
  }, [isScanning, nfcData]);

  async function loadRecentMovements() {
    setIsLoadingRegistros(true);

    try {
      const response = await movimientosService.getUltimos(10);
      setRegistros(response);
    } catch (loadError) {
      setRegistroMensaje({
        mensaje: extractErrorMessage(loadError, 'No se pudieron cargar los registros recientes.'),
        exito: false,
      });
      setRegistros([]);
    } finally {
      setIsLoadingRegistros(false);
    }
  }

  async function buscarPersonal() {
    if (!cedula.trim()) {
      setRegistroMensaje({
        mensaje: 'Ingrese la cédula del personal.',
        exito: false,
      });
      setPersonalEncontrado(null);
      return;
    }

    setIsLoadingPersonal(true);
    setRegistroMensaje(null);

    try {
      const normalizedCedulas = buildCedulaCandidates(cedula);
      let persona: PersonalMilitar | null = null;

      for (const candidate of normalizedCedulas) {
        persona = await personalService.getByCedula(candidate);
        if (persona) {
          break;
        }
      }

      if (!persona) {
        setPersonalEncontrado(null);
        setRegistroMensaje({
          mensaje: 'Personal no encontrado en la base de datos.',
          exito: false,
        });
        return;
      }

      setPersonalEncontrado(persona);
    } catch (searchError) {
      setPersonalEncontrado(null);
      setRegistroMensaje({
        mensaje: extractErrorMessage(searchError, 'No se pudo buscar el personal.'),
        exito: false,
      });
    } finally {
      setIsLoadingPersonal(false);
    }
  }

  async function buscarArmaPorIdentificador(identificador: string) {
    const value = identificador.trim();
    if (!value) {
      setArmaEncontrada(null);
      setRegistroMensaje({
        mensaje: 'Ingrese o lea un serial/TAG NFC de arma.',
        exito: false,
      });
      return null;
    }

    setIsLoadingArma(true);
    setRegistroMensaje(null);

    try {
      const armaPorSerial = await armasService.getBySerial(value);
      const arma = armaPorSerial || (await armasService.getByNFC(value));

      if (!arma) {
        setArmaEncontrada(null);
        setRegistroMensaje({
          mensaje: 'Arma no encontrada en la base de datos.',
          exito: false,
        });
        return null;
      }

      setArmaEncontrada(arma);
      setSerial(arma.SERIAL_ARMA);
      return arma;
    } catch (searchError) {
      setArmaEncontrada(null);
      setRegistroMensaje({
        mensaje: extractErrorMessage(searchError, 'No se pudo buscar el arma.'),
        exito: false,
      });
      return null;
    } finally {
      setIsLoadingArma(false);
    }
  }

  async function handleNFCRead(data: NFCData) {
    const identifier = data.id?.trim() || data.rawData?.trim();

    if (!identifier) {
      setRegistroMensaje({
        mensaje: 'La lectura NFC no devolvió un identificador utilizable.',
        exito: false,
      });
      return;
    }

    setSerial(identifier);
    const arma = await buscarArmaPorIdentificador(identifier);

    if (arma) {
      setRegistroMensaje({
        mensaje: `Etiqueta NFC procesada. Arma encontrada: ${arma.MODELO} (${arma.SERIAL_ARMA}).`,
        exito: true,
      });
    }
  }

  async function handleNFCScan() {
    if (isScanning) {
      stopScan();
      return;
    }

    resetNFCData();
    setRegistroMensaje(null);
    await startScan();
  }

  function clearFormAfterSubmit() {
    setCedula('');
    setSerial('');
    setCargadores('');
    setMuniciones('');
    setMotivo('');
    setPersonalEncontrado(null);
    setArmaEncontrada(null);
    resetNFCData();
  }

  async function handleRegistrarMovimiento(targetTipo: TipoRegistro) {
    setRegistroMensaje(null);

    if (!personalEncontrado) {
      setRegistroMensaje({
        mensaje: 'Primero busque y seleccione un personal válido.',
        exito: false,
      });
      return;
    }

    if (!serial.trim()) {
      setRegistroMensaje({
        mensaje: 'Debe indicar un serial o leer una etiqueta NFC.',
        exito: false,
      });
      return;
    }

    const arma = armaEncontrada && armaEncontrada.SERIAL_ARMA === serial.trim()
      ? armaEncontrada
      : await buscarArmaPorIdentificador(serial.trim());

    if (!arma) {
      return;
    }

    if (!motivo.trim()) {
      setRegistroMensaje({
        mensaje: 'Ingrese el motivo del movimiento.',
        exito: false,
      });
      return;
    }

    if (targetTipo === 'salida' && arma.ESTADO_DISPONIBILIDAD !== 'DISPONIBLE') {
      setRegistroMensaje({
        mensaje: 'El arma no está disponible para registrar una salida.',
        exito: false,
      });
      return;
    }

    if (targetTipo === 'entrada' && arma.ESTADO_DISPONIBILIDAD !== 'ASIGNADO') {
      setRegistroMensaje({
        mensaje: 'El arma debe estar asignada para registrar una entrada.',
        exito: false,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const movimiento = await movimientosService.registrar({
        TIPO_MOVIMIENTO: targetTipo.toUpperCase() as 'ENTRADA' | 'SALIDA',
        ID_CEDULA_PERSONAL: personalEncontrado.CEDULA,
        SERIAL_ARMA: arma.SERIAL_ARMA,
        CANTIDAD_CARGADORES: Number(cargadores || '0'),
        CANTIDAD_MUNICION: Number(municiones || '0'),
        MOTIVO: motivo.trim(),
        UID_LECTOR_NFC: nfcData?.serialNumber || nfcData?.id || 'WEB_APP',
      });

      setRegistroMensaje({
        mensaje: `${targetTipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente para ${movimiento.NOMBRE_COMPLETO || `${personalEncontrado.NOMBRE} ${personalEncontrado.APELLIDO}`}.`,
        exito: true,
      });

      clearFormAfterSubmit();
      await loadRecentMovements();
    } catch (saveError) {
      setRegistroMensaje({
        mensaje: extractErrorMessage(saveError, 'No se pudo registrar el movimiento.'),
        exito: false,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
        <Shield className="h-6 w-6 text-blue-600" />
        Registro de Entrada/Salida de Armas
      </h1>

      <div className="flex w-full max-w-xs gap-4 rounded-lg bg-gray-100 p-1">
        <button
          onClick={() => setModoLectura('nfc')}
          className={`flex-1 rounded-lg px-4 py-2 font-medium transition-all duration-200 ${
            modoLectura === 'nfc' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <Smartphone className="h-4 w-4" />
            NFC
          </span>
        </button>
        <button
          onClick={() => setModoLectura('manual')}
          className={`flex-1 rounded-lg px-4 py-2 font-medium transition-all duration-200 ${
            modoLectura === 'manual' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <User className="h-4 w-4" />
            Manual
          </span>
        </button>
      </div>

      {modoLectura === 'nfc' && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-700">Lectura NFC</h3>

          {!isSupported && (
            <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-800">NFC no disponible</p>
                  <p className="text-sm text-yellow-700">
                    Para usar Web NFC necesitas Chrome en Android, NFC activado y acceso por HTTPS o `localhost`.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => void handleNFCScan()}
              disabled={!isSupported}
              className={`w-full rounded-xl px-6 py-4 font-semibold transition-all duration-200 ${
                isScanning ? 'bg-yellow-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${!isSupported ? 'cursor-not-allowed opacity-50' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
            >
              <span className="flex items-center justify-center gap-3">
                {isScanning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Radio className="h-5 w-5" />}
                {isScanning ? 'Escaneando... acerca el armamento' : 'Leer NFC'}
              </span>
            </button>

            {nfcProgress && (
              <div
                className={`flex items-center gap-3 rounded-lg p-3 text-sm ${
                  nfcError ? 'bg-red-50 text-red-700' : nfcData ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                }`}
              >
                {isScanning && <Loader2 className="h-4 w-4 animate-spin" />}
                {nfcError && <XCircle className="h-4 w-4" />}
                {nfcData && !nfcError && <CheckCircle className="h-4 w-4" />}
                <span>{nfcProgress}</span>
              </div>
            )}

            {nfcError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                  <div>
                    <p className="font-semibold text-red-700">Error NFC</p>
                    <p className="text-sm text-red-600">{nfcError}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {nfcData && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">Etiqueta leída</span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <div>
                  <span className="font-medium text-gray-600">Identificador:</span>
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

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-gray-700">Datos del Registro</h3>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">Tipo de Movimiento</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tipo"
                value="entrada"
                checked={tipoRegistro === 'entrada'}
                onChange={(event) => setTipoRegistro(event.target.value as TipoRegistro)}
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
                onChange={(event) => setTipoRegistro(event.target.value as TipoRegistro)}
                className="accent-[#0066ff]"
              />
              <span className="text-sm">Salida</span>
            </label>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">Cédula de Identidad</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ingrese cédula..."
              value={cedula}
              onChange={(event) => setCedula(event.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void buscarPersonal();
                }
              }}
            />
            <button
              onClick={() => void buscarPersonal()}
              disabled={isLoadingPersonal}
              className="flex items-center gap-2 rounded-lg bg-[#0066ff] px-4 py-2 text-white hover:bg-[#0052cc] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoadingPersonal ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
              Buscar
            </button>
          </div>
        </div>

        {personalEncontrado && (
          <div className="mb-4 rounded-lg bg-gray-50 p-4">
            <h4 className="mb-2 font-semibold text-gray-700">Información del Personal</h4>
            <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <p>
                <strong>Nombre:</strong> {personalEncontrado.NOMBRE} {personalEncontrado.APELLIDO}
              </p>
              <p>
                <strong>Jerarquía:</strong> {personalEncontrado.JERARQUIA_NOMBRE}
              </p>
              <p>
                <strong>Cédula:</strong> {personalEncontrado.CEDULA}
              </p>
              <p>
                <strong>Compañía:</strong> {personalEncontrado.COMPANIA_NOMBRE}
              </p>
            </div>
          </div>
        )}

        {personalEncontrado && (
          <>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  {modoLectura === 'manual' ? 'Serial o TAG del Arma' : 'Serial o TAG leído'}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Número de serial o TAG NFC"
                    value={serial}
                    onChange={(event) => {
                      setSerial(event.target.value);
                      setArmaEncontrada(null);
                    }}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void buscarArmaPorIdentificador(serial);
                      }
                    }}
                  />
                  <button
                    onClick={() => void buscarArmaPorIdentificador(serial)}
                    disabled={isLoadingArma}
                    className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoadingArma ? 'Buscando...' : 'Buscar arma'}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Cant. Cargadores</label>
                <input
                  type="number"
                  placeholder="0"
                  value={cargadores}
                  onChange={(event) => setCargadores(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Cant. Municiones</label>
                <input
                  type="number"
                  placeholder="0"
                  value={municiones}
                  onChange={(event) => setMuniciones(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                />
              </div>
            </div>

            {armaEncontrada && (
              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 font-semibold text-gray-700">Información del Arma</h4>
                <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                  <p>
                    <strong>Modelo:</strong> {armaEncontrada.MODELO}
                  </p>
                  <p>
                    <strong>Tipo:</strong> {armaEncontrada.TIPO}
                  </p>
                  <p>
                    <strong>Serial:</strong> {armaEncontrada.SERIAL_ARMA}
                  </p>
                  <p>
                    <strong>TAG NFC:</strong> {armaEncontrada.TAG_NFC}
                  </p>
                  <p>
                    <strong>Calibre:</strong> {armaEncontrada.CALIBRE}
                  </p>
                  <p>
                    <strong>Estado actual:</strong> {armaEncontrada.ESTADO_DISPONIBILIDAD}
                  </p>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">Motivo</label>
              <input
                type="text"
                placeholder="Folio de guardia, entrega de parque, etc."
                value={motivo}
                onChange={(event) => setMotivo(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
              />
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => void handleRegistrarMovimiento('entrada')}
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting && tipoRegistro === 'entrada' ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                  Registrar Entrada
                </span>
              </button>
              <button
                onClick={() => void handleRegistrarMovimiento('salida')}
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex items-center justify-center gap-2">
                  {isSubmitting && tipoRegistro === 'salida' ? <Loader2 size={20} className="animate-spin" /> : <XCircle size={20} />}
                  Registrar Salida
                </span>
              </button>
            </div>
          </>
        )}

        {registroMensaje && (
          <div
            className={`mt-4 rounded-lg border p-4 ${
              registroMensaje.exito ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {registroMensaje.exito ? (
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              )}
              <p className={registroMensaje.exito ? 'font-medium text-green-800' : 'font-medium text-red-800'}>
                {registroMensaje.mensaje}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-gray-700">
            <Clock className="h-4 w-4" />
            Registros Recientes
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-[#0066ff] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm">Fecha y Hora</th>
                <th className="px-4 py-3 text-left text-sm">Tipo</th>
                <th className="px-4 py-3 text-left text-sm">Cédula</th>
                <th className="px-4 py-3 text-left text-sm">Nombre</th>
                <th className="px-4 py-3 text-left text-sm">Jerarquía</th>
                <th className="px-4 py-3 text-left text-sm">Serial</th>
                <th className="px-4 py-3 text-left text-sm">Carg.</th>
                <th className="px-4 py-3 text-left text-sm">Munic.</th>
                <th className="px-4 py-3 text-left text-sm">Motivo</th>
                <th className="px-4 py-3 text-left text-sm">UID Lector</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingRegistros && (
                <tr className="bg-white">
                  <td colSpan={10} className="border-t border-gray-200 px-4 py-8 text-center text-gray-500">
                    Cargando registros...
                  </td>
                </tr>
              )}
              {!isLoadingRegistros && registros.length === 0 && (
                <tr className="bg-white">
                  <td colSpan={10} className="border-t border-gray-200 px-4 py-8 text-center text-gray-500">
                    No hay registros todavía
                  </td>
                </tr>
              )}
              {!isLoadingRegistros &&
                registros.map((registro, index) => (
                  <tr key={registro.ID_MOVIMIENTO} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="border-t border-gray-200 px-4 py-3 text-sm">{formatDateTime(registro.GRUPO_FECHA_HORA)}</td>
                    <td className="border-t border-gray-200 px-4 py-3 text-sm">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${
                          registro.TIPO_MOVIMIENTO === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {registro.TIPO_MOVIMIENTO}
                      </span>
                    </td>
                    <td className="border-t border-gray-200 px-4 py-3 text-sm">{registro.ID_CEDULA_PERSONAL}</td>
                    <td className="border-t border-gray-200 px-4 py-3 text-sm">{registro.NOMBRE_COMPLETO || '—'}</td>
                    <td className="border-t border-gray-200 px-4 py-3 text-sm">{registro.JERARQUIA_NOMBRE || '—'}</td>
                    <td className="border-t border-gray-200 px-4 py-3 text-sm font-mono">{registro.SERIAL_ARMA}</td>
                    <td className="border-t border-gray-200 px-4 py-3 text-center text-sm">{registro.CANTIDAD_CARGADORES}</td>
                    <td className="border-t border-gray-200 px-4 py-3 text-center text-sm">{registro.CANTIDAD_MUNICION}</td>
                    <td className="border-t border-gray-200 px-4 py-3 text-sm">{registro.MOTIVO || '—'}</td>
                    <td className="border-t border-gray-200 px-4 py-3 text-sm">{registro.UID_LECTOR_NFC || 'WEB_APP'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
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

function buildCedulaCandidates(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.includes('-')) {
    return [trimmed];
  }

  return [trimmed, `V-${trimmed}`, `E-${trimmed}`];
}
