# Configuração de Deploy Automático

Este projeto está configurado para fazer deploy automático via GitHub Actions quando você fizer push nas branches `master` ou `staging`.

## Como Funciona

- **Push na branch `master`** → Deploy automático em **Produção**
- **Push na branch `staging`** → Deploy automático em **Staging**

## Configuração Necessária no GitHub

### 1. Adicionar Secrets no Repositório

Acesse: `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

Adicione os seguintes secrets:

#### PRODUCTION_HOST
- **Nome:** `PRODUCTION_HOST`
- **Valor:** IP público da sua instância AWS de produção
- **Exemplo:** `3.22.171.5`

#### STAGING_HOST
- **Nome:** `STAGING_HOST`
- **Valor:** IP público da sua instância AWS de staging
- **Exemplo:** `3.15.174.116`
- **Observação:** Se você usar a mesma instância para staging e produção, use o mesmo IP

#### SSH_USERNAME
- **Nome:** `SSH_USERNAME`
- **Valor:** `ubuntu` (ou o usuário que você usa para SSH na EC2)

#### SSH_PRIVATE_KEY
- **Nome:** `SSH_PRIVATE_KEY`
- **Valor:** Conteúdo completo da sua chave privada SSH (.pem)

**Como obter a chave privada:**
```bash
# No Windows, abra o arquivo .pem no Notepad e copie TODO o conteúdo
# Ou use:
cat caminho/para/sua-chave.pem
```

O conteúdo deve ser algo como:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
...
-----END RSA PRIVATE KEY-----
```

### 2. Preparar o Servidor AWS

Na sua instância EC2, certifique-se de que:

```bash
# 1. O repositório está clonado em ~/projeto-devops
cd ~
git clone https://github.com/SEU-USUARIO/projeto-devops.git
cd projeto-devops

# 2. O arquivo .env existe e está configurado
cp .env.example .env
nano .env  # Configure com os valores corretos

# 3. Docker e Docker Compose estão instalados
docker --version
docker-compose --version

# 4. O usuário ubuntu pode usar Docker sem sudo
sudo usermod -aG docker ubuntu
# IMPORTANTE: Faça logout e login novamente após este comando
```

### 3. Criar a Branch Staging (se ainda não existir)

```bash
# No seu computador local
git checkout -b staging
git push -u origin staging
```

## Fluxo de Trabalho

### Deploy em Staging
```bash
# Trabalhe na branch staging
git checkout staging

# Faça suas alterações
git add .
git commit -m "feat: nova funcionalidade"

# Push automático irá fazer deploy
git push origin staging
```

### Deploy em Produção
```bash
# Após testar em staging, faça merge para master
git checkout master
git merge staging

# Push automático irá fazer deploy em produção
git push origin master
```

## Monitorar o Deploy

1. Vá até a aba **Actions** no GitHub
2. Você verá os workflows rodando em tempo real
3. Clique no workflow para ver os detalhes e logs

## O Que o Deploy Automático Faz

1. ✅ Conecta via SSH na instância EC2
2. ✅ Faz `git pull` da branch correspondente
3. ✅ Para os containers antigos
4. ✅ Rebuilda as imagens Docker sem cache
5. ✅ Sobe os novos containers
6. ✅ Mostra os logs do backend
7. ✅ Remove imagens antigas não utilizadas

## Troubleshooting

### Deploy falha com erro de autenticação SSH
- Verifique se o secret `SSH_PRIVATE_KEY` está correto
- Certifique-se de que a chave privada corresponde à chave pública na AWS

### Deploy falha ao executar docker-compose
- Verifique se o Docker está instalado na EC2
- Verifique se o usuário está no grupo docker: `groups ubuntu`

### Containers não sobem após deploy
- Verifique o arquivo `.env` no servidor
- Veja os logs: `docker logs backend-devops`
- Verifique conectividade com MongoDB

### Como fazer rollback
```bash
# SSH na instância
ssh -i sua-chave.pem ubuntu@IP_DA_INSTANCIA

# Voltar para commit anterior
cd ~/projeto-devops
git log --oneline  # Veja o hash do commit anterior
git reset --hard HASH_DO_COMMIT

# Rebuildar
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Segurança

- ⚠️ **NUNCA** commite o arquivo `.env` com credenciais reais
- ⚠️ **NUNCA** commite arquivos `.pem` (chaves SSH)
- ✅ Mantenha os secrets do GitHub atualizados
- ✅ Use chaves SSH diferentes para staging e produção (recomendado)
