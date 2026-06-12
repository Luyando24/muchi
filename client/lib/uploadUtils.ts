/**
 * Utility functions for handling client-side file uploads, WebP conversion,
 * and file size constraints (max 5MB).
 */

export const convertToWebP = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('File is not an image.'));
    }

    // Reject files larger than 10MB to prevent browser memory issues during conversion
    if (file.size > 10 * 1024 * 1024) {
      return reject(new Error('Image is too large to process. Please select an image under 10MB.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Failed to get canvas 2D context.'));
          }
          
          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Failed to convert image to WebP.'));
              }
              
              // Get original filename without extension
              const lastDotIndex = file.name.lastIndexOf('.');
              const baseName = lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name;
              
              const webpFile = new File([blob], `${baseName}.webp`, {
                type: 'image/webp',
                lastModified: Date.now()
              });
              
              resolve(webpFile);
            },
            'image/webp',
            0.8 // 80% quality compression
          );
        } catch (err: any) {
          reject(new Error(`Failed to convert image: ${err.message}`));
        }
      };
      img.onerror = () => {
        reject(new Error('Failed to load image file.'));
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read image file.'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Validates and processes a file before upload.
 * - Non-images: Enforces a 5MB size limit.
 * - Images: Converts to WebP format first, then enforces a 5MB size limit on the converted WebP image.
 */
export const processSchoolAsset = async (file: File): Promise<File> => {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  if (file.type.startsWith('image/')) {
    const webpFile = await convertToWebP(file);
    if (webpFile.size > MAX_SIZE) {
      throw new Error(`Converted WebP image exceeds the 5MB limit (${(webpFile.size / (1024 * 1024)).toFixed(2)}MB). Please use a smaller or lower resolution image.`);
    }
    return webpFile;
  } else {
    if (file.size > MAX_SIZE) {
      throw new Error(`File exceeds the 5MB limit (${(file.size / (1024 * 1024)).toFixed(2)}MB).`);
    }
    return file;
  }
};
