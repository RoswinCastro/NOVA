import { forwardRef, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Crosshair,
  Eye,
  FileText,
  Loader2,
  Radio,
  RefreshCw,
  Search,
  Smartphone,
  User,
  X,
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
import { formatCedula } from '../utils/cedula';

type ModoLectura = 'nfc' | 'manual';
type TipoRegistro = 'entrada' | 'salida';
type ActiveModal = 'personal' | 'arma' | 'movimiento' | null;
type ModalMode = 'select' | 'view';

interface RegistroMensaje {
  mensaje: string;
  exito: boolean;
}

interface NfcScanNotice {
  exito: boolean;
  titulo: string;
  mensaje: string;
}

const RECENT_RECORDS_PAGE_SIZE = 5;

export function RegistroEntradaSalidaModule() {
  const [modoLectura, setModoLectura] = useState<ModoLectura>('nfc');
  const [cedula, setCedula] = useState('');
  const [serial, setSerial] = useState('');
  const [cargadores, setCargadores] = useState('');
  const [municiones, setMuniciones] = useState('');
  const [motivo, setMotivo] = useState('');
  const [personalEncontrado, setPersonalEncontrado] = useState<PersonalMilitar | null>(null);
  const [armaEncontrada, setArmaEncontrada] = useState<Arma | null>(null);
  const [registros, setRegistros] = useState<Movimiento[]>([]);
  const [registroMensaje, setRegistroMensaje] = useState<RegistroMensaje | null>(null);
  const [nfcNotice, setNfcNotice] = useState<NfcScanNotice | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('select');
  const [movementStep, setMovementStep] = useState(0);
  const [submitAction, setSubmitAction] = useState<TipoRegistro | null>(null);
  const [isLoadingPersonal, setIsLoadingPersonal] = useState(false);
  const [isLoadingArma, setIsLoadingArma] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRegistros, setIsLoadingRegistros] = useState(true);
  const [recentRecordsPage, setRecentRecordsPage] = useState(1);
  const [expandedRecentRecordId, setExpandedRecentRecordId] = useState<number | null>(null);
  const [personalSuggestions, setPersonalSuggestions] = useState<PersonalMilitar[]>([]);
  const [armaSuggestions, setArmaSuggestions] = useState<Arma[]>([]);
  const [armasCatalog, setArmasCatalog] = useState<Arma[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isLoadingArmaSuggestions, setIsLoadingArmaSuggestions] = useState(false);
  const personalSectionRef = useRef<HTMLDivElement | null>(null);
  const armaSectionRef = useRef<HTMLDivElement | null>(null);
  const movimientoSectionRef = useRef<HTMLDivElement | null>(null);

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
    if (!activeModal) {
      return;
    }

    const scrollY = window.scrollY;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.classList.add('nova-modal-open');

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.width = previousBodyWidth;
      document.body.classList.remove('nova-modal-open');
      window.scrollTo(0, scrollY);
    };
  }, [activeModal]);

  useEffect(() => {
    if (!registroMensaje) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRegistroMensaje(null);
    }, 3600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [registroMensaje]);

  useEffect(() => {
    if (nfcData && !isScanning) {
      void handleNFCRead(nfcData);
    }
  }, [isScanning, nfcData]);

  useEffect(() => {
    if (!nfcError) {
      return;
    }

    setSerial('');
    setArmaEncontrada(null);
    setNfcNotice({
      exito: false,
      titulo: 'Error NFC',
      mensaje: nfcError,
    });
  }, [nfcError]);

  useEffect(() => {
    if (activeModal !== 'personal' || modalMode !== 'select') {
      setPersonalSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    const query = cedula.trim();
    if (query.length < 2) {
      setPersonalSuggestions([]);
      setIsLoadingSuggestions(false);
      return;
    }

    let cancelled = false;
    setIsLoadingSuggestions(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const results = await personalService.search(query);
        if (!cancelled) {
          setPersonalSuggestions(results.slice(0, 6));
        }
      } catch {
        if (!cancelled) {
          setPersonalSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSuggestions(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [activeModal, cedula, modalMode]);

  useEffect(() => {
    if (activeModal !== 'arma' || modalMode !== 'select') {
      setArmaSuggestions([]);
      setIsLoadingArmaSuggestions(false);
      return;
    }

    const query = serial.trim().toLowerCase();
    if (query.length < 2) {
      setArmaSuggestions([]);
      setIsLoadingArmaSuggestions(false);
      return;
    }

    let cancelled = false;
    setIsLoadingArmaSuggestions(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        let catalog = armasCatalog;
        if (catalog.length === 0) {
          catalog = await armasService.getAll();
          if (!cancelled) {
            setArmasCatalog(catalog);
          }
        }

        if (cancelled) {
          return;
        }

        const matches = catalog
          .filter((arma) =>
            [arma.SERIAL_ARMA, arma.TAG_NFC, arma.MODELO, arma.TIPO]
              .map((value) => (value ?? '').toString().toLowerCase())
              .some((value) => value.includes(query))
          )
          .slice(0, 6);

        setArmaSuggestions(matches);
      } catch {
        if (!cancelled) {
          setArmaSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingArmaSuggestions(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [activeModal, armasCatalog, modalMode, serial]);

  const personalResumen = useMemo(() => {
    if (!personalEncontrado) {
      return 'Sin personal seleccionado';
    }

    return `${personalEncontrado.NOMBRE} ${personalEncontrado.APELLIDO} - ${formatCedula(personalEncontrado.CEDULA)}`;
  }, [personalEncontrado]);

  const armaResumen = useMemo(() => {
    if (!armaEncontrada) {
      return 'Sin arma verificada';
    }

    return `${armaEncontrada.MODELO} - ${armaEncontrada.SERIAL_ARMA}`;
  }, [armaEncontrada]);

  const movimientoResumen = useMemo(() => {
    const partes: string[] = [];

    if (cargadores.trim()) {
      partes.push(`${cargadores.trim()} cargadores`);
    }
    if (municiones.trim()) {
      partes.push(`${municiones.trim()} municiones`);
    }
    if (motivo.trim()) {
      partes.push(motivo.trim());
    }

    return partes.length > 0 ? partes.join(' - ') : 'Sin configurar';
  }, [cargadores, motivo, municiones]);

  const totalRecentRecordPages = useMemo(
    () => Math.max(1, Math.ceil(registros.length / RECENT_RECORDS_PAGE_SIZE)),
    [registros.length]
  );

  const paginatedRecentRecords = useMemo(() => {
    const startIndex = (recentRecordsPage - 1) * RECENT_RECORDS_PAGE_SIZE;
    return registros.slice(startIndex, startIndex + RECENT_RECORDS_PAGE_SIZE);
  }, [recentRecordsPage, registros]);

  useEffect(() => {
    if (recentRecordsPage > totalRecentRecordPages) {
      setRecentRecordsPage(totalRecentRecordPages);
    }
  }, [recentRecordsPage, totalRecentRecordPages]);

  useEffect(() => {
    if (!paginatedRecentRecords.some((registro) => registro.ID_MOVIMIENTO === expandedRecentRecordId)) {
      setExpandedRecentRecordId(null);
    }
  }, [expandedRecentRecordId, paginatedRecentRecords]);

  function focusSection(section: 'personal' | 'arma' | 'movimiento') {
    const target =
      section === 'personal'
        ? personalSectionRef.current
        : section === 'arma'
          ? armaSectionRef.current
          : movimientoSectionRef.current;

    target?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

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

  function aplicarPersonal(persona: PersonalMilitar, closeModal = true) {
    setCedula(persona.CEDULA);
    setPersonalEncontrado(persona);
    setRegistroMensaje(null);
    setPersonalSuggestions([]);
    setModalMode('view');
    if (closeModal) {
      setActiveModal(null);
    }
  }

  function aplicarArma(arma: Arma, closeModal = true) {
    setArmaEncontrada(arma);
    setSerial(arma.SERIAL_ARMA);
    setRegistroMensaje(null);
    setNfcNotice(null);
    setModalMode('view');
    if (closeModal) {
      setActiveModal(null);
    }
  }

  async function buscarPersonal() {
    if (!cedula.trim()) {
      setPersonalEncontrado(null);
      setRegistroMensaje({
        mensaje: 'Ingrese la cedula del personal.',
        exito: false,
      });
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

      aplicarPersonal(persona, false);
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

  async function buscarArmaPorIdentificador(
    identificador: string,
    options?: {
      notFoundMessage?: string;
      clearInputOnNotFound?: boolean;
      openModalOnSuccess?: ModalMode;
      closeModalOnSuccess?: boolean;
    }
  ) {
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
    setNfcNotice(null);

    try {
      const armaPorSerial = await armasService.getBySerial(value);
      const arma = armaPorSerial || (await armasService.getByNFC(value));

      if (!arma) {
        setArmaEncontrada(null);
        if (options?.clearInputOnNotFound) {
          setSerial('');
        }
        setRegistroMensaje({
          mensaje: options?.notFoundMessage || 'Arma no encontrada en la base de datos.',
          exito: false,
        });
        return null;
      }

      aplicarArma(arma, options?.closeModalOnSuccess ?? false);
      if (options?.openModalOnSuccess) {
        setModalMode(options.openModalOnSuccess);
        setActiveModal('arma');
      }
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
      setSerial('');
      setArmaEncontrada(null);
      setNfcNotice({
        exito: false,
        titulo: 'Error NFC',
        mensaje: 'La lectura NFC no devolvio un identificador utilizable.',
      });
      return;
    }

    setIsLoadingArma(true);
    setRegistroMensaje(null);

    try {
      const armaPorSerial = await armasService.getBySerial(identifier);
      const arma = armaPorSerial || (await armasService.getByNFC(identifier));

      if (!arma) {
        setSerial('');
        setArmaEncontrada(null);
        setNfcNotice({
          exito: false,
          titulo: 'Etiqueta NFC no registrada',
          mensaje: 'No existe un arma asociada a la etiqueta NFC leida.',
        });
        return;
      }

      aplicarArma(arma, false);
      setNfcNotice({
        exito: true,
        titulo: 'Lectura completada',
        mensaje: `Arma encontrada:\n${arma.SERIAL_ARMA}`,
      });
    } catch (searchError) {
      setSerial('');
      setArmaEncontrada(null);
      setNfcNotice({
        exito: false,
        titulo: 'Error NFC',
        mensaje: extractErrorMessage(searchError, 'No se pudo procesar la etiqueta NFC.'),
      });
    } finally {
      setIsLoadingArma(false);
    }
  }

  async function handleNFCScan() {
    if (isScanning) {
      stopScan();
      setNfcNotice({
        exito: false,
        titulo: 'Lectura detenida',
        mensaje: 'El proceso de lectura NFC fue detenido por el usuario.',
      });
      return;
    }

    resetNFCData();
    setSerial('');
    setArmaEncontrada(null);
    setRegistroMensaje(null);
    setNfcNotice(null);
    setModalMode('select');
    setActiveModal(null);
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
    setNfcNotice(null);
    setModalMode('select');
    setActiveModal(null);
    setMovementStep(0);
    setPersonalSuggestions([]);
    setArmaSuggestions([]);
    resetDataLists();
    resetNFCData();
  }

  async function handleRegistrarMovimiento(targetTipo: TipoRegistro) {
    setRegistroMensaje(null);

    if (!personalEncontrado) {
      setRegistroMensaje({
        mensaje: 'Primero seleccione un personal.',
        exito: false,
      });
      focusSection('personal');
      return;
    }

    if (!serial.trim()) {
      setRegistroMensaje({
        mensaje: 'Primero verifique un arma.',
        exito: false,
      });
      focusSection('arma');
      return;
    }

    const arma =
      armaEncontrada && armaEncontrada.SERIAL_ARMA === serial.trim()
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
      focusSection('movimiento');
      return;
    }

    if (targetTipo === 'salida' && arma.ESTADO_DISPONIBILIDAD !== 'DISPONIBLE') {
      setRegistroMensaje({
        mensaje: 'El arma no esta disponible para registrar una salida.',
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
    setSubmitAction(targetTipo);

    try {
      const movimiento = await movimientosService.registrar({
        TIPO_MOVIMIENTO: targetTipo.toUpperCase() as 'ENTRADA' | 'SALIDA',
        ID_CEDULA_PERSONAL: personalEncontrado.CEDULA,
        SERIAL_ARMA: arma.SERIAL_ARMA,
        CANTIDAD_CARGADORES: Number(cargadores || '0'),
        CANTIDAD_MUNICION: Number(municiones || '0'),
        MOTIVO: motivo.trim(),
        UID_LECTOR_NFC: modoLectura === 'nfc' ? 'WEB_NFC' : 'WEB_APP',
      });

      setRegistroMensaje({
        mensaje: `${targetTipo === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente para ${
          movimiento.NOMBRE_COMPLETO || `${personalEncontrado.NOMBRE} ${personalEncontrado.APELLIDO}`
        }.`,
        exito: true,
      });

      clearFormAfterSubmit();
      await loadRecentMovements();
      setRecentRecordsPage(1);
      setExpandedRecentRecordId(null);
    } catch (saveError) {
      setRegistroMensaje({
        mensaje: extractErrorMessage(saveError, 'No se pudo registrar el movimiento.'),
        exito: false,
      });
    } finally {
      setIsSubmitting(false);
      setSubmitAction(null);
    }
  }

  function openModal(modal: ActiveModal, mode: ModalMode = 'select') {
    setActiveModal(modal);
    setModalMode(mode);
    if (modal === 'movimiento') {
      setMovementStep(0);
    }
  }

  function closeModal() {
    setActiveModal(null);
  }

  function nextMovementStep() {
    setMovementStep((current) => Math.min(current + 1, 2));
  }

  function previousMovementStep() {
    setMovementStep((current) => Math.max(current - 1, 0));
  }

  function skipMovementStep() {
    if (movementStep === 0) {
      setCargadores('');
    }
    if (movementStep === 1) {
      setMuniciones('');
    }
    if (movementStep === 2) {
      setMotivo('');
      closeModal();
      return;
    }
    nextMovementStep();
  }

  function finishMovementStep() {
    if (movementStep === 2) {
      closeModal();
      return;
    }
    nextMovementStep();
  }

  function resetDataLists() {
    setArmasCatalog([]);
    setPersonalSuggestions([]);
    setArmaSuggestions([]);
  }

  return (
    <div className="space-y-6">
      {activeModal && (
        <ModalFrame
          title={getModalTitle(activeModal, modalMode)}
          description={getModalDescription(activeModal, modalMode)}
          onClose={closeModal}
        >
          {activeModal === 'personal' && (
            <div className="space-y-4">
              {modalMode === 'select' && (
                <>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      type="text"
                      placeholder="Buscar por cedula o nombre..."
                      value={cedula}
                      onChange={(event) => setCedula(event.target.value)}
                      className="min-w-0 rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void buscarPersonal();
                        }
                      }}
                    />
                    <button
                      onClick={() => void buscarPersonal()}
                      disabled={isLoadingPersonal}
                      className="flex min-w-[120px] items-center justify-center gap-2 rounded-lg bg-[#0066ff] px-4 py-3 text-white transition-colors hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingPersonal ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                      Buscar
                    </button>
                  </div>

                  {isLoadingSuggestions && <p className="text-sm text-gray-500">Buscando sugerencias...</p>}

                  {personalSuggestions.length > 0 && (
                    <SuggestionList>
                      {personalSuggestions.map((persona) => (
                        <SuggestionButton
                          key={persona.CEDULA}
                          title={`${persona.NOMBRE} ${persona.APELLIDO}`}
                          subtitle={`${formatCedula(persona.CEDULA)}${persona.JERARQUIA_NOMBRE ? ` - ${persona.JERARQUIA_NOMBRE}` : ''}`}
                          onClick={() => aplicarPersonal(persona)}
                        />
                      ))}
                    </SuggestionList>
                  )}
                </>
              )}

              {personalEncontrado ? (
                <DetailCard>
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <p>
                      <strong>Nombre:</strong> {personalEncontrado.NOMBRE} {personalEncontrado.APELLIDO}
                    </p>
                    <p>
                      <strong>Jerarquia:</strong> {personalEncontrado.JERARQUIA_NOMBRE}
                    </p>
                    <p>
                      <strong>Cedula:</strong> {formatCedula(personalEncontrado.CEDULA)}
                    </p>
                    <p>
                      <strong>Compania:</strong> {personalEncontrado.COMPANIA_NOMBRE}
                    </p>
                  </div>
                </DetailCard>
              ) : (
                modalMode === 'view' && (
                  <EmptyDetailMessage message="Aun no hay personal seleccionado." />
                )
              )}
            </div>
          )}

          {activeModal === 'arma' && (
            <div className="space-y-4">
              {modalMode === 'select' && (
                <>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <input
                      type="text"
                      placeholder="Numero de serial o TAG NFC"
                      value={serial}
                      onChange={(event) => {
                        setSerial(event.target.value);
                        setArmaEncontrada(null);
                      }}
                      className="min-w-0 rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0066ff]"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void buscarArmaPorIdentificador(serial, { openModalOnSuccess: 'view' });
                        }
                      }}
                    />
                    <button
                      onClick={() => void buscarArmaPorIdentificador(serial, { openModalOnSuccess: 'view' })}
                      disabled={isLoadingArma}
                      className="flex min-w-[140px] items-center justify-center gap-2 rounded-lg bg-[#111827] px-4 py-3 text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingArma ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} />}
                      Verificar
                    </button>
                  </div>

                  {isLoadingArmaSuggestions && <p className="text-sm text-gray-500">Buscando sugerencias...</p>}

                  {armaSuggestions.length > 0 && (
                    <SuggestionList>
                      {armaSuggestions.map((arma) => (
                        <SuggestionButton
                          key={arma.SERIAL_ARMA}
                          title={`${arma.MODELO} - ${arma.SERIAL_ARMA}`}
                          subtitle={`${arma.TAG_NFC || 'Sin TAG'} - ${arma.ESTADO_DISPONIBILIDAD}`}
                          onClick={() => aplicarArma(arma)}
                        />
                      ))}
                    </SuggestionList>
                  )}
                </>
              )}

              {armaEncontrada ? (
                <DetailCard>
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
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
                      <strong>TAG NFC:</strong> {armaEncontrada.TAG_NFC || '-'}
                    </p>
                    <p>
                      <strong>Calibre:</strong> {armaEncontrada.CALIBRE}
                    </p>
                    <p>
                      <strong>Estado:</strong> {armaEncontrada.ESTADO_DISPONIBILIDAD}
                    </p>
                  </div>
                </DetailCard>
              ) : (
                modalMode === 'view' && <EmptyDetailMessage message="Aun no hay arma verificada." />
              )}
            </div>
          )}

          {activeModal === 'movimiento' && (
            <div className="space-y-5 text-center">
              <div className="mx-auto max-w-sm rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Paso {movementStep + 1} de 3
              </div>

              {movementStep === 0 && (
                <StepField
                  label="Cantidad de cargadores"
                  value={cargadores}
                  onChange={setCargadores}
                  placeholder="Dejar en blanco para omitir"
                  type="number"
                  centered
                />
              )}

              {movementStep === 1 && (
                <StepField
                  label="Cantidad de municiones"
                  value={municiones}
                  onChange={setMuniciones}
                  placeholder="Dejar en blanco para omitir"
                  type="number"
                  centered
                />
              )}

              {movementStep === 2 && (
                <StepField
                  label="Motivo"
                  value={motivo}
                  onChange={setMotivo}
                  placeholder="Dejar en blanco para omitir"
                  centered
                />
              )}

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                {movementStep > 0 && (
                  <button
                    onClick={previousMovementStep}
                    className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Volver
                  </button>
                )}
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    onClick={skipMovementStep}
                    className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    Omitir
                  </button>
                  <button
                    onClick={finishMovementStep}
                    className="rounded-lg bg-[#0066ff] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#0052cc]"
                  >
                    {movementStep === 2 ? 'Finalizar' : 'Siguiente'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </ModalFrame>
      )}

      {registroMensaje && <FeedbackToast message={registroMensaje} onClose={() => setRegistroMensaje(null)} />}

      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold text-gray-800">ENTRADA - SALIDA</h1>
        <div className="inline-flex rounded-full bg-black px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white dark:bg-blue-600">
          REGISTRO DE ARMAS
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[300px] grid-cols-2 gap-3 rounded-2xl bg-gray-100 p-2">
        <button
          onClick={() => setModoLectura('nfc')}
          className={`h-28 rounded-2xl px-4 py-3 font-medium transition-all duration-200 ${
            modoLectura === 'nfc' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="flex h-full flex-col items-center justify-center gap-2">
            <Smartphone className="h-5 w-5" />
            NFC
          </span>
        </button>
        <button
          onClick={() => setModoLectura('manual')}
          className={`h-28 rounded-2xl px-4 py-3 font-medium transition-all duration-200 ${
            modoLectura === 'manual' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-200'
          }`}
        >
          <span className="flex h-full flex-col items-center justify-center gap-2">
            <User className="h-5 w-5" />
            Manual
          </span>
        </button>
      </div>

      {modoLectura === 'nfc' && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm sm:p-6">
          <div className="flex justify-center">
            <button
              onClick={() => void handleNFCScan()}
              disabled={!isSupported}
              className={`w-full max-w-md rounded-xl px-6 py-4 font-semibold transition-all duration-200 ${
                isScanning ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-blue-600 text-white hover:bg-blue-700'
              } ${!isSupported ? 'cursor-not-allowed opacity-50' : 'active:scale-[0.99]'}`}
            >
              <span className="flex items-center justify-center gap-3">
                {isScanning ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />
                ) : (
                  <Radio className="h-5 w-5" />
                )}
                {isScanning ? 'Detener lectura NFC' : 'Iniciar lectura NFC'}
              </span>
            </button>
          </div>

          {!isSupported && (
            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              La lectura NFC no esta disponible en este dispositivo.
            </div>
          )}

          {nfcProgress && isScanning && (
            <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-center text-sm text-blue-700">{nfcProgress}</div>
          )}

          {nfcNotice && (
            <div
              className={`mt-4 rounded-lg border p-4 ${
                nfcNotice.exito ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex flex-col items-center gap-3">
                  {nfcNotice.exito ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className={nfcNotice.exito ? 'font-semibold text-green-800' : 'font-semibold text-red-700'}>
                      {nfcNotice.titulo}
                    </p>
                    <p className={`whitespace-pre-line text-sm ${nfcNotice.exito ? 'text-green-700' : 'text-red-600'}`}>
                      {nfcNotice.mensaje}
                    </p>
                  </div>
                </div>

                {nfcNotice.exito && armaEncontrada && (
                  <button
                    onClick={() => openModal('arma', 'view')}
                    className="flex items-center gap-2 rounded-lg border border-green-200 bg-white px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50"
                  >
                    <Eye className="h-4 w-4" />
                    Ver arma
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm sm:p-6 md:text-left">
        <div className="mb-5">
          <h3 className="font-semibold text-gray-800">Registro</h3>
          <p className="text-sm text-gray-500">Abre solo la parte que quieras usar.</p>
        </div>

        <div className="space-y-3 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
          <ActionRow
            ref={personalSectionRef}
            icon={<User className="h-5 w-5" />}
            title="Personal"
            summary={personalResumen}
            status={Boolean(personalEncontrado)}
            actions={
              personalEncontrado ? (
                <IconActions>
                  <IconActionButton
                    icon={<Eye className="h-4 w-4" />}
                    label="Ver personal"
                    onClick={() => openModal('personal', 'view')}
                  />
                  <IconActionButton
                    icon={<RefreshCw className="h-4 w-4" />}
                    label="Cambiar personal"
                    onClick={() => openModal('personal', 'select')}
                  />
                </IconActions>
              ) : (
                <PrimaryActionButton
                  icon={<CheckCircle className="h-4 w-4" />}
                  label="Seleccionar"
                  onClick={() => openModal('personal', 'select')}
                />
              )
            }
          />

          <ActionRow
            ref={armaSectionRef}
            icon={<Crosshair className="h-5 w-5" />}
            title="Arma"
            summary={armaResumen}
            status={Boolean(armaEncontrada)}
            actions={
              armaEncontrada ? (
                <IconActions>
                  <IconActionButton
                    icon={<Eye className="h-4 w-4" />}
                    label="Ver arma"
                    onClick={() => openModal('arma', 'view')}
                  />
                  <IconActionButton
                    icon={<RefreshCw className="h-4 w-4" />}
                    label="Cambiar arma"
                    onClick={() => openModal('arma', 'select')}
                  />
                </IconActions>
              ) : (
                <PrimaryActionButton
                  icon={<Crosshair className="h-4 w-4" />}
                  label="Verificar"
                  onClick={() => openModal('arma', 'select')}
                />
              )
            }
          />

          <ActionRow
            ref={movimientoSectionRef}
            icon={<FileText className="h-5 w-5" />}
            title="Movimiento"
            summary={movimientoResumen}
            status={Boolean(cargadores.trim() || municiones.trim() || motivo.trim())}
            actions={
              <PrimaryActionButton
                icon={<FileText className="h-4 w-4" />}
                label="Configurar"
                onClick={() => openModal('movimiento')}
              />
            }
          />
        </div>

        <div className="mt-5 flex flex-col items-center gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-center">
          <button
            onClick={() => void handleRegistrarMovimiento('entrada')}
            disabled={isSubmitting}
            className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-xs"
          >
            <span className="flex items-center justify-center gap-2">
              {isSubmitting && submitAction === 'entrada' ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
              Registrar Entrada
            </span>
          </button>

          <button
            onClick={() => void handleRegistrarMovimiento('salida')}
            disabled={isSubmitting}
            className="w-full rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-xs"
          >
            <span className="flex items-center justify-center gap-2">
              {isSubmitting && submitAction === 'salida' ? <Loader2 size={20} className="animate-spin" /> : <XCircle size={20} />}
              Registrar Salida
            </span>
          </button>
        </div>

      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-gray-700">
            <Clock className="h-4 w-4" />
            Registros Recientes
          </h3>
        </div>

        <div className="space-y-3">
          {isLoadingRegistros && (
            <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-gray-500 dark:bg-slate-800 dark:text-slate-300">
              Cargando registros...
            </div>
          )}

          {!isLoadingRegistros && registros.length === 0 && (
            <div className="rounded-lg bg-gray-50 px-4 py-8 text-center text-gray-500 dark:bg-slate-800 dark:text-slate-300">
              No hay registros todavia
            </div>
          )}

          {!isLoadingRegistros &&
            paginatedRecentRecords.map((registro) => {
              const isExpanded = expandedRecentRecordId === registro.ID_MOVIMIENTO;

              return (
                <div
                  key={registro.ID_MOVIMIENTO}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-900"
                >
                  <button
                    onClick={() => setExpandedRecentRecordId(isExpanded ? null : registro.ID_MOVIMIENTO)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-white/70 dark:hover:bg-slate-800"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-gray-800 dark:text-slate-100">{registro.NOMBRE_COMPLETO || '-'}</p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            registro.TIPO_MOVIMIENTO === 'ENTRADA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {registro.TIPO_MOVIMIENTO}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-slate-300">{formatDateTime(registro.GRUPO_FECHA_HORA)}</p>
                      <p className="text-sm text-gray-600 dark:text-slate-300">
                        Serial: <span className="font-medium text-gray-700 dark:text-slate-100">{registro.SERIAL_ARMA}</span>
                      </p>
                    </div>

                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-gray-400 transition-transform dark:text-slate-500 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 px-4 py-4 dark:border-slate-700">
                      <div className="grid gap-3 text-sm text-gray-600 dark:text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
                        <RecentRecordField label="Cedula" value={formatCedula(registro.ID_CEDULA_PERSONAL)} />
                        <RecentRecordField label="Jerarquia" value={registro.JERARQUIA_NOMBRE || '-'} />
                        <RecentRecordField label="Serial" value={registro.SERIAL_ARMA} mono />
                        <RecentRecordField label="Cargadores" value={String(registro.CANTIDAD_CARGADORES)} />
                        <RecentRecordField label="Municiones" value={String(registro.CANTIDAD_MUNICION)} />
                        <RecentRecordField label="UID" value={registro.UID_LECTOR_NFC || 'WEB_APP'} />
                        <div className="sm:col-span-2 lg:col-span-3">
                          <RecentRecordField label="Motivo" value={registro.MOTIVO || '-'} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {!isLoadingRegistros && registros.length > 0 && totalRecentRecordPages > 1 && (
          <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
            <p className="text-sm text-gray-500 dark:text-slate-300">
              Pagina {recentRecordsPage} de {totalRecentRecordPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRecentRecordsPage((page) => Math.max(1, page - 1))}
                disabled={recentRecordsPage === 1}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Anterior
              </button>
              <button
                onClick={() => setRecentRecordsPage((page) => Math.min(totalRecentRecordPages, page + 1))}
                disabled={recentRecordsPage === totalRecentRecordPages}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RecentRecordField({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400 dark:text-slate-500">{label}</p>
      <p className={mono ? 'font-mono text-gray-700 dark:text-slate-100' : 'text-gray-700 dark:text-slate-100'}>{value}</p>
    </div>
  );
}

interface ModalFrameProps {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}

function FeedbackToast({ message, onClose }: { message: RegistroMensaje; onClose: () => void }) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4">
      <div
        className={`pointer-events-auto w-full max-w-md rounded-2xl border px-4 py-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${
          message.exito ? 'border-green-200 bg-white' : 'border-red-200 bg-white'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {message.exito ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className={message.exito ? 'font-medium text-green-800 dark:text-green-300' : 'font-medium text-red-800 dark:text-white'}>
              {message.mensaje}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Cerrar mensaje"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ModalFrame({ title, description, onClose, children }: ModalFrameProps) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] overflow-y-auto overscroll-contain bg-slate-950/76 backdrop-blur-sm">
      <div className="flex min-h-[100svh] items-center justify-center p-4">
        <div className="my-auto max-h-[calc(100svh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-100">{title}</h3>
              <p className="text-sm text-gray-500 dark:text-slate-300">{description}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

function DetailCard({ children }: { children: ReactNode }) {
  return <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-800">{children}</div>;
}

function EmptyDetailMessage({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500 dark:border-slate-600 dark:text-slate-300">{message}</div>;
}

interface StepFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: 'text' | 'number';
  centered?: boolean;
}

function StepField({ label, value, onChange, placeholder, type = 'text', centered = false }: StepFieldProps) {
  return (
    <div className={centered ? 'mx-auto max-w-sm text-center' : undefined}>
      <label className={`mb-2 block text-sm font-medium text-gray-700 dark:text-slate-200 ${centered ? 'text-center' : ''}`}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#0066ff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      />
    </div>
  );
}

interface ActionRowProps {
  icon: ReactNode;
  title: string;
  summary: string;
  status: boolean;
  actions: ReactNode;
}

const ActionRow = forwardRef<HTMLDivElement, ActionRowProps>(function ActionRow({ icon, title, summary, status, actions }, ref) {
  return (
    <div ref={ref} className="relative flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white/80 px-4 py-5 text-center dark:border-slate-700 dark:bg-slate-900 md:min-h-[220px] md:items-start md:justify-between md:text-left">
      <div
        className={`absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border ${
          status ? 'border-green-600 bg-green-600 text-white' : 'border-red-600 bg-red-600 text-white'
        }`}
        aria-hidden="true"
      >
        {status ? <CheckCircle className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </div>

      <div className="flex min-w-0 flex-col items-center gap-3 md:items-start">
        <div className="rounded-xl bg-gray-100 p-3 text-gray-700 dark:bg-slate-800 dark:text-slate-100">{icon}</div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 dark:text-slate-100">{title}</p>
          <p className="text-sm text-gray-500 dark:text-slate-300">{summary}</p>
        </div>
      </div>
      <div className="flex justify-center md:justify-start">{actions}</div>
    </div>
  );
});

interface PrimaryActionButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

function PrimaryActionButton({ icon, label, onClick }: PrimaryActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
    >
      {icon}
      <span>{label}</span>
      <ChevronRight className="h-4 w-4" />
    </button>
  );
}

function IconActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-center gap-2 md:justify-start">{children}</div>;
}

interface IconActionButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}

function IconActionButton({ icon, label, onClick }: IconActionButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-lg border border-gray-200 p-2 text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
    >
      {icon}
    </button>
  );
}

function SuggestionList({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-gray-200 dark:border-slate-700">{children}</div>;
}

interface SuggestionButtonProps {
  title: string;
  subtitle: string;
  onClick: () => void;
}

function SuggestionButton({ title, subtitle, onClick }: SuggestionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 text-left last:border-b-0 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-800"
    >
      <div>
        <p className="font-medium text-gray-800 dark:text-slate-100">{title}</p>
        <p className="text-sm text-gray-500 dark:text-slate-300">{subtitle}</p>
      </div>
      <ChevronRight className="mt-0.5 h-4 w-4 text-gray-400 dark:text-slate-500" />
    </button>
  );
}

function getModalTitle(modal: ActiveModal, mode: ModalMode) {
  if (modal === 'personal') {
    return mode === 'view' ? 'Informacion del personal' : 'Seleccionar personal';
  }
  if (modal === 'arma') {
    return mode === 'view' ? 'Informacion del arma' : 'Verificar arma';
  }
  return 'Configurar movimiento';
}

function getModalDescription(modal: ActiveModal, mode: ModalMode) {
  if (modal === 'personal') {
    return mode === 'view'
      ? 'Revisa los datos del personal seleccionado.'
      : 'Busca por cedula o nombre y selecciona el responsable.';
  }
  if (modal === 'arma') {
    return mode === 'view'
      ? 'Revisa los datos del arma verificada.'
      : 'Verifica el serial o TAG y selecciona el arma correcta.';
  }
  return 'Completa el movimiento paso por paso.';
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
