import api from '@/lib/api';

export interface EmailRecord {
  id: number;
  email: string;
  name: string;
  subject: string;
  status: 'valid' | 'error' | 'pending';
  error?: string;
}

export interface VendorDataResponse {
  valid: boolean;
  totalRows: number;
  uniqueVendors: number;
  vendors: VendorInfo[];
  warnings: string[];
  message: string;
}

export interface VendorInfo {
  vendorName: string;
  rowCount: number;
  rowNumbers: number[];
}

export interface EmailValidationResponse {
  valid: boolean;
  totalEmails: number;
  validEmails: number;
  invalidEmails: number;
  validEmailList: string[];
  errors: EmailError[];
  message: string;
}

export interface EmailError {
  row: number;
  email: string;
  error: string;
}

export interface EmailRequest {
  recipients: EmailRecipient[];
  subject: string;
  body: string;
}

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface UploadedFileResponse {
  id: number;
  originalFilename: string;
  fileSize: number;
  contentType: string;
  fileType: string;
  totalRows: number;
  uniqueVendors: number;
  vendorsCreated: number;
  createdAt: string;
  processedAt: string;
  notes: string;
}

export interface DeletionSummaryResponse {
  message: string;
  costingsDeleted: number;
  assetsDeleted: number;
  movementsDeleted: number;
  vendorsDeleted: number;
  totalDeleted: number;
}

export const mailingService = {
  uploadExcelFile: async (file: File): Promise<VendorDataResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/mailing/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getUploadedFiles: async (): Promise<UploadedFileResponse[]> => {
    const response = await api.get('/uploaded-files');
    return response.data;
  },

  deleteUploadedFile: async (fileId: number): Promise<DeletionSummaryResponse> => {
    const response = await api.delete(`/uploaded-files/${fileId}`);
    return response.data;
  },

  sendEmails: async (request: EmailRequest): Promise<any> => {
    const response = await api.post('/mailing/send', request);
    return response.data;
  },
};