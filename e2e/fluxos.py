"""Fluxos de ponta a ponta do clone (replica/test-plan.md), contra um servidor local com banco temporário.

    npm run build
    RV_DEMO=1 RV_DATA_DIR=<pasta vazia> npx next start -p 3100
    python e2e/fluxos.py http://localhost:3100

Roda só contra o clone. Falha também em erro de console e em resposta 5xx inesperada.
"""
import json
import os
import re
import sys
import time

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3100"
SHOTS = os.path.join(os.path.dirname(__file__), "..", "replica", "clone-screens")
os.makedirs(SHOTS, exist_ok=True)

ROTAS = ["metricas", "conexoes", "persona", "meu-negocio", "identidade-visual", "varredura", "noticias", "ideias",
         "roteiro", "carrossel", "serie", "isca", "planejador-editorial", "meu-perfil-pronto", "clube",
         "clube/sala-de-analise", "clube/raio-x", "clube/stories",
         "clube/roteiros", "meu-plano"]

resultados = []
problemas = []


def caso(cid):
    def deco(fn):
        def run(*a):
            t = time.time()
            try:
                fn(*a)
                resultados.append((cid, "passou", "", time.time() - t))
            except Exception as e:  # noqa: BLE001 - o relatório precisa de todos os casos
                msg = str(e).strip().split("\n")[0][:300]
                resultados.append((cid, "falhou", msg, time.time() - t))
            print(cid, resultados[-1][1], resultados[-1][2], flush=True)
        return run
    return deco


def vigiar(page):
    page.on("pageerror", lambda e: problemas.append(f"pageerror {page.url}: {e}"))
    page.on("console", lambda m: m.type == "error" and problemas.append(f"console {page.url}: {m.text[:200]}"))
    page.on("response", lambda r: r.status >= 500 and r.status != 501 and problemas.append(f"{r.status} {r.url}"))
    page.on("dialog", lambda d: d.accept())


def api(page, metodo, rota, corpo=None):
    r = page.request.fetch(BASE + rota, method=metodo, data=json.dumps(corpo) if corpo is not None else None,
                           headers={"content-type": "application/json"})
    try:
        return r.status, r.json()
    except Exception:  # noqa: BLE001
        return r.status, r.body()


def saldo(page):
    return api(page, "GET", "/api/credits")[1]["available"]


def ir(page, rota):
    page.goto(f"{BASE}/{rota}", wait_until="networkidle")


@caso("SEG-2 API sem sessão devolve 401")
def sem_sessao(page):
    for rota in ["/api/metrics", "/api/credits", "/api/c/posts", "/api/c/ig_connection", "/api/upload?id=x", "/api/pdf/script/x"]:
        s, _ = api(page, "GET", rota)
        assert s == 401, f"{rota} devolveu {s}"
    for rota in ["/api/ai/scripts", "/api/ads", "/api/credits", "/api/ig/sync"]:
        s, _ = api(page, "POST", rota, {})
        assert s == 401, f"POST {rota} devolveu {s}"


@caso("F01-H1 entrar e ver o painel")
def entrar(page):
    ir(page, "login")
    page.get_by_role("button", name="Preencher conta de demonstração").click()
    page.get_by_role("button", name="Entrar", exact=True).click()
    page.wait_for_url("**/metricas", timeout=60000)
    page.get_by_role("heading", name="Análise de engajamento").wait_for(timeout=60000)
    assert page.get_by_text("Conectado").first.is_visible()


@caso("F01-H2 período muda só crescimento e alcance")
def periodo(page):
    ir(page, "metricas")
    page.get_by_role("heading", name="Análise de engajamento").wait_for()
    a = api(page, "GET", "/api/metrics?period=hoje")[1]
    b = api(page, "GET", "/api/metrics?period=30d")[1]
    assert a["engagement"] == b["engagement"] and a["profile"] == b["profile"] and a["views"] == b["views"]
    assert len(a["growth"]["series"]) < len(b["growth"]["series"])
    page.get_by_role("button", name="7 dias").click()
    assert page.get_by_role("button", name="7 dias").get_attribute("aria-pressed") == "true"


