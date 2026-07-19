export interface NFCData {
  id: string;
  type: 'TEXT' | 'URL' | 'MIME' | 'UNKNOWN';
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

const EMPTY_TAG_MESSAGE = 'La etiqueta NFC está vacía. Debe configurarse antes de utilizarla.';

let nfcScanningActive = false;
let nfcReader: any = null;
let nfcAbortController: AbortController | null = null;

function decodeTextRecord(record: any) {
  const decoder = new TextDecoder(record.encoding || 'utf-8');
  return decoder.decode(record.data).trim();
}

function decodeUrlRecord(record: any) {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(record.data).trim();
}

function decodeMimeRecord(record: any) {
  const mediaType = String(record.mediaType || '').toLowerCase();
  const isSupportedMime =
    mediaType.startsWith('text/') ||
    mediaType === 'application/json' ||
    mediaType.endsWith('+json');

  if (!isSupportedMime) {
    return null;
  }

  const decoder = new TextDecoder('utf-8');
  return decoder.decode(record.data).trim();
}

function buildNfcDataFromRecord(record: any, serialNumber?: string): NFCData | null {
  const recordType = record.recordType;

  if (recordType === 'empty') {
    return null;
  }

  try {
    if (recordType === 'text') {
      const textData = decodeTextRecord(record);
      if (!textData) {
        return null;
      }

      const idMatch =
        textData.match(/ID[:#]\s*([A-Z0-9-]+)/i) ||
        textData.match(/EMP[:#]\s*([A-Z0-9-]+)/i) ||
        textData.match(/SERIAL[:#]\s*([A-Z0-9-]+)/i);

      return {
        id: idMatch ? idMatch[1] : textData,
        type: 'TEXT',
        rawData: textData,
        serialNumber,
        timestamp: new Date(),
        records: [record],
      };
    }

    if (recordType === 'url') {
      const urlData = decodeUrlRecord(record);
      if (!urlData) {
        return null;
      }

      return {
        id: urlData,
        type: 'URL',
        rawData: urlData,
        serialNumber,
        timestamp: new Date(),
        records: [record],
      };
    }

    if (recordType === 'mime') {
      const mimeData = decodeMimeRecord(record);
      if (!mimeData) {
        return null;
      }

      return {
        id: mimeData,
        type: 'MIME',
        rawData: mimeData,
        serialNumber,
        timestamp: new Date(),
        records: [record],
      };
    }
  } catch (error) {
    console.error('Error procesando registro NDEF:', error);
  }

  return null;
}

function extractUsableNfcData(message: any, serialNumber?: string): NFCData | null {
  const records = Array.isArray(message?.records) ? message.records : [];

  if (records.length === 0) {
    return null;
  }

  for (const record of records) {
    const usableData = buildNfcDataFromRecord(record, serialNumber);
    if (usableData) {
      return {
        ...usableData,
        records,
      };
    }
  }

  return null;
}

export const startNFCScan = (
  onSuccess?: (data: NFCData) => void,
  onError?: (error: string) => void,
  onProgress?: (message: string) => void
): Promise<NFCReadingResult> => {
  return new Promise(async (resolve) => {
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

      nfcReader.addEventListener('reading', ({ message, serialNumber }: any) => {
        try {
          nfcScanningActive = false;

          if (onProgress) onProgress('✅ ¡Etiqueta NFC detectada! Procesando...');

          console.log('📱 NFC - Serial Number (depuración):', serialNumber);
          console.log('📱 NFC - Message:', message);

          const nfcData = extractUsableNfcData(message, serialNumber);

          if (!nfcData) {
            if (onError) onError(EMPTY_TAG_MESSAGE);
            resolve({
              success: false,
              error: EMPTY_TAG_MESSAGE,
            });
            return;
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
      }, 30000);
    } catch (error: any) {
      nfcScanningActive = false;
      let errorMsg = '❌ Error al iniciar el lector NFC';

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
          data,
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

export const isNFCSupported = (): boolean => {
  return 'NDEFReader' in window;
};

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
      name: 'nfc' as any,
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

import { useState, useCallback, useEffect } from 'react';

export const useNFC = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [nfcData, setNfcData] = useState<NFCData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

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
          setNfcData(null);
          setIsScanning(false);
          setProgress('');
        },
        (progressMsg) => {
          setProgress(progressMsg);
        }
      );

      if (!result.success && result.error) {
        setError(result.error);
        setNfcData(null);
        setIsScanning(false);
        setProgress('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setNfcData(null);
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
