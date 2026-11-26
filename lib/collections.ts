// Coleções acessíveis pela API genérica. "videos" é só leitura: o arquivo nasce no servidor (/api/upload).
export const WRITABLE = new Set(["ideas", "news_topics", "scripts", "carousels", "series", "lead_magnets", "scheduled_posts", "brand_kit", "editorial_line", "business", "persona", "sweeps", "patterns", "xray", "analyses", "stories"]);
export const READONLY = new Set(["videos", "posts", "snapshots", "audience", "ig_connection", "ads_connection", "news_items"]);
export const SINGLETON = new Set(["business", "editorial_line", "brand_kit", "persona"]);