@caso("S01 ordenar top 12, abrir post e fechar com Esc")
def top12(page):
    ir(page, "metricas")
    page.get_by_role("button", name="Salvamentos", exact=True).click()
    page.get_by_role("button", name=re.compile("^Abrir post de")).first.click()
    page.get_by_role("dialog").wait_for()
    page.keyboard.press("Escape")
    page.get_by_role("dialog").wait_for(state="detached")


@caso("S01 ajuda (i) abre no clique do mouse")
def ajuda(page):
    ir(page, "metricas")
    b = page.get_by_role("button", name="Como eu chego neste número de visualizações")
    b.click()
    page.wait_for_timeout(300)
    assert page.get_by_role("tooltip").is_visible(), "o clique fechou a ajuda que o ponteiro tinha acabado de abrir"


@caso("F01-N2 anúncios simulados só na demonstração")
def anuncios(page):
    s, _ = api(page, "POST", "/api/ads", {"action": "connect"})
    assert s == 200
    m = api(page, "GET", "/api/metrics")[1]
    assert m["views"]["ads"] and "token" not in m["connection"]
    api(page, "POST", "/api/ads", {"action": "disconnect"})


@caso("F01-E1 conectar sem app Meta avisa")
def conectar(page):
    ir(page, "conexoes")
    page.get_by_role("link", name="Refazer a autorização").click()
    page.get_by_text("O app Meta ainda não foi configurado").wait_for()


@caso("F02-H1 persona, negócio e identidade persistem")
def configurar(page):
    ir(page, "persona")
    page.locator("#cliente").fill("Dentistas que querem agenda cheia 🦷 com ação e coração")
    page.get_by_role("button", name=re.compile("persona · 8 créditos")).click()
    page.get_by_text("Persona criada.").wait_for()
    ir(page, "persona")
    assert "🦷" in page.locator("#cliente").input_value()
    ir(page, "meu-negocio")
    page.get_by_role("button", name="Editar").first.click()
    page.locator("#name").fill("Dra. Ágata " + "x" * 400)
    page.get_by_role("button", name="Salvar").click()
    page.get_by_text("Salvo.").wait_for()
    ir(page, "meu-negocio")
    assert page.get_by_text("Dra. Ágata").first.is_visible()
    ir(page, "identidade-visual")
    page.locator("#n").fill("Ágata")
    import base64
    page.get_by_role("button", name="4. Logo e tom").click()
    png = page.evaluate("(() => { const c = document.createElement('canvas'); c.width = 120; c.height = 120; c.getContext('2d').fillRect(10, 10, 90, 90); return c.toDataURL('image/png').split(',')[1]; })()")
    page.locator("#logo").set_input_files({"name": "l.png", "mimeType": "image/png", "buffer": base64.b64decode(png)})
    page.get_by_role("button", name="Remover logo").wait_for()
    page.locator("svg image").first.wait_for(state="attached")
    page.get_by_role("button", name="5. Revisar").click()
    page.get_by_role("button", name="Aplicar identidade").click()
    page.get_by_text("Identidade aplicada aos próximos carrosséis.").wait_for()
    ir(page, "identidade-visual")
    assert page.locator("#n").input_value() == "Ágata"


@caso("F03-H1 varredura de 5 roteiros cobra 8")
def varredura(page):
    antes = saldo(page)
    ir(page, "varredura")
    page.get_by_role("button", name="Iniciar varredura · 8 créditos").click()
    page.get_by_text("Varredura pronta.").wait_for(timeout=60000)
    assert antes - saldo(page) == 8, f"cobrou {antes - saldo(page)}"


@caso("F03-N1 varredura sem tipo é recusada")
def sem_tipo(page):
    antes = saldo(page)
    s, _ = api(page, "POST", "/api/ai/varredura", {"types": []})
    assert s == 400 and saldo(page) == antes


