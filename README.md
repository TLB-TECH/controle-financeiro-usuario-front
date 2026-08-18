# Controle Financeiro — Front-end

Front-end em Angular do sistema Controle Financeiro (TLB TECH). Consome o `api-gateway`, que roteia as
requisições para os microsserviços do back-end (`ms-usuarios`, `ms-lancamentos`, `ms-centro-custo`,
`ms-fluxo-caixa`, `ms-contas`, `ms-orcamento`).

## Stack

- Angular 20 (standalone components, lazy loading por rota)
- Angular Material + Angular CDK
- Chart.js / ng2-charts para os gráficos do dashboard
- RxJS

## Funcionalidades

- **Autenticação**: login, cadastro, recuperação e redefinição de senha (`AuthService`, `authGuard`,
  `auth.interceptor`)
- **Dashboard**: visão geral com gráficos
- **Lançamentos**: lançamentos financeiros, incluindo cartão de crédito e parcelamento
- **Contas**: cadastro de contas, extrato e transferência entre contas
- **Cartões de crédito**: gestão de cartões e orçamento por cartão
- **Centro de custo**: cadastro e vínculo com lançamentos
- **Orçamentos e metas**: orçamentos gerais, por cartão, e metas de aplicação
- **Tipos de conta**: cadastro de tipos de conta
- **Assinatura**: tela de assinatura integrada ao Mercado Pago (`assinatura.interceptor`,
  `AssinaturaService`)
- **Perfil**: dados e foto do usuário

## Configuração de ambiente

As URLs dos serviços ficam em `src/environments/environment.ts` (dev) e `environment.prod.ts` (prod):

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',  // api-gateway
  bffUrl: 'http://localhost:8085',  // bff-financeiro
};
```

Ajuste esses valores conforme o ambiente onde o back-end estiver rodando.

## Rodando o projeto

Instalar dependências:

```bash
npm install
```

Subir o servidor de desenvolvimento:

```bash
npm start
```

A aplicação fica disponível em `http://localhost:4200/` e recarrega automaticamente a cada alteração
nos arquivos-fonte. É necessário o `api-gateway` (e os microsserviços por trás dele) rodando para a
aplicação funcionar de fato — sem back-end, as telas carregam mas as chamadas à API falham.

## Build

```bash
npm run build
```

Gera os artefatos de produção em `dist/`.

## Testes

```bash
npm test
```

Executa os testes unitários com Karma/Jasmine.

## Estrutura

```
src/app/
├── components/     # componentes compartilhados (sidebar, footer)
├── guards/         # authGuard
├── interceptors/    # auth.interceptor, assinatura.interceptor
├── pages/          # uma pasta por tela (login, dashboard, lancamentos, contas, cartoes, ...)
├── services/        # um service HTTP por domínio (auth, conta, lancamento, cartao-credito, ...)
└── shared/          # utilitários compartilhados (ex.: adapter de datas em pt-BR)
```

## Repositórios relacionados

Este front-end faz parte do sistema **TLB TECH Controle Financeiro**, composto por múltiplos
repositórios de microsserviços em Java/Spring Boot (`api-gateway`, `bff-financeiro`, `ms-usuarios`,
`ms-lancamentos`, `ms-centro-custo`, `ms-fluxo-caixa`, `ms-contas`, `ms-orcamento`,
`ms-notificacao`) sob a organização `TLB-TECH` no GitHub.
