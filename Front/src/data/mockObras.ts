/**
 * Datos mock que replican el esquema de D1 (ver doc 03).
 * Serán reemplazados por fetch a /api/obras cuando el backend esté listo.
 * La interfaz Obra refleja lo que la API devuelve (imagen_key ya resuelta a URL).
 */

export interface Obra {
  id: string;
  titulo: string;
  descripcion?: string;
  categoria?: string;
  imagenUrl: string;
  videoUrl?: string;
  orden: number;
  destacado: boolean;
}

export const obrasMock: Obra[] = [
  {
    id: "a1b2c3d4",
    titulo: "Atardecer en la Costa",
    descripcion:
      "Mural exterior de gran formato — paisaje costero al atardecer con técnica de realismo clásico",
    categoria: "mural",
    imagenUrl: "/images/obra-1.jpg",
    orden: 1,
    destacado: true,
  },
  {
    id: "e5f6g7h8",
    titulo: "Retrato Clásico",
    descripcion: "Retrato al óleo sobre lienzo de lino",
    categoria: "cuadro",
    imagenUrl: "/images/obra-2.jpg",
    orden: 2,
    destacado: false,
  },
  {
    id: "i9j0k1l2",
    titulo: "Bosque de Niebla",
    descripcion: "Paisaje con niebla sobre tela de gran formato",
    categoria: "cuadro",
    imagenUrl: "/images/obra-3.jpg",
    orden: 3,
    destacado: false,
  },
  {
    id: "m3n4o5p6",
    titulo: "Texturas de la Piel",
    descripcion: "Estudio de texturas y luz natural",
    categoria: "cuadro",
    imagenUrl: "/images/obra-4.jpg",
    orden: 4,
    destacado: false,
  },
  {
    id: "q7r8s9t0",
    titulo: "Geometría Urbana",
    descripcion:
      "Mural de abstracción geométrica en fachada comercial",
    categoria: "mural",
    imagenUrl: "/images/obra-5.jpg",
    orden: 5,
    destacado: true,
  },
  {
    id: "u1v2w3x4",
    titulo: "Memorias del Valle",
    descripcion: "Paisaje al óleo inspirado en el valle andino",
    categoria: "cuadro",
    imagenUrl: "/images/obra-6.jpg",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    orden: 6,
    destacado: false,
  },
];