@caso("F04-H1 roteiro, PDF e F04-E1 regenerar sem cópia")
def roteiro(page):
    ir(page, "roteiro")
    page.locator("#tema").fill("agenda cheia")
    page.get_by_role("button", name="Criar roteiro · 1 crédito").click()
    page.get_by_text("Roteiro criado.", exact=True).wait_for()
    lista = api(page, "GET", "/api/c/scripts")[1]
    n = len(lista)
    r = page.request.get(f"{BASE}/api/pdf/script/{lista[0]['id']}")
    assert r.status == 200 and r.body()[:4] == b"%PDF", f"PDF {r.status}"
    ir(page, "roteiro")
    page.get_by_role("button", name="Regenerar · 1 crédito").first.click()
    page.get_by_text("Roteiro refeito.").wait_for()
    assert len(api(page, "GET", "/api/c/scripts")[1]) == n, "regenerar criou cópia"


@caso("F04-H1 carrossel cria, aprova e baixa PNG 1080x1440")
def carrossel(page):
    ir(page, "carrossel")
    page.locator("#t").fill("3 erros na agenda")
    page.get_by_role("button", name="Criar carrossel · 2 créditos").click()
    page.get_by_text("Carrossel criado.", exact=True).wait_for()
    page.get_by_role("button", name="Aprovar").first.click()
    page.get_by_text("Aprovado").first.wait_for()
    with page.expect_download() as d:
        page.get_by_role("button", name="Baixar PNG", exact=True).first.click()
    with open(d.value.path(), "rb") as f:
        h = f.read(24)
    w, a = int.from_bytes(h[16:20], "big"), int.from_bytes(h[20:24], "big")
    assert (w, a) == (1080, 1440), f"tamanho {w}x{a}"


@caso("S10 carrossel com foto própria na capa")
def capa(page):
    import base64
    ir(page, "carrossel")
    png = page.evaluate("(() => { const c = document.createElement('canvas'); c.width = 300; c.height = 200; const x = c.getContext('2d'); x.fillStyle = '#0a0'; x.fillRect(0, 0, 300, 200); return c.toDataURL('image/png').split(',')[1]; })()")
    page.locator("#t").fill("capa com foto")
    page.get_by_role("button", name="Com foto na capa").click()
    page.locator("#foto").set_input_files({"name": "f.png", "mimeType": "image/png", "buffer": base64.b64decode(png)})
    page.get_by_text("Foto pronta.").wait_for()
    page.get_by_role("button", name="Criar carrossel · 2 créditos").click()
    page.get_by_text("Carrossel criado.", exact=True).wait_for()
    page.locator("svg image").first.wait_for(state="attached")
    with page.expect_download() as d:
        page.get_by_role("button", name="Baixar PNG", exact=True).first.click()
    assert os.path.getsize(d.value.path()) > 5000


@caso("F04-H1 isca com PDF")
def isca(page):
    ir(page, "isca")
    page.locator("#k").fill("AGENDA")
    page.get_by_role("button", name="Criar isca · 3 créditos").click()
    page.get_by_text("Isca criada.", exact=True).wait_for()
    i = api(page, "GET", "/api/c/lead_magnets")[1][0]
    assert page.request.get(f"{BASE}/api/pdf/isca/{i['id']}").body()[:4] == b"%PDF"


@caso("F04-E2 saldo nunca negativo com pedidos simultâneos")
def simultaneo(page):
    antes = saldo(page)
    n = antes + 3
    page.evaluate("""async (n) => { await Promise.all(Array.from({length: n}, () =>
        fetch('/api/ai/scripts', {method: 'POST', headers: {'content-type': 'application/json'}, body: '{"type":"viral"}'}))) }""", n)
    assert saldo(page) == 0, f"saldo {saldo(page)}"


@caso("F03-N2 sem saldo: 402 e nada preso em rodando")
def sem_saldo(page):
    s, _ = api(page, "POST", "/api/ai/varredura", {"types": ["viral"], "scripts": 5})
    assert s == 402, f"status {s}"
    assert all(x["status"] != "rodando" for x in api(page, "GET", "/api/c/sweeps")[1])


@caso("F06-H1 extrato bate com o saldo e mais créditos funciona")
def plano(page):
    s = api(page, "GET", "/api/credits")[1]
    assert sum(r["amount"] for r in s["rows"]) == s["available"]
    ir(page, "meu-plano")
    page.get_by_role("button", name="Quero mais créditos").click()
    page.get_by_text("Mais 20 créditos, sem custo.", exact=True).wait_for()
    assert saldo(page) == s["available"] + 20


