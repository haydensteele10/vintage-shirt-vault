import { supabase } from './supabase'

const UNSUPPORTED_TYPES = ['image/heic', 'image/heif']
const MAX_DIMENSION = 1568 // Claude's recommended max for vision

export async function analyzeShirtPhoto(file) {
  if (UNSUPPORTED_TYPES.includes(file.type.toLowerCase())) {
    throw new Error('HEIC/HEIF photos cannot be analyzed. Please use a JPEG, PNG, or WebP photo.')
  }

  // Resize to ≤1568px and normalize to JPEG before sending — keeps payload under Supabase's 6 MB limit
  const { base64, mediaType } = await resizeToBase64(file)

  const { data, error } = await supabase.functions.invoke('analyze-shirt', {
    body: { imageData: base64, mediaType },
  })
  if (error) throw new Error(error.message)
  if (data?.error) throw new Error(data.error)
  return data.result
}

function resizeToBase64(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = document.createElement('canvas')
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        if (w >= h) { h = Math.round(h * MAX_DIMENSION / w); w = MAX_DIMENSION }
        else { w = Math.round(w * MAX_DIMENSION / h); h = MAX_DIMENSION }
      }
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' })
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not read image file')) }
    img.src = objectUrl
  })
}
