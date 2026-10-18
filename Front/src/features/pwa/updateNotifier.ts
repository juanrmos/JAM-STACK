export function notificarActualizaciones(alDetectarNueva: () => void) {
  if (!("serviceWorker" in navigator)) return;

  const versionActual = document.querySelector<HTMLMetaElement>('meta[name="app-version"]')?.content;
  let avisoMostrado = false;
  const avisar = () => {
    if (avisoMostrado) return;
    avisoMostrado = true;
    alDetectarNueva();
  };

  navigator.serviceWorker.ready.then((registro) => {
    registro.addEventListener("updatefound", () => {
      const nuevoWorker = registro.installing;
      nuevoWorker?.addEventListener("statechange", () => {
        if (nuevoWorker.state === "installed" && navigator.serviceWorker.controller) {
          avisar();
        }
      });
    });

    const comprobarVersionPublicada = async () => {
      if (document.visibilityState !== "visible" || !versionActual) return;

      try {
        const url = new URL(location.href);
        url.hash = "";
        url.searchParams.set("__version_check", String(Date.now()));
        const response = await fetch(url, {
          cache: "no-store",
          headers: { "X-PWA-Version-Check": "1" },
        });
        if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return;

        const html = await response.text();
        const documento = new DOMParser().parseFromString(html, "text/html");
        const versionPublicada = documento.querySelector<HTMLMetaElement>('meta[name="app-version"]')?.content;
        if (versionPublicada && versionPublicada !== versionActual) avisar();
      } catch {
        // No interrumpir el sitio si falla la conexión o vence la sesión del panel.
      }
    };

    const revisarAlVolver = () => {
      if (document.visibilityState !== "visible") return;
      void registro.update().catch(() => {});
      void comprobarVersionPublicada();
    };

    window.addEventListener("focus", revisarAlVolver);
    document.addEventListener("visibilitychange", revisarAlVolver);
    window.setInterval(revisarAlVolver, 15 * 60 * 1000);
    revisarAlVolver();
  });
}