@caso("F04-H1 série de 3 capítulos cobra 5")
def serie(page):
    antes = saldo(page)
    ir(page, "serie")
    page.locator("#t").fill("do zero à agenda cheia")
    page.get_by_role("button", name="3", exact=True).click()
    page.get_by_role("button", name="Criar série · 5 créditos").click()
    page.get_by_text("Série criada.").wait_for()
    assert antes - saldo(page) == 5


@caso("F07-H1 sala de análise, raio-x e stories")
def circulo(page):
    ir(page, "clube/sala-de-analise")
    page.locator("#rt").fill("Você dorme mal? Apague as telas uma hora antes. Salve este vídeo.")
    page.get_by_role("button", name="Analisar roteiro").click()
    page.get_by_text("Gancho", exact=True).wait_for()
    page.get_by_role("button", name="Vídeo", exact=True).click()
    page.locator("#av").set_input_files({"name": "a.mp4", "mimeType": "video/mp4", "buffer": b"0" * 1024})
    page.get_by_text("Não consegui ler as dimensões.").wait_for()
    page.get_by_role("button", name="Perfil", exact=True).click()
    page.get_by_role("button", name="Analisar meu perfil · 2 créditos").click()
    page.get_by_text("Análise pronta.", exact=True).wait_for()
    ir(page, "clube/raio-x")
    page.get_by_role("button", name="Fazer raio-x · 1 crédito").click()
    page.get_by_text("Raio-X pronto.", exact=True).wait_for()
    ir(page, "clube/raio-x")
    page.get_by_role("button", name="Raio-X do perfil · 2 créditos").click()
    page.get_by_text("Raio-X do perfil pronto.").wait_for()
    page.get_by_text("Destaques", exact=True).last.wait_for()
    ir(page, "clube/stories")
    page.locator("#g").fill("convidar para a avaliação")
    page.get_by_role("button", name="Criar sequência · 1 crédito").click()
    page.get_by_text("Sequência criada.").wait_for()


@caso("F05-H1 ideia e agendamento no calendário")
def planejar(page):
    ir(page, "ideias")
    page.get_by_label("Nova ideia").fill("mitos sobre clareamento")
    page.get_by_role("button", name="Adicionar").click()
    page.get_by_text("mitos sobre clareamento").wait_for()
    page.get_by_role("button", name="Mover para a próxima coluna").first.click()
    page.wait_for_timeout(500)
    assert api(page, "GET", "/api/c/ideas")[1][0]["status"] == "roteirizando"
    page.get_by_role("button", name="Virar roteiro · 1 crédito").first.click()
    page.get_by_role("link", name="Ver o roteiro").first.wait_for()
    ir(page, "planejador-editorial")
    page.locator(".cal button.today").click()
    page.locator("#c").fill("legenda do dia")
    page.get_by_role("button", name="Agendar").click()
    page.get_by_text("Post agendado.").wait_for()
    page.locator(".cal .evt").first.wait_for()


@caso("F05-E1 envio de vídeo: formato errado recusado, mp4 aceito")
def video(page):
    ir(page, "planejador-editorial")
    page.locator("input[type=file]").set_input_files({"name": "a.avi", "mimeType": "video/avi", "buffer": b"0"})
    page.get_by_text("Formato inválido").wait_for()
    page.locator("input[type=file]").set_input_files({"name": "a.mp4", "mimeType": "video/mp4", "buffer": b"0" * 2048})
    page.get_by_text("Vídeo enviado.").wait_for()
    v = api(page, "GET", "/api/c/videos")[1][0]
    assert page.request.get(f"{BASE}/api/upload?id={v['id']}").status == 200
    s, _ = api(page, "PATCH", f"/api/c/videos?id={v['id']}", {"ext": "/../../db.json"})
    assert s == 404, f"PATCH em vídeos devolveu {s}"


