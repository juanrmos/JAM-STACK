import { adminApiRequest } from "../services/api/client";

const TOKEN_KEY = "admin_jwt";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  // Header requerido por CORS de Cloudflare Access aunque estemos en bypass
  headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await adminApiRequest(endpoint, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new TypeError(
        "No se pudo conectar con el servicio de administración. Verifica tu conexión o recarga la página para renovar la sesión.",
      );
    }
    throw err;
  }

  if (response.type === "opaqueredirect" || (response.status === 403 && getToken())) {
    window.location.reload();
  }

  // Si nos devuelve 401 (token expirado o inválido) estando logueados, limpiar y recargar
  if (response.status === 401 && getToken()) {
    removeToken();
    window.location.reload();
  }

  return response;
}

export function sanitizeImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 2000;
      const MAX_HEIGHT = 2000;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else if (height > MAX_HEIGHT) {
        width = Math.round((width * MAX_HEIGHT) / height);
        height = MAX_HEIGHT;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo procesar la imagen en tu navegador."));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "imagen";
            resolve(new File([blob], `${baseName}.webp`, { type: "image/webp" }));
          } else {
            reject(new Error("Error al intentar purificar la imagen."));
          }
        },
        "image/webp",
        0.9,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("El archivo seleccionado está corrupto o el formato no es válido (usa JPEG, PNG o WebP)."));
    };
    img.src = url;
  });
}

export async function uploadToSignedUrl(uploadUrl: string, file: File): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
  } catch (err) {
    if (err instanceof TypeError) {
      throw new TypeError(
        "No se pudo transferir el archivo al almacenamiento (R2). Verifica tu conexión o las credenciales R2 del servidor.",
      );
    }
    throw err;
  }
  if (!response.ok) {
    throw new Error(`Error subiendo el archivo al almacenamiento (HTTP ${response.status}).`);
  }
  return response;
}
