# GDD — Gladiadores Arena

Documento de design do jogo: visão, sistemas, economia e conteúdo. Reflete o **design alvo** e o que está **implementado** no código até o momento da última atualização deste arquivo.

> **Manutenção:** qualquer mudança relevante de design, regras, conteúdo ou comportamento jogável deve ser refletida aqui **e** em [`PROJECT_CONTINUITY.md`](./PROJECT_CONTINUITY.md).

---

## 1. Visão geral

| Item | Descrição |
|------|-----------|
| **Gênero** | Tático por turnos, arena hexagonal, progressão por run e meta entre runs |
| **Perspectiva** | 3D isométrico (câmera ortográfica + Three.js) |
| **Plataforma** | Web (navegador), single-player |
| **Objetivo da run** | Sobreviver a **20 waves** de inimigos; a **wave 20** é o boss final |
| **Elites** | Waves **5, 10 e 15** com inimigos mais fortes (arquétipo elite) |

O cenário narrativo/visual é um **coliseu** com plateia, trono e imperador; ao vencer uma wave, efeito de **rosas** e feedback sonoro leve.

---

## 2. Pilares de gameplay

1. **Posicionamento no hex** — movimento limitado por turno, biomas alteram regras.
2. **Economia de ouro sob pressão** — ouro cai a cada ciclo completo de turnos dos heróis; compras entre waves.
3. **Build por run** — loja de ouro + **artefatos** escolhidos ao subir de nível (não compráveis na loja de ouro).
4. **Meta longo prazo** — **cristais** dropados na run e na vitória final; loja permanente entre runs.

---

## 3. Fluxo do jogador (telas)

1. **Menu principal:** Novo jogo · Loja de cristais · Sair  
2. **Novo jogo:** escolher **1 a 3** heróis (ordem importa para bioma/cor)  
3. **Bioma inicial** por herói (spawn no setor correspondente)  
4. **Cores** (azul / verde / vermelho) por herói — sinergia exibida em texto  
5. **Loja de ouro inicial** — cada herói compra em sequência; depois **wave 1**  
6. **Combate** — turnos dos heróis → dreno de ouro do ciclo → turnos dos inimigos  
7. **Entre waves** — teleporte ao hub, loja de ouro, próxima wave  
8. **Level-up** — modal: 1 de 3 artefatos  
9. **Nível 12** — modal: 1 de 2 ultimates da classe  
10. **Vitória / derrota** — cristais persistidos; retorno ao menu  

**Implementado:** fluxo acima em `src/main.ts` + `GameModel`. **Não implementado como no GDD original:** preview 3D dedicado na seleção de personagem (usa cards + mesmo canvas da arena).

**Inimigos na arena:** modelos de cápsula ligeiramente maiores que heróis, cores **alaranjadas/vermelhas** (grunt), vermelho escuro (elite), roxo (boss), com emissivo leve para destacar do terreno. Spawn tende a ficar entre **2 e 14 hexes** de distância de um herói para permanecer na mesma área visível. Câmera ortográfica cobre o mapa inteiro (raio ~8).

---

## 4. Mapa e biomas

- Grade **hexagonal axial**; **hub** central (castelo/loja) cercado por **6 biomas** em setores.  
- **Regra de travessia:** personagens a pé **não** passam direto de um bioma de combate a outro; precisam transitar pelo **hub**. **Voadores** ignoram essa restrição no pathfinding.  
- **Efeitos por bioma (implementados):**

| Bioma | Efeito |
|-------|--------|
| **Vulcânico** | 3 de dano no fim da **rodada** (após turnos dos inimigos) para unidades no chão (não voo), sem Ruler |
| **Pântano** | Movimento efetivo ×50% (mín. 1) |
| **Floresta** | +1 alcance |
| **Montanhoso** | +50% defesa efetiva no cálculo de dano |
| **Rochoso** | Quem **ataca** de rochoso: críticos ganham +100% multiplicador de dano crítico adicional |
| **Deserto** | Sem regeneração de mana no fim do turno (salvo ignorar terreno) |
| **Hub** | Zona neutra de loja; usada na travessia |