@caso("todas as telas abrem sem erro")
def telas(page):
    ruins = []
    for rota in ROTAS:
        r = page.goto(f"{BASE}/{rota}", wait_until="networkidle")
        if r.status != 200 or page.get_by_role("heading", level=1).count() == 0:
            ruins.append(f"{rota} {r.status}")
        page.screenshot(path=os.path.join(SHOTS, rota.replace("/", "_") + ".png"), full_page=rota != "metricas")
    ir(page, "metricas")
    assert not page.get_by_role("button", name="Abrir menu").is_visible(), "botão de menu aparece no computador"
    topos = {round(k.bounding_box()["y"]) for k in page.locator(".grid.g4 > .kpi").all()}
    assert len(topos) == 1, f"os quatro indicadores não estão na mesma linha: {topos}"
    assert not ruins, ", ".join(ruins)


@caso("VIS-1 390 px sem rolagem lateral e menu abre")
def movel(page):
    page.set_viewport_size({"width": 390, "height": 844})
    ruins = []
    for rota in ROTAS:
        ir(page, rota)
        sobra = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
        if sobra > 1:
            ruins.append(f"{rota} (+{sobra}px)")
        page.screenshot(path=os.path.join(SHOTS, "m_" + rota.replace("/", "_") + ".png"))
    ir(page, "metricas")
    page.get_by_role("button", name="Abrir menu").click()
    page.get_by_role("link", name="Roteiro", exact=True).click()
    page.wait_for_url("**/roteiro")
    page.set_viewport_size({"width": 1440, "height": 900})
    assert not ruins, ", ".join(ruins)


@caso("S09 abrir, editar, copiar, teleprompter, já gravei e excluir roteiro")
def acoes_roteiro(page):
    page.context.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE)
    ir(page, "roteiro")
    n = len(api(page, "GET", "/api/c/scripts")[1])
    page.get_by_role("button", name="Abrir", exact=True).first.click()
    page.get_by_text("CTA:").first.wait_for()
    page.get_by_role("button", name="Editar").first.click()
    page.locator(".field input").nth(1).wait_for()
    campo = page.locator("div.field", has=page.locator("label", has_text="Título")).locator("input").first
    campo.fill("título editado")
    page.get_by_role("button", name="Salvar").click()
    page.get_by_text("Roteiro salvo.").wait_for()
    page.get_by_role("heading", name="título editado").wait_for()
    page.get_by_role("button", name="Copiar").first.click()
    page.get_by_text("Roteiro copiado.").wait_for()
    assert "Gancho:" in page.evaluate("navigator.clipboard.readText()")
    page.get_by_role("button", name="Teleprompter").first.click()
    page.get_by_role("dialog", name="Teleprompter").wait_for()
    page.keyboard.press("Escape")
    page.get_by_role("button", name="Já gravei").first.click()
    page.get_by_role("button", name="Desmarcar gravado").first.wait_for()
    page.get_by_role("button", name="Excluir").first.click()
    page.wait_for_timeout(1500)
    assert len(api(page, "GET", "/api/c/scripts")[1]) == n - 1


@caso("S08 arrastar ideia entre colunas")
def arrastar(page):
    api(page, "POST", "/api/c/ideas", {"text": "cartão arrastado", "status": "ideia"})
    ir(page, "ideias")
    page.locator(".idea", has_text="cartão arrastado").drag_to(page.locator(".col[aria-label='Gravado']"))
    page.locator(".col[aria-label='Gravado'] .idea", has_text="cartão arrastado").wait_for()


@caso("S11 catálogo com 100 modelos em 13 categorias")
def catalogo(page):
    ir(page, "carrossel")
    page.get_by_role("button", name="Escolher entre 100 modelos").click()
    chips = page.get_by_role("dialog").locator(".chips .chip")
    assert chips.count() == 13, chips.count()
    total = sum(int(re.search(r"\((\d+)\)", t).group(1)) for t in chips.all_inner_texts())
    assert total == 100, total
    page.get_by_role("dialog").locator("button.card").first.click()
    page.get_by_role("button", name=re.compile("slides$")).wait_for()


@caso("S13 isca a partir de roteiro colado e S16 linha editorial persiste")
def isca_colada(page):
    ir(page, "isca")
    page.get_by_role("button", name="Colar um roteiro").click()
    page.locator("#tx").fill("roteiro colado sobre sono reparador")
    page.locator("#k").fill("SONO")
    page.get_by_role("button", name="Criar isca · 3 créditos").click()
    page.get_by_text("Isca criada.", exact=True).wait_for()
    assert "sono reparador" in json.dumps(api(page, "GET", "/api/c/lead_magnets")[1], ensure_ascii=False)
    ir(page, "planejador-editorial")
    page.get_by_role("button", name="Mais Virais").click()
    page.wait_for_timeout(1000)
    ir(page, "planejador-editorial")
    assert page.get_by_text(re.compile(r"/ 4$")).is_visible()


