export class FileUploadService {
    private uploadUrl: string;
  
    constructor(uploadUrl: string) {
      this.uploadUrl = uploadUrl;
    }
  
    async bulkUpload(files: File[]): Promise<{ filenames: string[] }> {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("file", file);
      });
  
      const response = await fetch(this.uploadUrl, {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error("File upload failed");
      }
  
      return response.json();
    }
  }
  