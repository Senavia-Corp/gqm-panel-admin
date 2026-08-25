export interface PodioFailedSync {
  id: number;
  item_id: string | null;
  hook_type: string | null;
  payload: any | null;
  error_message: string | null;
  resolved: boolean;
  created_at: string;
  updated_at: string;

  /**
   * ¿El fichero de esta falla llegó de verdad a `attachments`?
   *
   * `null`/`undefined` cuando la falla no habla de adjuntos, o cuando no se
   * pudo comprobar.
   *
   * Sin este dato el panel pintaba IGUAL un resuelto real y uno de mentira. En
   * producción hay 7 filas con `resolved = true` cuyos 7 ficheros siguen sin
   * estar: el botón devolvía «Resync exitoso» sin haber trabajado, y aquí no
   * había forma de desmentirlo.
   */
  fichero_recuperado?: boolean | null;

  /** Los file_id que siguen sin estar como pedía el evento. */
  file_ids_pendientes?: string[] | null;
}

export interface FailedSyncsCount {
  count: number;
}

/** Una app-año de Podio comparada contra la BD. */
export interface FilaParidad {
  tipo: string;
  anio: number;
  podio: {
    app_id: string;
    filtered: number | null;
    total: number | null;
    enumerados: number | null;
  };
  bd: { por_anio: number; por_app_id: number };
  /**
   * Años que comparten el mismo app_id. Vacío en producción; en desarrollo son
   * los cuatro, porque las credenciales TAP se reutilizan para todos.
   */
  apps_colapsadas: number[];
  /** Si es false, comparar por año no significa nada: hay que mirar por_app_id. */
  comparable_por_anio: boolean;
  delta: number;
  ok: boolean;
  nota?: string;
  inconsistente?: string;
}

export interface RespuestaParidad {
  filas: FilaParidad[];
  errores: { tipo: string; anio: number; error: string }[];
  ok: boolean;
  enumerado: boolean;
}
