# Continuidade do projeto — Gladiadores Arena

Este arquivo existe para **sessões futuras de desenvolvimento** (humanas ou assistentes) retomarem o trabalho com contexto rápido: stack, estrutura, o que já existe e o que falta.

---

## Regra obrigatória de documentação

**Toda mudança relevante no projeto** (gameplay, economia, UI, persistência, mapa, personagens, artefatos, build, testes, dependências, fases do jogo ou estrutura de pastas) deve ser registrada em **dois lugares**:

1. **[GDD.md](./GDD.md)** — atualizar visão de design, regras e conteúdo visível ao jogador / designer.  
2. **[PROJECT_CONTINUITY.md](./PROJECT_CONTINUITY.md)** (este arquivo) — atualizar mapa técnico, arquivos tocados, decisões de implementação e backlog.

Mudanças puramente cosméticas de código sem impacto em comportamento podem omitir o GDD, mas **devem** constar aqui se alterarem arquivos principais ou convenções. Em dúvida, **atualize ambos**.

---

## Stack e comandos

| Item | Valor |
|------|--------|
| Runtime | TypeScript, ES modules |
| Build | Vite 6 |
| 3D | Three.js ~0.170 |
| Testes | Vitest |
| UI | HTML/CSS overlay + `src/main.ts` (sem React) |

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # tsc --noEmit && vite build
npm test         # vitest run
```

---

## Estrutura de pastas (código próprio)

```
gladiadoresArena/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── docs/
│   ├── GDD.md
│   └── PROJECT_CONTINUITY.md
├── src/
│   ├── main.ts              # fluxo de telas, HUD combate, input clique
│   ├── style.css
│   ├── game/
│   │   ├── types.ts
│   │   ├── hex.ts
│   │   ├── grid.ts          # arena hex, biomas, canCrossBiome
│   │   ├── pathfinding.ts   # A*, reachableHexes
│   │   ├── combatMath.ts
│   │   ├── colorSynergy.ts
│   │   ├── unitFactory.ts   # createHeroUnit, createEnemyUnit, xpCurve
│   │   ├── gameModel.ts     # GameModel — coração da simulação
│   │   ├── metaStore.ts     # localStorage meta
│   │   └── data/
│   │       ├── heroes.ts
│   │       ├── enemies.ts
│   │       ├── artifacts.ts
│   │       ├── shops.ts     # GOLD_SHOP, goldDrainPerTurn
│   │       └── biomes.ts
│   └── render/
│       └── GameRenderer.ts  # Three.js, coliseu, hex, unidades, VFX rosas
└── tests/
    └── combat.test.ts