@caso("S02/S20 menu da conta, desconectar e sair")
def sair(page):
    ir(page, "metricas")
    page.get_by_role("button", name=re.compile("^Conta:")).click()
    assert page.get_by_role("menuitem", name="Ver o meu perfil").get_attribute("href") == "https://www.instagram.com/marinacosta.demo/"
    ir(page, "conexoes")
    page.get_by_role("button", name="Desconectar", exact=True).click()
    page.get_by_text("Instagram desconectado.").wait_for()
    assert len(api(page, "GET", "/api/c/posts")[1]) > 0, "desconectar apagou o histórico"
    page.get_by_role("button", name=re.compile("^Conta:")).click()
    perfil = page.get_by_role("menuitem", name="Ver o meu perfil")
    assert perfil.count() == 0 or perfil.get_attribute("href").startswith("https://www.instagram.com/")
    for t in ["Meu plano", "Sair"]:
        page.get_by_role("menuitem", name=t, exact=True).wait_for()
    page.get_by_role("menuitem", name="Sair").click()
    page.wait_for_url("**/login")
    assert api(page, "GET", "/api/metrics")[0] == 401


@caso("S06 varredura com texto colado (um perfil)")
def varredura_colada(page):
    antes = saldo(page)
    ir(page, "varredura")
    page.get_by_role("button", name="Um perfil").click()
    assert page.get_by_role("button", name=re.compile("^Iniciar varredura")).is_disabled()
    page.locator("#sample").fill("Você acorda cansado?\nSalve este post.\n\n3 sinais de alerta.")
    page.get_by_role("button", name=re.compile("^Iniciar varredura")).click()
    page.get_by_text("Varredura pronta.", exact=True).wait_for(timeout=60000)
    assert antes - saldo(page) == 8
    textos = json.dumps(api(page, "GET", "/api/c/scripts")[1], ensure_ascii=False)
    assert "acorda cansado" not in textos.lower(), "copiou a frase de terceiro como assunto"


@caso("S07 notícias no feed real")
def noticias(page):
    ir(page, "noticias")
    page.get_by_label("Novo assunto").fill("qualidade do sono")
    page.get_by_role("button", name="Adicionar").click()
    page.get_by_role("button", name="Remover qualidade do sono").wait_for()
    page.get_by_role("button", name="Buscar agora · 1 crédito").click()
    page.get_by_role("link", name="Ler a notícia").first.wait_for(timeout=45000)
    n = api(page, "GET", "/api/c/news_items")[1]
    assert n and n[0]["title"] and n[0]["link"].startswith("https://"), n[:1]


@caso("S15 publicação automática só com conta real")
def auto(page):
    ir(page, "planejador-editorial")
    page.locator(".cal button.today").click()
    assert page.get_by_label("Publicar sozinho no Instagram neste horário").is_disabled()
    assert api(page, "GET", "/api/cron/publish")[0] == 401


@caso("Privacidade e termos abrem sem login")
def legais(browser):
    p = browser.new_context().new_page()
    for rota, titulo in [("privacidade", "Privacidade"), ("termos", "Termos de uso")]:
        assert p.goto(f"{BASE}/{rota}").status == 200
        p.get_by_role("heading", name=titulo, level=1).wait_for()
    assert p.request.get(f"{BASE}/icon.svg").status == 200


@caso("Excluir conta: senha errada recusa, senha certa apaga")
def excluir(browser):
    p = browser.new_context().new_page()
    vigiar(p)
    assert api(p, "POST", "/api/auth/login", {"email": "dono@exemplo.test", "password": "senha-de-teste-123"})[0] == 200
    api(p, "POST", "/api/c/ideas", {"text": "some com a conta"})
    ir(p, "meu-plano")
    p.get_by_label("Sua senha para excluir").fill("errada-errada")
    p.get_by_role("button", name="Excluir a conta").click()
    p.get_by_text("Senha incorreta").wait_for()
    p.get_by_label("Sua senha para excluir").fill("senha-de-teste-123")
    p.get_by_role("button", name="Excluir a conta").click()
    p.wait_for_url("**/login", timeout=30000)
    assert api(p, "POST", "/api/auth/login", {"email": "dono@exemplo.test", "password": "senha-de-teste-123"})[0] == 401