---

## 5. Atributos e combate

Atributos principais na unidade: vida, mana, movimento, dano, defesa, acerto crítico (%), dano crítico (multiplicador), penetração, regen vida/mana, alcance, lifesteal (%), potencial cura/escudo (%).

- **Mitigação:** dano após `defesa` e `penetração` do **atacante**; se resultado ≤ 0, dano mínimo **1**.  
- **Penetração ≤ 0:** aumenta dano recebido (regra especial no `combatMath`).  
- **Crítico:** rolagem vs acerto crítico (+ bônus Ronin); multiplicador de dano crítico; rochoso pode amplificar.  
- **Ronin (overflow):** acerto crítico total acima de 100% converte em **+2% dano por 1%** excedente (aplicado ao valor já mitigado, antes do multiplicador de crítico).  
- **Escudo** (`shieldGGBlue`): absorve dano antes da vida; combo verde+verde+azul adiciona escudo por turno; Fada da cura aplica escudo no início da wave.  
- **IA inimiga:** move em direção ao alvo (pathfinding); prioriza menor HP, depois menor defesa; **não ataca** alvo **voador** se o inimigo não voa.

---

## 6. Personagens

### 6.1 Pistoleiro (base)

- Vida 100, dano 10, defesa 2, mov 6, alcance 6, regen vida 1, mana 0  
- **Ataque básico:** 100% dano  
- **Atirar pra todo lado:** 50% dano em todos no alcance; CD em turnos de herói  
- **Passiva:** +2 dano (wave) cada vez que causa dano  
- **Ultimates (nível 12):** Arauto do Caos (básico em área) · Especialista da destruição (700% dano em um alvo)

### 6.2 Gladiador (base)

- Vida 200, dano 6, defesa 4, mov 4, alcance 1, sem regen base  
- **Até a morte:** duelo até morte; gladiador golpeia a 120%  
- **Passiva:** após vencer duelo, +5 vida máx. e +5 vida atual  
- **Ultimates:** Campeão (escala com kills) · Estrategista nato (loja −50%, drop cristal, dano escala com ouro)

### 6.3 Sacerdotisa (base)

- Vida 200, dano 4, defesa 1, mov 4, alcance 3, regen vida 2, mana inicial configurada no template  
- **Sentença:** gasta mana para ativar; a cada fim de turno do herói, se ativa e houver mana, −1 mana e aplica 25% dano em todos inimigos e cura 50% dano em aliados  
- **Passiva:** −2 na redução de “gold drain” base (stacka com loja)  
- **Ultimates:** Fada da cura (voo, escudo allies, potencial cura) · Rainha do desespero (dano em área no fim do turno, cura pelo dano causado, +ouro por kill)

---

## 7. Cores e sinergia

Por herói: azul, verde ou vermelho. Com **3 heróis**, combinações específicas (AAA, AAV, …) **substituem** a soma simples das três cores individuais. Com 1–2 heróis, aplicam-se os bônus **por cor** somados.

Implementação: `src/game/colorSynergy.ts` — afeta stats na criação da unidade; escudo por turno (VVA) aplicado no fim do turno do jogador.

---

## 8. Progressão (run)

- **XP** por eliminação; curva em `unitFactory.xpCurve`  
- **Nível máximo 12** — ao subir (exceto 12): escolha de **1 entre 3** artefatos do pool  
- **Nível 12:** escolha de **1 entre 2** ultimates; flag “forma final” (visual pode ser expandido)  
- **Skills:** CD por turno de herói; **resetadas entre waves** (loja) no início da wave  
- **Morte na wave:** se o time **vencer** a wave, herói morto retorna com **50% vida máx.** na próxima wave  

**Plano de design original:** ao subir de nível **no meio do turno**, recarregar movimento e ataques básicos (sem resetar CD de skills). **Estado atual do código:** após escolher artefato/ultimate, a fase volta a `combat` **sem** chamar `beginHeroTurn` de novo — ou seja, **movimento e usos de básico não são recarregados** nesse momento (lacuna conhecida).

