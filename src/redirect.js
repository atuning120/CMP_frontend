import { broadcastResponseToMainFrame } from '@azure/msal-browser/redirect-bridge'

// Entrega a la ventana principal el resultado del login con Microsoft y cierra la ventana emergente
broadcastResponseToMainFrame().catch(() => {
  // Si se abrió fuera de un login (p. ej. directo en el navegador) no hay nada que entregar
})
