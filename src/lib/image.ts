import { isBackend, uploadImage } from './remote'

/**
 * Chuẩn hóa ảnh trước khi lưu: giữ độ phân giải phù hợp với vị trí hiển thị,
 * ưu tiên WebP để giảm dung lượng nhưng vẫn giữ chi tiết và kênh alpha.
 * Trình duyệt cũ không hỗ trợ WebP sẽ tự dùng JPEG.
 */
export function compressImage(file: File, max = 1600, quality = 0.92): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Vui lòng chọn một tệp ảnh (JPG, PNG, WebP).'))
    if (file.size > 12 * 1024 * 1024) return reject(new Error('Ảnh quá lớn (tối đa 12 MB).'))

    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height))
      const w = Math.max(1, Math.round((img.naturalWidth || img.width) * k))
      const h = Math.max(1, Math.round((img.naturalHeight || img.height) * k))
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d', { alpha: true })
      if (!ctx) {
        URL.revokeObjectURL(url)
        return reject(new Error('Trình duyệt không hỗ trợ xử lý ảnh.'))
      }

      // Giảm răng cưa khi thu nhỏ ảnh lớn; không vẽ nền trắng để WebP giữ được độ trong suốt.
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)

      try {
        const webp = c.toDataURL('image/webp', Math.max(0.5, Math.min(1, quality)))
        if (webp.startsWith('data:image/webp')) {
          resolve(webp)
          return
        }
        // Fallback JPEG cho trình duyệt không hỗ trợ WebP; JPEG không có alpha.
        const jpegCanvas = document.createElement('canvas')
        jpegCanvas.width = w
        jpegCanvas.height = h
        const jpegCtx = jpegCanvas.getContext('2d')
        if (!jpegCtx) return reject(new Error('Không thể tạo ảnh JPEG trên trình duyệt này.'))
        jpegCtx.fillStyle = '#fff'
        jpegCtx.fillRect(0, 0, w, h)
        jpegCtx.drawImage(c, 0, 0)
        resolve(jpegCanvas.toDataURL('image/jpeg', Math.max(0.5, Math.min(1, quality))))
      } catch {
        reject(new Error('Không thể xử lý ảnh này. Hãy thử lưu ảnh thành JPG hoặc WebP rồi tải lại.'))
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Không đọc được ảnh này.'))
    }
    img.src = url
  })
}

/** Nén ảnh chất lượng cao; khi dùng XAMPP, tải ảnh lên data/uploads và chỉ lưu đường dẫn. */
export async function prepareImage(file: File, max = 1600, quality = 0.92): Promise<string> {
  const d = await compressImage(file, max, quality)
  if (!isBackend()) return d
  const name = await uploadImage(d)
  if (!name) throw new Error('Không tải được ảnh lên máy chủ (kiểm tra XAMPP đã bật Apache và quyền ghi thư mục data/uploads).')
  return name
}
