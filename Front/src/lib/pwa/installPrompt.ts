let eventoDiferido: any = null;

export function inicializarInstallPrompt(botonId: string) {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    eventoDiferido = event;
    const boton = document.getElementById(botonId);
    if (boton) boton.hidden = false;
  });

  document.getElementById(botonId)?.addEventListener("click", async () => {
    if (!eventoDiferido) return;
    eventoDiferido.prompt();
    await eventoDiferido.userChoice;
    eventoDiferido = null;
  });
}
