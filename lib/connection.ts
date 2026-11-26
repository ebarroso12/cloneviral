// Gravar a conexão do Instagram sem misturar contas nem perder histórico.
import fs from "node:fs";
import path from "node:path";
import { getStore, dataDir, scopedId, publicDoc } from "./store";
import { encrypt, type IgAccount } from "./instagram";

const HISTORY = ["posts", "snapshots", "audience"];

export class OtherAccount extends Error {
  constructor(username: string) {
    super(`Essa autorização é de outra conta (@${username}). Para trocar, confirme: o histórico atual é guardado em uma cópia e a medição recomeça.`);
  }
}

export async function saveConnection(userId: string, o: { token: string; expiresIn: number; account: IgAccount; confirmSwitch?: boolean }) {
  const store = getStore();
  const [cur] = await store.list("ig_connection", userId);
  const same = !!cur && !cur.demo && cur.igId === o.account.igId;
  const switching = !!cur && !cur.demo && !!cur.igId && !same;
  if (switching && !o.confirmSwitch) throw new OtherAccount(o.account.username);

  if (switching) {
    const copy: Record<string, unknown> = { conexao: publicDoc(cur) };
    for (const c of HISTORY) copy[c] = await store.list(c, userId);
    const dir = path.join(dataDir(), "backups");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `conta-${String(cur.igId).replace(/\W/g, "")}-${Date.now()}.json`), JSON.stringify(copy));
    // o que estava marcado para sair na conta antiga não sai sozinho na nova
    for (const p of await store.list("scheduled_posts", userId))
      if (p.autoPublish && p.status === "agendado") await store.update("scheduled_posts", p.id, userId, { autoPublish: false, error: "A conta conectada mudou. Agende de novo se quiser publicar nesta." });
  }
  if (switching || cur?.demo) {
    for (const c of HISTORY) await store.removeAllForUser(c, userId);
  }
  const data = {
    demo: false,
    token: encrypt(o.token),
    igId: o.account.igId,
    pageId: o.account.pageId,
    igUsername: o.account.username,
    status: "connected",
    authorizedUntil: new Date(Date.now() + o.expiresIn * 1000).toISOString(),
    measuringSince: same ? cur.measuringSince : new Date().toISOString().slice(0, 10),
    syncError: null,
    ...(same ? {} : { lastSync: null, lastSyncAttempt: null, syncWarnings: [], syncPartial: false, picture: null, name: o.account.username, bio: "", link: "" }),
  };
  return cur ? store.update("ig_connection", cur.id, userId, data) : store.insert("ig_connection", userId, data, scopedId(userId, "conn"));
}
