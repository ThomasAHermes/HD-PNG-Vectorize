
export interface GeneratedImage {
  original: string; // Base64
  result: string | null; // Base64 or URL
  timestamp: number;
}

export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
