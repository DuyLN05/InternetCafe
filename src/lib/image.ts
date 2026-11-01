/** Nén ảnh người dùng chọn → data URL JPEG/WebP nhỏ gọn (tối đa 640px) để lưu trong state */
export function compressImage(file: File, max = 640, quality = 0.84): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Vui lòng chọn một tệp ảnh (JPG, PNG, WebP).'))
    if (file.size > 12 * 1024 * 1024) return reject(new Error('Ảnh quá lớn (tối đa 12 MB).'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k))
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); return reject(new Error('Trình duyệt không hỗ trợ xử lý ảnh.')) }
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh này.')) }
    img.src = url
  })
}
