export interface NFCData {
  id: string;
  type: 'TEXT' | 'URL' | 'MIME' | 'SERIAL' | 'UNKNOWN';
  rawData: string;
  serialNumber?: string;
  timestamp: Date;
  records?: any[];
}

export interface NFCReadingResult {
  success: boolean;
  data?: NFCData;
  error?: string;
  message?: string;
}

export interface NFCTagInfo {
  serialNumber: string;
  type: string;
  maxSize?: number;
  isWritable?: boolean;
}

let nfcScanningActive = false;
let nfcReader: any = null;
let nfcAbortController: AbortController | null = null;

// FUNCIÓN PRINCIPAL - LECTURA REAL
export const startNFCScan = (
  onSuccess?: (data: NFCData) => void,
  onError?: (error: string) => void,
  onProgress?: (message: string) => void
): Promise<NFCReadingResult> => {
  return new Promise(async (resolve) => {
    // Verificar si ya hay un escaneo activo
    if (nfcScanningActive) {
      const errorMsg = '⚠️ Ya hay un escaneo NFC en progreso';
      if (onError) onError(errorMsg);
      resolve({
        success: false,
        error: errorMsg,
      });
      return;
    }

    const isSupported = 'NDEFReader' in window;
    
    if (!isSupported) {
      const errorMsg = '❌ NFC no está soportado en este navegador. Usa Chrome en Android.';
      console.error(errorMsg);
      if (onError) onError(errorMsg);
      resolve({
        success: false,
        error: errorMsg,
      });
      return;
    }

    // PERMISOS
    if ('permissions' in navigator) {
      try {
        const permissionStatus = await (navigator as any).permissions.query({ name: 'nfc' });
        if (permissionStatus.state === 'denied') {
          const errorMsg = '❌ Permiso NFC denegado. Habilita NFC en la configuración.';
          if (onError) onError(errorMsg);
          resolve({
            success: false,
            error: errorMsg,
          });
          return;
        }
      } catch (permError) {
        console.warn('No se pudo verificar permisos NFC:', permError);
      }
    }

    try {

        if (onProgress) onProgress('📱 Iniciando lector NFC...');
      
      nfcAbortController = new AbortController();
      nfcReader = new (window as any).NDEFReader();
      
      nfcScanningActive = true;
      
      await nfcReader.scan({
        signal: nfcAbortController.signal,
      });

      if (onProgress) onProgress('🔄 Acerca la etiqueta NFC al dispositivo...');

      // EVENTO DE LECTURA - PROCESAMIENTO REAL
      nfcReader.addEventListener('reading', ({ message, serialNumber }: any) => {
        try {
          nfcScanningActive = false;
          
          if (onProgress) onProgress('✅ ¡Etiqueta NFC detectada! Procesando...');
          
          console.log('📱 NFC - Serial Number:', serialNumber);
          console.log('📱 NFC - Message:', message);
          
          // Procesar los registros NFC
          let nfcData: NFCData = {
            id: serialNumber || 'unknown',
            type: 'UNKNOWN',
            rawData: '',
            serialNumber: serialNumber,
            timestamp: new Date(),
            records: message.records,
          };

          // Recorrer todos los registros del mensaje
          for (const record of message.records) {
            console.log(`📱 NFC - Record Type: ${record.type}`);
            
            // Procesar diferentes tipos de registros
            if (record.type === 'text') {
              try {
                const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                const textData = textDecoder.decode(record.data);
                console.log('📱 NFC - Texto decodificado:', textData);
                
                nfcData.rawData = textData;
                nfcData.type = 'TEXT';
                
                // Intentar extraer ID del texto
                const idMatch = textData.match(/ID[:#]\s*([A-Z0-9-]+)/i) || 
                               textData.match(/EMP[:#]\s*([A-Z0-9-]+)/i) ||
                               textData.match(/SERIAL[:#]\s*([A-Z0-9-]+)/i);
                
                if (idMatch) {
                  nfcData.id = idMatch[1];
                } else {
                  nfcData.id=textData.trim();
                }
              } catch (decodeError) {
                console.error('Error decodificando texto:', decodeError);
              }
            } 
            else if (record.type === 'url') {
              try {
                const textDecoder = new TextDecoder('utf-8');
                const urlData = textDecoder.decode(record.data);
                console.log('📱 NFC - URL:', urlData);
                
                nfcData.rawData = urlData;
                nfcData.type = 'URL';
              } catch (decodeError) {
                console.error('Error decodificando URL:', decodeError);
              }
            }
            else if (record.type === 'mime') {
              try {
                // Para datos MIME, intentar interpretar como texto
                if (record.mediaType?.includes('text/')) {
                  const textDecoder = new TextDecoder('utf-8');
                  const mimeData = textDecoder.decode(record.data);
                  console.log('📱 NFC - MIME Text:', mimeData);
                  
                  nfcData.rawData = mimeData;
                  nfcData.type = 'MIME';
                }
              } catch (decodeError) {
                console.error('Error decodificando MIME:', decodeError);
              }
            }
            else if (record.type === 'empty') {
              console.log('📱 NFC - Registro vacío');
            }
            else {
              console.log('📱 NFC - Tipo no soportado:', record.type);
            }
          }

          // Si no se encontró ningún dato legible, usar el serial number
          if (!nfcData.rawData && serialNumber) {
            nfcData.rawData = `Serial: ${serialNumber}`;
            nfcData.type = 'SERIAL';
            nfcData.id = serialNumber;
          }

          console.log('📱 NFC - Datos procesados:', nfcData);
          
          if (onProgress) onProgress(`✅ Lectura completada: ${nfcData.id}`);
          
          if (onSuccess) onSuccess(nfcData);
          resolve({
            success: true,
            data: nfcData,
            message: 'Lectura NFC exitosa',
          });
          
        } catch (processingError) {
          console.error('Error procesando lectura NFC:', processingError);
          const errorMsg = 'Error al procesar los datos NFC';
          if (onError) onError(errorMsg);
          resolve({
            success: false,
            error: errorMsg,
          });
        }
      });

      // ERROR DE LECTURA
      nfcReader.addEventListener('readingerror', () => {
        nfcScanningActive = false;
        const errorMsg = '❌ Error al leer la etiqueta NFC';
        console.error(errorMsg);
        if (onError) onError(errorMsg);
        resolve({
          success: false,
          error: errorMsg,
        });
      });

      // TIMEOUT DE SEGURIDAD
      setTimeout(() => {
        if (nfcScanningActive) {
          nfcScanningActive = false;
          if (nfcAbortController) {
            nfcAbortController.abort();
          }
          const errorMsg = '⏰ Timeout: No se detectó ninguna etiqueta NFC';
          console.warn(errorMsg);
          if (onError) onError(errorMsg);
          resolve({
            success: false,
            error: errorMsg,
          });
        }
      }, 30000); // 30 segundos de timeout

    } catch (error: any) {
      nfcScanningActive = false;
      let errorMsg = '❌ Error al iniciar el lector NFC';
      
      // Manejar de errores específicos
      if (error.message?.includes('NotAllowedError')) {
        errorMsg = '❌ Permiso NFC denegado. Acepta los permisos para continuar.';
      } else if (error.message?.includes('NotFoundError')) {
        errorMsg = '❌ No se encontró hardware NFC en el dispositivo.';
      } else if (error.message?.includes('NotSupportedError')) {
        errorMsg = '❌ NFC no es compatible con este dispositivo.';
      } else if (error.message) {
        errorMsg = `❌ Error: ${error.message}`;
      }
      
      console.error(errorMsg);
      if (onError) onError(errorMsg);
      resolve({
        success: false,
        error: errorMsg,
      });
    }
  });
};

// FUNCIÓN PARA DETENER EL ESCANEO
export const stopNFCScan = (): void => {
  nfcScanningActive = false;
  if (nfcAbortController) {
    try {
      nfcAbortController.abort();
    } catch (e) {
      console.warn('Error al abortar NFC:', e);
    }
  }
  nfcReader = null;
  console.log('🛑 Escaneo NFC detenido');
};

// ESCRIBIR NUEVA ETIQUETA NFC
export const writeToNFCTag = async (
  data: string,
  onProgress?: (message: string) => void
): Promise<{ success: boolean; error?: string }> => {
  try {
    const isSupported = 'NDEFReader' in window;
    if (!isSupported) {
      return {
        success: false,
        error: 'NFC no está soportado',
      };
    }

    if (onProgress) onProgress('📱 Iniciando escritura NFC...');
    
    const ndef = new (window as any).NDEFReader();
    await ndef.write({
      records: [
        {
          recordType: 'text',
          data: data,
        },
      ],
    });
    
    if (onProgress) onProgress('✅ Escritura NFC completada');
    return { success: true };
  } catch (error: any) {
    console.error('Error escribiendo en NFC:', error);
    return {
      success: false,
      error: error.message || 'Error al escribir en NFC',
    };
  }
};

// VERIFICAR SOPORTE NFC
export const isNFCSupported = (): boolean => {
  return 'NDEFReader' in window;
};

// VERIFICAR PERMISOS
export const checkNFCPermissions = async (): Promise<{
  granted: boolean;
  state?: string;
  error?: string;
}> => {
  try {
    if (!('permissions' in navigator)) {
      return {
        granted: false,
        error: 'API de permisos no disponible',
      };
    }
    
    const permissionStatus = await (navigator as any).permissions.query({ 
      name: 'nfc' as any 
    });
    
    return {
      granted: permissionStatus.state === 'granted',
      state: permissionStatus.state,
    };
  } catch (error: any) {
    return {
      granted: false,
      error: error.message || 'Error al verificar permisos',
    };
  }
};

// HOOK PERSONALIZADO - VERSIÓN MEJORADA
import { useState, useCallback, useEffect } from 'react';

export const useNFC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [nfcData, setNfcData] = useState<NFCData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // Verificar soporte y permisos al inicio
  useEffect(() => {
    const checkSupport = async () => {
      const supported = isNFCSupported();
      setIsSupported(supported);
      
      if (supported) {
        const permission = await checkNFCPermissions();
        setPermissionGranted(permission.granted);
      }
    };
    
    checkSupport();
  }, []);

  const startScan = useCallback(async () => {
    setError(null);
    setProgress('');
    setNfcData(null);
    setIsScanning(true);

    try {
      const result = await startNFCScan(
        (data) => {
          setNfcData(data);
          setIsScanning(false);
          setProgress('✅ Lectura completada');
        },
        (errorMsg) => {
          setError(errorMsg);
          setIsScanning(false);
          setProgress('');
        },
        (progressMsg) => {
          setProgress(progressMsg);
        }
      );

      if (!result.success && result.error) {
        setError(result.error);
        setIsScanning(false);
        setProgress('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setIsScanning(false);
      setProgress('');
    }
  }, []);

  const stopScan = useCallback(() => {
    stopNFCScan();
    setIsScanning(false);
    setProgress('🛑 Escaneo detenido');
  }, []);

  const resetData = useCallback(() => {
    setNfcData(null);
    setError(null);
    setProgress('');
  }, []);

  return {
    isScanning,
    nfcData,
    error,
    progress,
    isSupported,
    permissionGranted,
    startScan,
    stopScan,
    resetData,
  };
};