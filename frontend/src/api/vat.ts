// VAT API for generating NAP files
// Communicates with baraba_vat microservice on port 5004

const VAT_API_URL = import.meta.env?.VITE_VAT_API_URL || 'http://localhost:5004'

// Decode base64 and convert from Windows-1251 to UTF-8 for display
const decodeBase64ToUtf8 = (base64: string): string => {
  const binaryString = window.atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  // Windows-1251 decoder for Bulgarian text
  try {
    return new TextDecoder('windows-1251').decode(bytes)
  } catch {
    // Fallback if windows-1251 not supported
    return new TextDecoder('utf-8').decode(bytes)
  }
}

// Get raw bytes from base64 for downloading as-is
const decodeBase64ToBytes = (base64: string): Uint8Array => {
  const binaryString = window.atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

export interface VatFiles {
  'POKUPKI.TXT': string
  'PRODAGBI.TXT': string
  'DEKLAR.TXT': string
}

export interface VatFilesRaw {
  'POKUPKI.TXT': Uint8Array
  'PRODAGBI.TXT': Uint8Array
  'DEKLAR.TXT': Uint8Array
}

export interface VatGenerateResult {
  files: VatFiles      // UTF-8 decoded for display
  rawFiles: VatFilesRaw // Raw bytes for download
}

export const vatApi = {
  // Generate VAT files, returns both UTF-8 decoded strings (for display) and raw bytes (for download)
  generate: async (companyId: string, period: string): Promise<VatGenerateResult> => {
    const response = await fetch(`${VAT_API_URL}/api/vat/generate/${period}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ companyId }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to generate VAT files' }))
      throw new Error(error.error || 'Failed to generate VAT files')
    }

    const data = await response.json()

    const files: Record<string, string> = {}
    const rawFiles: Record<string, Uint8Array> = {}

    for (const fileName in data) {
      files[fileName] = decodeBase64ToUtf8(data[fileName])
      rawFiles[fileName] = decodeBase64ToBytes(data[fileName])
    }

    return {
      files: files as unknown as VatFiles,
      rawFiles: rawFiles as unknown as VatFilesRaw
    }
  },
}