```

**Observação:** o plano original citava `src/ui/`; na prática a UI está concentrada em `main.ts`.

---

## Componente central: `GameModel` (`gameModel.ts`)

- Estado: `phase` (`GamePhase`), `units`, `grid`, `wave`, `partyOrder`, `currentHeroIndex`, `movementLeft`, `basicLeft`, `meta`, `runColors`, pendentes de artefato/ultimate, duelo, log.  
- **subscribe / emit** para redesenhar UI.  
- Fluxos principais: `startNewRun`, `startWave`, `beginHeroTurn`, `endHeroTurn`, `runEnemyPhase`, loja ouro, picks de artefato/ultimate, vitória/derrota, cristais.  

Arquivos mais acoplados ao combate: `combatMath.ts`, `pathfinding.ts`, `grid.ts`, `unitFactory.ts`, `data/*`.

---

## Renderização: `GameRenderer.ts`

- Câmera ortográfica, cena isométrica aproximada.  
- Hexs por bioma (cores), highlights de alcance, unidades como cápsulas coloridas.  
- Coliseu: instâncias simples + anel; trono com figura; partículas “rosas” + beep Web Audio em `burstRoses()`.  
- Picking: raio em hex e em mesh de unidade.

---

## Persistência

- Chave `localStorage`: `gladiadores-arena-meta-v1` (`metaStore.ts`).  
- Campos: cristais, níveis 0–5 dos trilhos permanentes, `initialCards`.

---

## Testes automatizados

- `tests/combat.test.ts`: mitigação, crítico, biomas (mov/alcance/defesa), `goldDrainPerTurn`, pathfinding (floresta→hub, voo entre biomas).  
- Path “obrigatório pelo hub” entre dois biomas não está mais assertado diretamente (ajuste histórico do teste).

---

## Backlog técnico / divergências conhecidas

- **Level-up no meio do turno:** design pede recarregar `movementLeft` + `basicLeft` após pick de artefato/ultimate; hoje `pickArtifact` / `pickUltimate` só setam `phase = "combat"` — **não** chamam `beginHeroTurn` nem ajustam os contadores (corrigir em `gameModel.ts` se alinhar ao GDD).  
- Preview 3D na seleção de herói.  
- GLTF e animações.  
- Auto–fim de turno sem ações.  
- Effect system para artefatos.  
- Inimigos voadores.  
- UI: custo da loja com Estrategista já reflete metade no **código** de compra; lista na UI pode ainda mostrar preço cheio (verificar `main.ts` + `buyGoldItem`).  
- Chunk JS grande no build (Three); opcional code-splitting.

---

## Como dar continuidade (checklist rápido)

1. Ler **este arquivo** e a secção correspondente no **GDD**.  
2. Rodar `npm test` e `npm run build`.  
3. Implementar com mudanças mínimas e focadas.  
4. Atualizar **GDD.md** e **PROJECT_CONTINUITY.md** (regra obrigatória acima).  
5. Registrar data na tabela de histórico abaixo.

---

## Histórico técnico (changelog resumido)

| Data | Alterações |
|------|------------|
| 2026-03-29 | **Bunker balance + loja:** `bunker.ts` — tier 0 mais frágil (140 PV / 5 def), tiers 1–2 mais fortes; dano recebido usa **defesa do bunker** (não do herói) + `BUNKER_DAMAGE_TAKEN_MULT` 1.1. Loja: preview 3D (`BunkerPreview3D` + `bunkerMesh.ts`), skills Minas/Tiro com próximo nível e tooltip; Tiro bloqueado até nv. 3; tooltip vermelho “Necessário bunker nv 3”; hover em Evoluir mostra stats pós-evolução. `GameRenderer.setBunker` usa mesh partilhado. |
| 2026-03-29 | **Bunker visual:** com herói ocupante, `GameRenderer.syncUnits` esconde corpo 3D, barras e escudo da unidade; permanece apenas o mesh do bunker. Proxy de raycast transparente mantém clique no herói. Aura de duelo oculta se o herói estiver no bunker. `main.ts` passa `bunker.occupantId` em combate. |
| 2026-03-28 | Criação de `docs/GDD.md` e `docs/PROJECT_CONTINUITY.md`; regra de dupla atualização; backlog level-up mov/básico. |
| 2026-03-28 | **Correção crítica:** `startNewRun` preenchia `partyOrder` via `getParty()`, que dependia de `partyOrder` vazio — loja e combate quebravam. Agora `partyOrder = units.filter(isPlayer).map(id)`. CSS: `z-index` canvas/UI para overlay acima do WebGL; textos de dica na loja inicial e no HUD. |
| 2026-03-28 | **Inimigos invisíveis:** frustum ortográfico (18) cortava bordas do mapa hex raio 8; ampliado para 36 em `GameRenderer`. Inimigos: cor alaranjada/vermelha + emissive + cápsula maior; spawn preferencial a 2–14 hex do herói mais próximo. Log da wave com contagem de inimigos. |
| 2026-03-28 | **UX combate:** inimigos como **cilindros vermelhos**; overlays **azul** (movimento ao clicar no herói) e **vermelho** (alcance ao escolher básico/skill); barra inferior com passiva + ações (`title` = tooltip); removido “modo ataque”. `GameModel`: `getBasicAttackRangeHexKeys`, `getSkillRangeHexKeys`, `hexInSkillRange`, `canSkillTargetEnemy`. `GameRenderer`: `setMovementOverlay` / `setAttackOverlay` / `clearCombatOverlays`. |

---

*Para design jogável detalhado, ver [GDD.md](./GDD.md).*
