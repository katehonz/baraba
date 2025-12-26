// Simple toaster placeholder for Chakra UI v3
export const toaster = {
  create: (options: { title: string; description?: string; type?: string; duration?: number }) => {
    console.log(`Toast: ${options.type} - ${options.title}`, options.description)
    // For now, use browser alert as fallback
    if (options.type === 'error') {
      alert(`Error: ${options.title}\n${options.description || ''}`)
    }
  }
}

export function Toaster() {
  return null
}
