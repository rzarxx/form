/**
 * Compresses an image file on the client side using the Canvas API.
 * Keeps the aspect ratio but limits maximum dimensions and outputs compressed jpeg/png.
 * Non-image files or GIFs are returned as-is.
 */
export async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.75): Promise<File> {
  // If it's not an image or is an animated GIF, don't compress
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file); // fallback to original file
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert PNG to PNG compression, others to JPEG for better size savings
        const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            
            // Create a new File object with the same name
            const compressedFile = new File([blob], file.name, {
              type: outputType,
              lastModified: Date.now(),
            });

            // Only return the compressed file if it's actually smaller
            if (compressedFile.size < file.size) {
              console.log(`Image compressed: ${(file.size / 1024).toFixed(1)}KB -> ${(compressedFile.size / 1024).toFixed(1)}KB`);
              resolve(compressedFile);
            } else {
              console.log("Compressed image is larger or equal. Using original.");
              resolve(file);
            }
          },
          outputType,
          quality
        );
      };
      
      img.onerror = () => resolve(file);
    };
    
    reader.onerror = () => resolve(file);
  });
}
