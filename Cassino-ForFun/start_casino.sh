#!/bin/bash

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎰 Iniciando Kani Casino Automatizado...${NC}"

# 1. Limpar processos antigos
echo -e "${YELLOW}🧹 Limpando portas e processos antigos (FORÇADO)...${NC}"
fuser -k -9 5000/tcp > /dev/null 2>&1
fuser -k -9 4173/tcp > /dev/null 2>&1

# Mata todos os processos de tunelamento conhecidos de forma forçada
pkill -9 -f ngrok > /dev/null 2>&1
pkill -9 -f cloudflared > /dev/null 2>&1
pkill -9 -f localtunnel > /dev/null 2>&1

# Cooldown para o servidor do ngrok liberar o domínio (evita ERR_NGROK_334)
echo -e "${YELLOW}⏳ Aguardando 10s para o servidor do Ngrok liberar o domínio...${NC}"
sleep 10

# 2. Iniciar Back-end
echo -e "${YELLOW}🚀 Iniciando Back-end...${NC}"
npm run init-server > backend.log 2>&1 &

# 3. Iniciar Ngrok
echo -e "${YELLOW}🌐 Abrindo Túnel do Back-end (Ngrok)...${NC}"
ngrok http 5000 > ngrok.log 2>&1 &
echo -e "${GREEN}✅ Ngrok iniciado em background. Verifique o link em 'ngrok.log'.${NC}"

# 4. Iniciar Front-end Preview
echo -e "${YELLOW}💻 Iniciando Front-end Preview...${NC}"
npm run preview -- --host > preview.log 2>&1 &
echo -e "${GREEN}✅ Frontend iniciado em background.${NC}"

# 5. Iniciar Túnel Cloudflare
echo -e "${YELLOW}☁️ Abrindo Túnel do Front-end (Cloudflare)...${NC}"
# Espera o frontend subir
sleep 5
cloudflared tunnel --url http://localhost:4173 > cf.log 2>&1 &

# Aguarda o Cloudflare gerar a URL
echo -e "⏳ Aguardando Cloudflare gerar link..."
CF_URL=""
for i in {1..20}; do
    # Tenta capturar a URL de forma ultra-específica
    # Busca a linha com o domínio e extrai apenas a URL
    CANDIDATE=$(grep "trycloudflare.com" cf.log | grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' | head -n 1)

    if [ -n "$CANDIDATE" ] && [[ "$CANDIDATE" == https://* ]]; then
        CF_URL="$CANDIDATE"
        echo -e "${GREEN}✅ Link do Cloudflare capturado!${NC}"
        break
    fi

    # Verifica se o processo ainda está rodando
    if ! pgrep -f "cloudflared" > /dev/null; then
        echo -e "${RED}❌ Erro: O processo do Cloudflared caiu.${NC}"
        tail -n 5 cf.log
        break
    fi

    echo -n "."
    sleep 2
done
echo -e "\n"

if [ -z "$CF_URL" ]; then
    echo -e "${RED}⚠️  Aviso: Não foi possível capturar a URL do Cloudflare automaticamente.${NC}"
    echo -e "${YELLOW}💡 Rode 'cat cf.log | grep trycloudflare.com' para copiar o link.${NC}"
fi

echo -e "\n${BLUE}====================================================${NC}"
echo -e "${GREEN}🎉 PROCESSOS INICIADOS!${NC}"
echo -e "${BLUE}Link do Site:${NC} ${YELLOW}$CF_URL${NC}"
echo -e "${BLUE}API:${NC} Verifique o link no Ngrok ou em 'ngrok.log'"
echo -e "${BLUE}====================================================${NC}"
echo -e "⚠️  ${YELLOW}IMPORTANTE:${NC} Se você mudou o link do Ngrok, lembre-se de atualizar o .env e rodar 'npm run build'."
echo -e "⚠️  ${YELLOW}NÃO FECHE ESTE TERMINAL!${NC} (Os processos estão rodando em background)"
echo -e "Para desligar tudo, use: ${BLUE}pkill -f 'node|ngrok|cloudflared'${NC}"
echo -e "\n${YELLOW}Pressione [ENTER] para fechar esta janela...${NC}"
read -r
