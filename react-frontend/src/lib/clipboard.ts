export async function copyTextToClipboard(value: string) {
  if (!value) {
    return false
  }

  await navigator.clipboard.writeText(value)
  return true
}
