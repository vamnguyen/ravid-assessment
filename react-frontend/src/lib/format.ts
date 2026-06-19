export function formatToken(token: string) {
  if (!token) {
    return "No token"
  }

  if (token.length <= 24) {
    return token
  }

  return `${token.slice(0, 14)}...${token.slice(-8)}`
}

export function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