---

## 9. Artefatos (pool)

IDs e efeitos resumidos (stacks onde aplicável): trevo, tônico, motor da morte, mãos venenosas, ronin, imortal, duro como pedra, ruler, braço forte, curandeiro de batalha, sylfid, escudo de sangue.  
Detalhes e textos: `src/game/data/artifacts.ts`.

**Nota de design:** alguns efeitos têm versões simplificadas no código (ex.: duro como pedra e dano exatamente 1).

---

## 10. Waves e inimigos

- Contagem e escalonamento: `src/game/data/enemies.ts` (`waveMultiplier`, `partyScaleMultiplier`, `countEnemiesForWave`)  
- **Grunt** na maioria das waves; **elite** nas 5/10/15; **boss** na 20  
- Drops de cristal com chance base + meta + ultimate Estrategista (multiplicador de chance, limitado)

---

## 11. Economia

### 11.1 Ouro (run)

- Início por herói: **100** × (1 + bônus % da meta `permGold`), ver `unitFactory`  
- **Por ciclo** (todos os heróis jogaram): cada herói vivo perde valor derivado de `5 − reduções` com **mínimo 1** (`goldDrainPerTurn` + `goldDrainReduction`)  
- **Loja de ouro** (preços fixos): ver `GOLD_SHOP` em `src/game/data/shops.ts` (dano, vida, movimento, críticos, regens, defesa, potencial cura/escudo, ataque básico extra via braco_forte, XP%, redução ouro/turno com teto de redução)  
- **Estrategista nato:** preços da loja pela metade (arredondados para cima)

**Frase antiga do design (“wave começa com 100 ouro”):** não implementada como reserva separada da wave; economia é por herói + dreno por ciclo.

### 11.2 Cristais (meta)

- Persistência: `localStorage` via `metaStore.ts`  
- Ganhos na run acumulados; vitória na wave 20 adiciona bônus; derrota salva o acumulado  
- **Loja de cristais:** trilhos de % (dano, vida, defesa, cura/escudo, XP, ouro inicial, drop) com custos 1/2/4/6/9; **cartas iniciais** (+Trevo) custos 2/5/9  

---

## 12. Controles de combate (UI)

- **Clique no herói ativo** (cápsula colorida): hexes **azuis** = movimento possível com o movimento restante; clique num hex azul para andar.  
- **Barra inferior:** passiva (texto resumido; passar o mouse para descrição completa no tooltip nativo) + **Ataque básico** + skills (cada botão com tooltip).  
- **Ataque básico** ou **skill** selecionados: hexes **vermelhos** = alcance da ação; **inimigos** são cilindros **vermelhos** — clique no inimigo dentro do alcance (ou num hex vermelho, p.ex. “Atirar pra todo lado”) para executar.  
- **Cancelar seleção** limpa azul/vermelho e volta ao estado neutro.  
- Sem botão separado de “modo ataque”.  

---

## 13. Conteúdo futuro / lacunas de design vs. implementação

- Preview 3D do herói na seleção  
- Modelos GLTF por classe; “forma final” visual distinta  
- Inimigos voadores para contrapor Fada da cura  
- Auto encerrar turno quando não houver ações possíveis  
- Sistema de efeitos data-driven (EffectResolver) para reduzir `if` espalhados  
- Ajuste fino de números e tooltips no HUD  

---

## 14. Histórico de revisões do GDD

| Data | Notas |
|------|--------|
| 2026-03-28 | Criação do GDD + alinhamento com código; nota sobre level-up sem recarga de mov/básico |
| 2026-03-28 | Correção de bug: ordem do grupo (`partyOrder`) na criação da run; UI da loja e combate dependem disso. Dicas visuais na loja inicial e no combate (movimento / modo ataque). |
| 2026-03-28 | Visibilidade de inimigos: câmera mais larga; cores/emissive; spawn próximo ao grupo. |

---

*Última sincronização com o código: ver também [PROJECT_CONTINUITY.md](./PROJECT_CONTINUITY.md).*