@caso("SEG-1 primeiro dono não vê a demonstração; segundo cadastro é recusado")
def isolamento(browser, demo):
    alheio = api(demo, "GET", "/api/c/scripts")[1][0]["id"]
    dono = browser.new_context().new_page()
    vigiar(dono)
    s, _ = api(dono, "POST", "/api/auth/signup", {"name": "Dono", "email": "dono@exemplo.test", "password": "senha-de-teste-123"})
    assert s == 200, f"primeiro cadastro {s}"
    for c in ["scripts", "posts", "persona", "ig_connection", "videos"]:
        assert api(dono, "GET", f"/api/c/{c}")[1] == [], f"dono vê {c} de outra conta"
    assert api(dono, "PATCH", f"/api/c/scripts?id={alheio}", {"title": "x"})[0] == 404
    assert api(dono, "DELETE", f"/api/c/scripts?id={alheio}")[0] == 404
    assert dono.request.get(f"{BASE}/api/pdf/script/{alheio}").status == 404
    st, _ = api(dono, "POST", "/api/c/scripts", {"id": alheio, "title": "invasão"})
    assert all(x["title"] != "invasão" for x in api(demo, "GET", "/api/c/scripts")[1]), "sobrescreveu a outra conta"
    outro = browser.new_context().new_page()
    s, j = api(outro, "POST", "/api/auth/signup", {"name": "B", "email": "b@exemplo.test", "password": "senha-de-teste-123"})
    assert s == 400 and "fechado" in j["error"], f"segundo cadastro {s}"
    for rota in ROTAS:
        r = dono.goto(f"{BASE}/{rota}", wait_until="networkidle")
        assert r.status == 200, f"conta vazia: {rota} {r.status}"


@caso("SEG-3 senha errada em série bloqueia")
def forca_bruta(browser):
    p = browser.new_context().new_page()
    for _ in range(5):
        api(p, "POST", "/api/auth/login", {"email": "alvo@exemplo.test", "password": "errada"})
    s, j = api(p, "POST", "/api/auth/login", {"email": "alvo@exemplo.test", "password": "errada"})
    assert s == 401 and "Muitas tentativas" in j["error"], j


with sync_playwright() as pw:
    nav = pw.chromium.launch()
    ctx = nav.new_context(viewport={"width": 1440, "height": 900}, accept_downloads=True, locale="pt-BR")
    ctx.set_default_timeout(30000)
    pagina = ctx.new_page()
    vigiar(pagina)
    sem_sessao(pagina)
    problemas.clear()  # os 401 acima são esperados
    for f in [entrar, periodo, top12, ajuda, anuncios, conectar, configurar, varredura, sem_tipo, roteiro, carrossel, capa, isca,
              simultaneo, sem_saldo, plano]:
        f(pagina)
    for _ in range(3):  # créditos para os casos seguintes
        api(pagina, "POST", "/api/credits", {})
    for f in [serie, circulo, planejar, video, telas, movel]:
        f(pagina)
    for _ in range(2):
        api(pagina, "POST", "/api/credits", {})
    for f in [acoes_roteiro, arrastar, catalogo, isca_colada, varredura_colada, noticias, auto]:
        f(pagina)
    isolamento(nav, pagina)
    legais(nav)
    excluir(nav)
    sair(pagina)
    forca_bruta(nav)
    nav.close()

falhas = [r for r in resultados if r[1] != "passou"]
# 400, 401, 402 e 404 provocados de propósito aparecem no console do navegador
reais = [p for p in problemas if not re.search(r"status of 40[0-4]", p)]
print(f"\n{len(resultados) - len(falhas)} passaram, {len(falhas)} falharam, {len(reais)} erros de console ou 5xx")
for p in sorted(set(reais))[:30]:
    print("  ", p)
sys.exit(1 if falhas or reais else 0)
