import { useState, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Send, X, RefreshCw, Users, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { mailingService, VendorDataResponse, VendorInfo, UploadedFileResponse } from '@/services/mailingService';

export default function Mailing() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedData, setUploadedData] = useState<VendorDataResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendComplete, setSendComplete] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileResponse[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUploadedFiles();
  }, []);

  const loadUploadedFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const files = await mailingService.getUploadedFiles();
      setUploadedFiles(files);
    } catch (error) {
      console.error('Error loading uploaded files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      await processFile(uploadedFile);
    }
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  };

  const processFile = async (file: File) => {
    setFile(file);
    setIsUploading(true);

    try {
      const response: VendorDataResponse = await mailingService.uploadExcelFile(file);
      setUploadedData(response);
      // Reload uploaded files list
      await loadUploadedFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      // Handle error appropriately
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendEmails = async () => {
    if (!uploadedData) return;

    setIsSending(true);
    try {
      // Note: Email sending would require vendors to be registered with emails
      // For now, just show success since data parsing worked
      setSendComplete(true);
    } catch (error) {
      console.error('Error sending emails:', error);
      // Handle error appropriately
    } finally {
      setIsSending(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadedData(null);
    setIsUploading(false);
    setSendComplete(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const vendorCount = uploadedData?.uniqueVendors || 0;
  const warningCount = uploadedData?.warnings?.length || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mailing System"
        description="Upload Excel files and trigger automated email workflows"
      />

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Upload Email Data
          </CardTitle>
          <CardDescription>
            Upload an Excel file (.xlsx, .xls) containing email recipients and content
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-8 text-center transition-colors',
                'hover:border-primary hover:bg-primary/5 cursor-pointer'
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Drop your file here</h3>
              <p className="text-muted-foreground mb-4">
                or click to browse from your computer
              </p>
              <p className="text-sm text-muted-foreground">
                Supports .xlsx and .xls files up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                {isUploading ? (
                  <RefreshCw className="w-10 h-10 text-primary animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-10 h-10 text-success" />
                )}
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                    {isUploading && ' - Processing...'}
                  </p>
                </div>
              </div>
              {!isUploading && (
                <Button variant="ghost" size="icon" onClick={handleReset}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Uploaded Files Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Uploaded Files
          </CardTitle>
          <CardDescription>
            Previously uploaded Excel files and their processing results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingFiles ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading files...</span>
            </div>
          ) : uploadedFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No uploaded files yet. Upload an Excel file to get started.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="table-header">File Name</TableHead>
                    <TableHead className="table-header">Size</TableHead>
                    <TableHead className="table-header">Rows</TableHead>
                    <TableHead className="table-header">Vendors</TableHead>
                    <TableHead className="table-header">Uploaded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadedFiles.map((uploadedFile) => (
                    <TableRow key={uploadedFile.id}>
                      <TableCell className="font-medium">{uploadedFile.originalFilename}</TableCell>
                      <TableCell>{(uploadedFile.fileSize / 1024).toFixed(1)} KB</TableCell>
                      <TableCell>{uploadedFile.totalRows}</TableCell>
                      <TableCell>{uploadedFile.vendorsCreated}</TableCell>
                      <TableCell>{new Date(uploadedFile.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Preview */}
      {uploadedData && !sendComplete && (
        <Card className="animate-slide-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Vendor Data Preview</CardTitle>
                <CardDescription>
                  Review the vendor data extracted from your Excel file
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="default" className="gap-1">
                  <Users className="w-3 h-3" />
                  {vendorCount} Vendors
                </Badge>
                {warningCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {warningCount} Warnings
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> {uploadedData.message}
              </p>
            </div>

            {uploadedData.warnings && uploadedData.warnings.length > 0 && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800 mb-2">Warnings:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {uploadedData.warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-border overflow-hidden mb-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="table-header">Vendor Name</TableHead>
                    <TableHead className="table-header">Row Count</TableHead>
                    <TableHead className="table-header">Row Numbers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadedData.vendors?.map((vendor, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{vendor.vendorName}</TableCell>
                      <TableCell>{vendor.rowCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {vendor.rowNumbers.join(', ')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Vendor data has been successfully extracted. You can now register these vendors with email addresses for mailing.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Upload New File
                </Button>
                <Button onClick={handleSendEmails} disabled={vendorCount === 0 || isSending}>
                  {isSending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirm Data ({vendorCount} vendors)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {sendComplete && (
        <Card className="animate-scale-in border-success/50 bg-success/5">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-success" />
            <h3 className="text-2xl font-bold mb-2">Vendor Data Processed Successfully!</h3>
            <p className="text-muted-foreground mb-6">
              {vendorCount} vendors have been identified from your Excel file
            </p>
            <Button onClick={handleReset}>
              Process Another File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
