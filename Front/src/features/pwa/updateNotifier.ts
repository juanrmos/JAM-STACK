export function notificarActualizaciones(alDetectarNueva: () => void) {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.ready.then((registro) => {
    registro.addEventListener("updatefound", () => {
      const nuevoWorker = registro.installing;
      nuevoWorker?.addEventListener("statechange", () => {
        if (nuevoWorker.state === "installed" && navigator.serviceWorker.controller) {
          alDetectarNueva();
        }
      });
    });
  });
}
