// Coleções acessíveis pela API genérica. "videos" é só leitura: o arquivo nasce no servidor (/api/upload).
export const WRITABLE = new Set(["ideas", "news_topics", "scripts", "carousels", "series", "lead_magnets", "brand_kit", "editorial_line", "business", "persona", "sweeps", "patterns", "xray", "analyses", "stories"]);
export const READONLY = new Set(["scheduled_posts", "videos", "posts", "snapshots", "audience", "ig_connection", "ads_connection", "news_items"]);
// agendamento só nasce em /api/schedule (valida horário e repetição); aqui pode ser apagado
export const DELETABLE = new Set([...WRITABLE, "scheduled_posts"]);
export const SINGLETON = new Set(["business", "editorial_line", "brand_kit", "persona"]);
