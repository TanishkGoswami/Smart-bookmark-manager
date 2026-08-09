export const DEFAULT_STYLE_SETTINGS = {
  primaryColor: '#8a2b34',
  boardColor: '#a18b8c',
  boardOpacity: 85,
  boardBlur: 24,
  isDarkBg: true,
}

export const hasChromeApi = (apiName) =>
  typeof chrome !== 'undefined' && Boolean(chrome[apiName])

export const parseBookmarkUrl = (value) => {
  if (!value) return null

  try {
    return new URL(value)
  } catch {
    try {
      return new URL(`https://${value}`)
    } catch {
      return null
    }
  }
}

export const getBookmarkHostname = (url) => parseBookmarkUrl(url)?.hostname || 'localhost'

export const getFaviconUrl = (url, size = 32) => {
  const domain = encodeURIComponent(getBookmarkHostname(url))
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`
}

export const cleanBookmarkTitle = (title) => {
  if (!title) return ''

  const parsedUrl = parseBookmarkUrl(title)
  let cleaned = parsedUrl ? parsedUrl.hostname : title

  cleaned = cleaned.replace(/^www\./i, '')
  const tldRegex = /\.(com|in|org|net|co|io|dev|app|edu|gov|us|uk)$/i
  if (tldRegex.test(cleaned)) {
    cleaned = cleaned.replace(tldRegex, '')
  }

  if (!cleaned.includes(' ') && cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  return cleaned
}

export const hexToRgba = (hex, opacity) => {
  if (!hex || hex.length !== 7) return `rgba(255, 255, 255, ${opacity / 100})`

  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`
}
