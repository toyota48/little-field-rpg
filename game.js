(() => {
  "use strict";

  const TILE_SIZE = 32;
  const MAP_COLS = 16;
  const MAP_ROWS = 12;
  const SAVE_KEY = "little-field-rpg-save-v1";
  const INN_PRICE = 6;
  const HEAL_MAGIC_COST = 3;
  const FULL_SLASH_COST = 3;
  const HERB_HEAL = 18;
  const EFFECT_DURATIONS = {
    slash: 360,
    enemyAttack: 420,
    heal: 520,
    run: 320,
    defeat: 420,
  };

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  let activeEffect = null;
  let audioContext = null;

  const ui = {
    mapValue: document.getElementById("mapValue"),
    modeValue: document.getElementById("modeValue"),
    levelValue: document.getElementById("levelValue"),
    attackValue: document.getElementById("attackValue"),
    defenseValue: document.getElementById("defenseValue"),
    wisdomValue: document.getElementById("wisdomValue"),
    agilityValue: document.getElementById("agilityValue"),
    dexterityValue: document.getElementById("dexterityValue"),
    goldValue: document.getElementById("goldValue"),
    herbValue: document.getElementById("herbValue"),
    hpText: document.getElementById("hpText"),
    hpBar: document.getElementById("hpBar"),
    mpText: document.getElementById("mpText"),
    mpBar: document.getElementById("mpBar"),
    expText: document.getElementById("expText"),
    expBar: document.getElementById("expBar"),
    enemyPanel: document.getElementById("enemyPanel"),
    enemyName: document.getElementById("enemyName"),
    enemyHpText: document.getElementById("enemyHpText"),
    enemyHpBar: document.getElementById("enemyHpBar"),
    logList: document.getElementById("logList"),
    exploreCommandGrid: document.getElementById("exploreCommandGrid"),
    battleRootMenu: document.getElementById("battleRootMenu"),
    battleActionMenu: document.getElementById("battleActionMenu"),
    interactButton: document.getElementById("interactButton"),
    fightButton: document.getElementById("fightButton"),
    attackButton: document.getElementById("attackButton"),
    skillButton: document.getElementById("skillButton"),
    magicButton: document.getElementById("magicButton"),
    backButton: document.getElementById("backButton"),
    itemButton: document.getElementById("itemButton"),
    runButton: document.getElementById("runButton"),
    saveButton: document.getElementById("saveButton"),
    loadButton: document.getElementById("loadButton"),
    resetButton: document.getElementById("resetButton"),
    touchInteractButton: document.getElementById("touchInteractButton"),
    touchMoveButtons: [...document.querySelectorAll("[data-move]")],
    touchBattleStatus: document.getElementById("touchBattleStatus"),
    touchHpText: document.getElementById("touchHpText"),
    touchHpBar: document.getElementById("touchHpBar"),
    touchMpText: document.getElementById("touchMpText"),
    touchMpBar: document.getElementById("touchMpBar"),
    battleTouchMenu: document.getElementById("battleTouchMenu"),
    touchFightButton: document.getElementById("touchFightButton"),
    touchAttackButton: document.getElementById("touchAttackButton"),
    touchSkillButton: document.getElementById("touchSkillButton"),
    touchMagicButton: document.getElementById("touchMagicButton"),
    touchBackButton: document.getElementById("touchBackButton"),
    touchItemButton: document.getElementById("touchItemButton"),
    touchRunButton: document.getElementById("touchRunButton"),
  };

  const TILES = {
    ".": { name: "grass", walkable: true },
    G: { name: "wild grass", walkable: true, encounter: 0.13 },
    F: { name: "flower", walkable: true, encounter: 0.07 },
    P: { name: "path", walkable: true },
    I: { name: "inn floor", walkable: true },
    D: { name: "door", walkable: true },
    T: { name: "tree", walkable: false },
    "#": { name: "wall", walkable: false },
    C: { name: "counter", walkable: false },
    S: { name: "sign", walkable: false },
  };

  const MAPS = {
    town: {
      name: "町",
      tiles: [
        "TTTTTTTTTTTTTTTT",
        "T......PP......T",
        "T..######......T",
        "T..#IIII#..TT..T",
        "T..#IICI#......T",
        "T..##DD##..SS..T",
        "T......PP......T",
        "T......PP......T",
        "T......PP......T",
        "T......PP......T",
        "T......PP......T",
        "TTTTTTPPPPTTTTTT",
      ],
      exits: [
        {
          xMin: 6,
          xMax: 9,
          y: 11,
          to: "grassland",
          spawn: { x: 7, y: 1 },
          message: "草原に出た。",
        },
      ],
      entities: [
        {
          id: "mina",
          kind: "npc",
          name: "ミナ",
          x: 4,
          y: 7,
          body: "#516fb0",
          hair: "#5b3f2e",
          messages: [
            "ミナ「草原では急に魔物が出るから、HPに気をつけてね。」",
            "ミナ「宿屋は北西の建物よ。少しのお金で全回復できるわ。」",
            "ミナ「強くなれば、同じ草原でもずっと歩きやすくなるよ。」",
          ],
        },
        {
          id: "innkeeper",
          kind: "inn",
          name: "宿屋",
          x: 5,
          y: 4,
          body: "#b87333",
          hair: "#2e2a23",
        },
      ],
    },
    grassland: {
      name: "草原",
      tiles: [
        "TTTTTTPPPPTTTTTT",
        "TGGGGGPPGGGGGGGT",
        "TGGFFGPPGGGFGGGT",
        "TGGGGGGGGGGGGGGT",
        "TGGGTTGGGGTTGGGT",
        "TGGGGGGPPGGGGGGT",
        "TGGGFGGPPGGFGGGT",
        "TGGGGGGGGGGGGGGT",
        "TGGTTGGGGGGTTGGT",
        "TGGGGGPPGGGGGGGT",
        "TGGGGGPPGGGGGGGT",
        "TTTTTTTTTTTTTTTT",
      ],
      exits: [
        {
          xMin: 6,
          xMax: 9,
          y: 0,
          to: "town",
          spawn: { x: 7, y: 10 },
          message: "町に戻った。",
        },
      ],
      entities: [
        {
          id: "grassland-cache",
          kind: "chest",
          name: "宝箱",
          x: 13,
          y: 6,
          contents: { herb: 2, gold: 12 },
        },
      ],
    },
  };

  const ENEMIES = [
    {
      name: "スライム",
      maxHp: 18,
      attack: 34,
      defense: 16,
      wisdom: 10,
      agility: 16,
      dexterity: 18,
      exp: 6,
      gold: 4,
      color: "#58a45c",
      sprite: "slime",
    },
    {
      name: "ウルフ",
      maxHp: 24,
      attack: 44,
      defense: 22,
      wisdom: 14,
      agility: 40,
      dexterity: 34,
      exp: 10,
      gold: 7,
      color: "#6d6f7a",
      sprite: "wolf",
    },
    {
      name: "ワスプ",
      maxHp: 16,
      attack: 40,
      defense: 16,
      wisdom: 18,
      agility: 46,
      dexterity: 38,
      exp: 9,
      gold: 6,
      color: "#d1a737",
      sprite: "wasp",
    },
    {
      name: "まよいび",
      maxHp: 20,
      attack: 34,
      defense: 20,
      wisdom: 40,
      agility: 32,
      dexterity: 34,
      exp: 8,
      gold: 8,
      color: "#6a8bd6",
      sprite: "spirit",
    },
  ];

  const DIRECTIONS = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 },
  };

  const TOUCH_DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const BLOCKED_KEYS = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    " ",
  ]);

  let state = createInitialState();
  let touchMoveTimer = null;
  let touchMoveInterval = null;
  let battleCommandView = "root";

  function createInitialState() {
    return {
      mapId: "town",
      mode: "explore",
      battle: null,
      player: {
        x: 7,
        y: 10,
        level: 1,
        hp: 30,
        maxHp: 30,
        mp: 10,
        maxMp: 10,
        attack: 46,
        defense: 26,
        wisdom: 34,
        agility: 30,
        dexterity: 30,
        exp: 0,
        nextExp: 12,
        gold: 0,
        equipment: {
          attack: 0,
          defense: 0,
          wisdom: 0,
          agility: 0,
          dexterity: 0,
        },
        inventory: {
          herb: 1,
        },
      },
      npcTalkIndex: {},
      openedChests: {},
      log: ["町の南から草原へ向かえる。"],
      steps: 0,
    };
  }

  function currentMap() {
    return MAPS[state.mapId];
  }

  function validateMaps() {
    Object.entries(MAPS).forEach(([mapId, map]) => {
      if (map.tiles.length !== MAP_ROWS) {
        throw new Error(`${mapId} must have ${MAP_ROWS} rows.`);
      }

      map.tiles.forEach((row, index) => {
        if (row.length !== MAP_COLS) {
          throw new Error(`${mapId} row ${index} must have ${MAP_COLS} columns.`);
        }

        [...row].forEach((tile) => {
          if (!TILES[tile]) {
            throw new Error(`${mapId} has an unknown tile: ${tile}`);
          }
        });
      });
    });
  }

  function getTile(mapId, x, y) {
    if (x < 0 || x >= MAP_COLS || y < 0 || y >= MAP_ROWS) {
      return "T";
    }

    return MAPS[mapId].tiles[y][x];
  }

  function isWalkable(x, y) {
    const tile = getTile(state.mapId, x, y);
    const entity = getEntityAt(x, y);
    return TILES[tile].walkable && !entity;
  }

  function getEntityAt(x, y) {
    return currentMap().entities.find((entity) => entity.x === x && entity.y === y);
  }

  function getAdjacentEntity() {
    return currentMap().entities.find((entity) => {
      const distance = Math.abs(entity.x - state.player.x) + Math.abs(entity.y - state.player.y);
      return distance === 1 || distance === 0;
    });
  }

  function addLog(text) {
    state.log.unshift(text);
    state.log = state.log.slice(0, 8);
    renderHud();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function choose(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function defaultBattleStats(level) {
    const levelBonus = Math.max(0, level - 1);
    return {
      attack: 46 + levelBonus * 5,
      defense: 26 + levelBonus * 4,
      wisdom: 34 + levelBonus * 4,
      agility: 30 + levelBonus * 3,
      dexterity: 30 + levelBonus * 3,
    };
  }

  function ensureEquipment(entity = state.player) {
    if (!entity.equipment) {
      entity.equipment = {};
    }

    ["attack", "defense", "wisdom", "agility", "dexterity"].forEach((stat) => {
      entity.equipment[stat] = Number(entity.equipment[stat]) || 0;
    });

    return entity.equipment;
  }

  function effectiveStat(entity, stat) {
    const base = Number(entity[stat]) || 0;
    const equipment = entity === state.player ? ensureEquipment(entity)[stat] : 0;
    return Math.max(0, base + equipment);
  }

  function dexterityModifier(entity) {
    return clamp(1 + (effectiveStat(entity, "dexterity") - 30) / 200, 0.9, 1.1);
  }

  function equipmentModifier(entity, stat) {
    if (entity !== state.player) {
      return 1;
    }

    const equipment = ensureEquipment(entity);
    return clamp(1 + (Number(equipment[stat]) || 0) / 160, 0.9, 1.15);
  }

  function criticalRate(entity) {
    return clamp(0.025 + effectiveStat(entity, "dexterity") / 1000, 0.025, 0.07);
  }

  function calculatePhysicalDamage(attacker, defender, options = {}) {
    const attackMultiplier = options.attackMultiplier || 1;
    const attackScore = Math.floor((effectiveStat(attacker, "attack") * attackMultiplier) / 2);
    const defenseScore = Math.floor(effectiveStat(defender, "defense") / 4);
    const baseDamage = Math.max(1, attackScore - defenseScore);
    const dexterityFactor = dexterityModifier(attacker);
    const equipmentFactor = equipmentModifier(attacker, "attack");
    const variance = randomInt(94, 106) / 100;
    const isCritical = Math.random() < criticalRate(attacker);
    const criticalFactor = isCritical ? 1.8 : 1;
    const damage = Math.max(
      1,
      Math.floor(((baseDamage * dexterityFactor * equipmentFactor * variance * criticalFactor) / 4) + 1),
    );

    return { damage, isCritical };
  }

  function calculateMagicHeal(caster) {
    const wisdomScore = Math.floor(effectiveStat(caster, "wisdom") / 2);
    const levelScore = Math.floor(caster.level * 3);
    const baseHeal = Math.max(1, wisdomScore + levelScore);
    const dexterityFactor = dexterityModifier(caster);
    const equipmentFactor = equipmentModifier(caster, "wisdom");
    const variance = randomInt(96, 108) / 100;
    return Math.max(1, Math.floor(((baseHeal * dexterityFactor * equipmentFactor * variance) / 2) + 6));
  }

  function adjustedAgility(entity) {
    const agility = effectiveStat(entity, "agility");
    const dexterityFactor = dexterityModifier(entity);
    const variance = randomInt(95, 105) / 100;
    return agility * dexterityFactor * variance;
  }

  function playerActsFirst(enemy) {
    return adjustedAgility(state.player) >= adjustedAgility(enemy);
  }

  function ensureInventory(player = state.player) {
    if (!player.inventory) {
      player.inventory = {};
    }

    player.inventory.herb = Math.max(0, Number(player.inventory.herb) || 0);
    return player.inventory;
  }

  function getHerbCount() {
    return ensureInventory().herb;
  }

  function isChestOpen(chest) {
    return Boolean(state.openedChests[chest.id]);
  }

  function movePlayer(deltaX, deltaY) {
    if (state.mode !== "explore") {
      return;
    }

    const nextX = state.player.x + deltaX;
    const nextY = state.player.y + deltaY;

    if (!isWalkable(nextX, nextY)) {
      draw();
      return;
    }

    state.player.x = nextX;
    state.player.y = nextY;
    state.steps += 1;

    if (tryMapExit()) {
      render();
      return;
    }

    tryRandomEncounter();
    render();
  }

  function tryMapExit() {
    const exit = currentMap().exits.find((candidate) => {
      return (
        candidate.y === state.player.y &&
        state.player.x >= candidate.xMin &&
        state.player.x <= candidate.xMax
      );
    });

    if (!exit) {
      return false;
    }

    state.mapId = exit.to;
    state.player.x = exit.spawn.x;
    state.player.y = exit.spawn.y;
    addLog(exit.message);
    return true;
  }

  function tryRandomEncounter() {
    const tile = getTile(state.mapId, state.player.x, state.player.y);
    const encounterRate = TILES[tile].encounter || 0;

    if (encounterRate > 0 && Math.random() < encounterRate) {
      startBattle(choose(ENEMIES));
    }
  }

  function interact() {
    if (state.mode !== "explore") {
      return;
    }

    const entity = getAdjacentEntity();

    if (!entity) {
      addLog("近くには何もない。");
      render();
      return;
    }

    if (entity.kind === "npc") {
      const talkIndex = state.npcTalkIndex[entity.id] || 0;
      addLog(entity.messages[talkIndex % entity.messages.length]);
      state.npcTalkIndex[entity.id] = talkIndex + 1;
      render();
      return;
    }

    if (entity.kind === "inn") {
      stayAtInn();
      render();
      return;
    }

    if (entity.kind === "chest") {
      openChest(entity);
      render();
    }
  }

  function stayAtInn() {
    if (state.player.hp === state.player.maxHp && state.player.mp === state.player.maxMp) {
      addLog("宿屋「もう元気いっぱいですね。」");
      return;
    }

    if (state.player.gold < INN_PRICE) {
      addLog(`宿屋「一泊 ${INN_PRICE}G です。お金が足りないようです。」`);
      return;
    }

    state.player.gold -= INN_PRICE;
    state.player.hp = state.player.maxHp;
    state.player.mp = state.player.maxMp;
    addLog(`宿屋に泊まった。HPとMPが全回復した。-${INN_PRICE}G`);
  }

  function openChest(chest) {
    if (isChestOpen(chest)) {
      addLog("宝箱は空っぽだ。");
      return;
    }

    const inventory = ensureInventory();
    const herb = chest.contents.herb || 0;
    const gold = chest.contents.gold || 0;
    inventory.herb += herb;
    state.player.gold += gold;
    state.openedChests[chest.id] = true;
    playItemSound();

    const rewards = [];
    if (herb > 0) {
      rewards.push(`薬草${herb}個`);
    }
    if (gold > 0) {
      rewards.push(`${gold}G`);
    }

    addLog(`宝箱を開けた。${rewards.join(" と ")}を手に入れた。`);
  }

  function startBattle(enemyTemplate) {
    const enemy = {
      ...enemyTemplate,
      hp: enemyTemplate.maxHp,
    };

    state.mode = "battle";
    state.battle = { enemy, busy: false };
    battleCommandView = "root";
    addLog(`${enemy.name}が現れた。`);
    render();
    focusBattleView();
  }

  function openBattleActionMenu() {
    if (state.mode !== "battle" || isBattleBusy()) {
      return;
    }

    battleCommandView = "action";
    renderHud();
  }

  function openBattleRootMenu() {
    if (state.mode !== "battle" || isBattleBusy()) {
      return;
    }

    battleCommandView = "root";
    renderHud();
  }

  async function runPlayerBattleAction(action) {
    if (state.mode !== "battle" || isBattleBusy()) {
      return;
    }

    const enemy = state.battle.enemy;
    const playerFirst = playerActsFirst(enemy);
    battleCommandView = "root";
    setBattleBusy(true);

    try {
      if (!playerFirst) {
        addLog(`${enemy.name}が先に動いた。`);
        render();
        await wait(180);
        await enemyTurn();

        if (state.mode !== "battle" || !state.battle) {
          return;
        }
      }

      await action();

      if (state.mode !== "battle" || !state.battle) {
        return;
      }

      if (playerFirst) {
        await wait(220);
        await enemyTurn();
      }
    } finally {
      if (state.mode === "battle" && state.battle) {
        setBattleBusy(false);
      }
    }
  }

  async function playerAttack() {
    await runPlayerBattleAction(() => executePhysicalPlayerAction({
      label: "攻撃した",
      attackMultiplier: 1,
    }));
  }

  async function playerFullSlash() {
    if (state.mode !== "battle" || isBattleBusy()) {
      return;
    }

    if (state.player.mp < FULL_SLASH_COST) {
      addLog("MPが足りない。");
      render();
      return;
    }

    await runPlayerBattleAction(() => executePhysicalPlayerAction({
      label: "全力斬り",
      attackMultiplier: 1.5,
      mpCost: FULL_SLASH_COST,
    }));
  }

  async function executePhysicalPlayerAction({ label, attackMultiplier, mpCost = 0 }) {
    if (mpCost > 0) {
      state.player.mp = clamp(state.player.mp - mpCost, 0, state.player.maxMp);
    }

    const enemy = state.battle.enemy;
    const result = calculatePhysicalDamage(state.player, enemy, { attackMultiplier });
    playSlashSound();
    await playEffect({ type: "slash", damage: result.damage }, EFFECT_DURATIONS.slash);

    enemy.hp = clamp(enemy.hp - result.damage, 0, enemy.maxHp);
    const criticalText = result.isCritical ? "会心の一撃！" : "";
    addLog(`${label}。${criticalText}${enemy.name}に${result.damage}ダメージ。`);

    if (enemy.hp <= 0) {
      playDefeatSound();
      await playEffect({ type: "defeat" }, EFFECT_DURATIONS.defeat);
      finishBattle(enemy);
      return;
    }

    render();
  }

  async function playerHeal() {
    if (state.mode !== "battle" || isBattleBusy()) {
      return;
    }

    if (state.player.hp === state.player.maxHp) {
      addLog("HPは満タンだ。");
      render();
      return;
    }

    if (state.player.mp < HEAL_MAGIC_COST) {
      addLog("MPが足りない。");
      render();
      return;
    }

    await runPlayerBattleAction(async () => {
      const healAmount = calculateMagicHeal(state.player);
      const before = state.player.hp;
      state.player.mp = clamp(state.player.mp - HEAL_MAGIC_COST, 0, state.player.maxMp);
      state.player.hp = clamp(state.player.hp + healAmount, 0, state.player.maxHp);
      const recovered = state.player.hp - before;
      addLog(`回復の魔法を唱えた。HPが${recovered}回復。`);
      playHealSound();
      await playEffect({ type: "heal", amount: recovered }, EFFECT_DURATIONS.heal);
    });
  }

  async function playerUseHerb() {
    if (state.mode !== "battle" || isBattleBusy()) {
      return;
    }

    const inventory = ensureInventory();
    if (inventory.herb <= 0) {
      addLog("薬草を持っていない。");
      render();
      return;
    }

    if (state.player.hp === state.player.maxHp) {
      addLog("HPは満タンだ。");
      render();
      return;
    }

    await runPlayerBattleAction(async () => {
      const before = state.player.hp;
      const dexterityFactor = dexterityModifier(state.player);
      const healAmount = Math.max(1, Math.floor(HERB_HEAL * dexterityFactor));
      inventory.herb -= 1;
      state.player.hp = clamp(state.player.hp + healAmount, 0, state.player.maxHp);
      const recovered = state.player.hp - before;
      addLog(`薬草を使った。HPが${recovered}回復。`);
      playItemSound();
      await playEffect({ type: "heal", amount: recovered }, EFFECT_DURATIONS.heal);
    });
  }

  async function playerRun() {
    if (state.mode !== "battle" || isBattleBusy()) {
      return;
    }

    battleCommandView = "root";
    setBattleBusy(true);

    try {
      playRunSound();
      await playEffect({ type: "run" }, EFFECT_DURATIONS.run);

      const enemy = state.battle.enemy;
      const agilityGap = effectiveStat(state.player, "agility") - effectiveStat(enemy, "agility");
      const dexterityBonus = (dexterityModifier(state.player) - 1) * 0.4;
      const runChance = clamp(0.56 + agilityGap / 220 + dexterityBonus, 0.35, 0.76);

      if (Math.random() < runChance) {
        const enemyName = enemy.name;
        state.mode = "explore";
        state.battle = null;
        battleCommandView = "root";
        addLog(`${enemyName}から逃げ切った。`);
        render();
        return;
      }

      addLog("逃げられなかった。");
      await wait(180);
      await enemyTurn();
    } finally {
      if (state.mode === "battle" && state.battle) {
        setBattleBusy(false);
      }
    }
  }

  async function enemyTurn() {
    if (state.mode !== "battle") {
      return;
    }

    const enemy = state.battle.enemy;
    const result = calculatePhysicalDamage(enemy, state.player);
    playHitSound();
    await playEffect({ type: "enemyAttack", damage: result.damage }, EFFECT_DURATIONS.enemyAttack);

    state.player.hp = clamp(state.player.hp - result.damage, 0, state.player.maxHp);
    const criticalText = result.isCritical ? "痛恨の一撃！" : "";
    addLog(`${enemy.name}の攻撃。${criticalText}${result.damage}ダメージ。`);

    if (state.player.hp <= 0) {
      await wait(260);
      handlePlayerDefeat();
      return;
    }

    render();
  }

  function finishBattle(enemy) {
    state.mode = "explore";
    state.battle = null;
    battleCommandView = "root";
    state.player.gold += enemy.gold;
    addLog(`${enemy.name}を倒した。${enemy.exp}EXP と ${enemy.gold}G を得た。`);
    gainExp(enemy.exp);
    render();
  }

  function gainExp(amount) {
    state.player.exp += amount;
    let didLevelUp = false;

    while (state.player.exp >= state.player.nextExp) {
      state.player.exp -= state.player.nextExp;
      state.player.level += 1;
      state.player.maxHp += 8 + state.player.level;
      state.player.maxMp += 3 + Math.floor(state.player.level / 2);
      state.player.attack += 5;
      state.player.defense += 4;
      state.player.wisdom += 4;
      state.player.agility += 3;
      state.player.dexterity += 3;
      state.player.nextExp = Math.floor(state.player.nextExp * 1.45 + 6);
      state.player.hp = state.player.maxHp;
      state.player.mp = state.player.maxMp;
      didLevelUp = true;
      addLog(`レベルアップ。Lv${state.player.level}になった。`);
    }

    if (didLevelUp) {
      playLevelUpSound();
    }
  }

  function isBattleBusy() {
    return Boolean(state.battle?.busy);
  }

  function setBattleBusy(isBusy) {
    if (state.battle) {
      state.battle.busy = isBusy;
    }
    renderHud();
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function playEffect(effect, duration) {
    return new Promise((resolve) => {
      const startedAt = performance.now();

      function frame(now) {
        const progress = clamp((now - startedAt) / duration, 0, 1);
        activeEffect = { ...effect, progress };
        draw();

        if (progress < 1) {
          window.requestAnimationFrame(frame);
          return;
        }

        activeEffect = null;
        draw();
        resolve();
      }

      window.requestAnimationFrame(frame);
    });
  }

  function getAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    return audioContext;
  }

  function playTone(frequency, startOffset, duration, type, volume) {
    const audio = getAudioContext();
    if (!audio) {
      return;
    }

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const startAt = audio.currentTime + startOffset;
    const endAt = startAt + duration;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, endAt);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.03);
  }

  function playSlashSound() {
    playTone(880, 0, 0.08, "square", 0.08);
    playTone(360, 0.045, 0.11, "sawtooth", 0.05);
  }

  function playHitSound() {
    playTone(150, 0, 0.13, "square", 0.07);
    playTone(90, 0.045, 0.16, "triangle", 0.05);
  }

  function playHealSound() {
    playTone(420, 0, 0.12, "sine", 0.05);
    playTone(640, 0.09, 0.16, "sine", 0.06);
    playTone(860, 0.19, 0.18, "sine", 0.05);
  }

  function playItemSound() {
    playTone(660, 0, 0.07, "square", 0.04);
    playTone(880, 0.08, 0.08, "square", 0.045);
  }

  function playRunSound() {
    playTone(260, 0, 0.06, "triangle", 0.05);
    playTone(210, 0.08, 0.06, "triangle", 0.04);
  }

  function playDefeatSound() {
    playTone(560, 0, 0.08, "triangle", 0.06);
    playTone(280, 0.09, 0.18, "triangle", 0.06);
  }

  function playLevelUpSound() {
    playTone(523, 0, 0.12, "square", 0.05);
    playTone(659, 0.1, 0.12, "square", 0.05);
    playTone(784, 0.2, 0.14, "square", 0.06);
    playTone(1046, 0.34, 0.28, "triangle", 0.07);
    playTone(1318, 0.42, 0.2, "sine", 0.04);
  }

  function handlePlayerDefeat() {
    const lostGold = Math.floor(state.player.gold / 2);
    state.player.gold -= lostGold;
    state.player.hp = state.player.maxHp;
    state.player.mp = state.player.maxMp;
    state.mapId = "town";
    state.player.x = 7;
    state.player.y = 10;
    state.mode = "explore";
    state.battle = null;
    battleCommandView = "root";
    addLog(`力尽きた。町で目を覚ました。-${lostGold}G`);
    render();
  }

  function saveGame() {
    if (state.mode === "battle") {
      addLog("戦闘中はセーブできない。");
      render();
      return;
    }

    const payload = {
      version: 3,
      savedAt: new Date().toISOString(),
      mapId: state.mapId,
      player: state.player,
      npcTalkIndex: state.npcTalkIndex,
      openedChests: state.openedChests,
      log: state.log,
      steps: state.steps,
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      addLog("セーブした。");
    } catch (error) {
      addLog("セーブに失敗した。");
      console.error(error);
    }

    render();
  }

  function loadGame() {
    let payload;

    try {
      payload = JSON.parse(localStorage.getItem(SAVE_KEY));
    } catch (error) {
      console.error(error);
      addLog("ロードデータを読めなかった。");
      render();
      return;
    }

    if (!isValidSave(payload)) {
      addLog("ロードデータが見つからない。");
      render();
      return;
    }

    const loadedLevel = payload.player.level;
    const statDefaults = defaultBattleStats(loadedLevel);
    const isLegacyStats = !Number.isFinite(payload.player.defense);
    const loadedMaxMp = Number.isFinite(payload.player.maxMp) ? payload.player.maxMp : 10;
    const loadedMp = Number.isFinite(payload.player.mp) ? payload.player.mp : loadedMaxMp;
    const savedHerb = payload.player.inventory?.herb;
    const loadedInventory = {
      herb: Number.isFinite(savedHerb) ? Math.max(0, savedHerb) : 1,
    };
    const loadedEquipment = {
      attack: Number(payload.player.equipment?.attack) || 0,
      defense: Number(payload.player.equipment?.defense) || 0,
      wisdom: Number(payload.player.equipment?.wisdom) || 0,
      agility: Number(payload.player.equipment?.agility) || 0,
      dexterity: Number(payload.player.equipment?.dexterity) || 0,
    };

    state = {
      mapId: payload.mapId,
      mode: "explore",
      battle: null,
      player: {
        x: payload.player.x,
        y: payload.player.y,
        level: payload.player.level,
        hp: clamp(payload.player.hp, 1, payload.player.maxHp),
        maxHp: payload.player.maxHp,
        mp: clamp(loadedMp, 0, loadedMaxMp),
        maxMp: loadedMaxMp,
        attack: isLegacyStats
          ? Math.max(statDefaults.attack, (Number(payload.player.attack) || 6) * 6 + 10)
          : payload.player.attack,
        defense: Number.isFinite(payload.player.defense) ? payload.player.defense : statDefaults.defense,
        wisdom: Number.isFinite(payload.player.wisdom) ? payload.player.wisdom : statDefaults.wisdom,
        agility: Number.isFinite(payload.player.agility) ? payload.player.agility : statDefaults.agility,
        dexterity: Number.isFinite(payload.player.dexterity) ? payload.player.dexterity : statDefaults.dexterity,
        exp: payload.player.exp,
        nextExp: payload.player.nextExp,
        gold: payload.player.gold,
        equipment: loadedEquipment,
        inventory: loadedInventory,
      },
      npcTalkIndex: payload.npcTalkIndex || {},
      openedChests: payload.openedChests || {},
      log: Array.isArray(payload.log) ? payload.log.slice(0, 8) : ["ロードした。"],
      steps: payload.steps || 0,
    };

    battleCommandView = "root";
    addLog("ロードした。");
    render();
  }

  function isValidSave(payload) {
    if (!payload || ![1, 2, 3].includes(payload.version)) {
      return false;
    }

    if (!MAPS[payload.mapId] || !payload.player) {
      return false;
    }

    const player = payload.player;
    const numbers = [
      player.x,
      player.y,
      player.level,
      player.hp,
      player.maxHp,
      Number.isFinite(player.mp) ? player.mp : 0,
      Number.isFinite(player.maxMp) ? player.maxMp : 10,
      player.attack,
      Number.isFinite(player.defense) ? player.defense : 1,
      Number.isFinite(player.wisdom) ? player.wisdom : 1,
      Number.isFinite(player.agility) ? player.agility : 1,
      Number.isFinite(player.dexterity) ? player.dexterity : 1,
      player.exp,
      player.nextExp,
      player.gold,
    ];

    return numbers.every((value) => Number.isFinite(value)) && TILES[getTile(payload.mapId, player.x, player.y)].walkable;
  }

  function resetGame() {
    if (!window.confirm("最初から始めますか？")) {
      return;
    }

    state = createInitialState();
    battleCommandView = "root";
    addLog("新しく冒険を始めた。");
    render();
  }

  function draw() {
    const map = currentMap();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < MAP_ROWS; y += 1) {
      for (let x = 0; x < MAP_COLS; x += 1) {
        drawTile(map.tiles[y][x], x, y);
      }
    }

    map.entities.forEach(drawEntity);
    drawPlayer(state.player.x, state.player.y);

    if (state.mode === "battle") {
      drawBattleOverlay(state.battle.enemy);
    }
  }

  function drawTile(tile, x, y) {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;

    if (tile === "P") {
      ctx.fillStyle = "#c9ad79";
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "rgba(98, 76, 42, 0.12)";
      ctx.fillRect(px + 2, py + 10, 8, 3);
      ctx.fillRect(px + 20, py + 24, 9, 3);
    } else if (tile === "I") {
      ctx.fillStyle = "#d7ba7a";
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "rgba(92, 62, 35, 0.18)";
      ctx.fillRect(px, py + 14, TILE_SIZE, 2);
      ctx.fillRect(px + 14, py, 2, TILE_SIZE);
    } else if (tile === "D") {
      ctx.fillStyle = "#b37a3d";
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "#5d3c28";
      ctx.fillRect(px + 8, py + 7, 16, 22);
      ctx.fillStyle = "#dcb56d";
      ctx.fillRect(px + 22, py + 18, 3, 3);
    } else if (tile === "#") {
      ctx.fillStyle = "#7a6553";
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "#5b4a3f";
      ctx.fillRect(px, py + 14, TILE_SIZE, 3);
      ctx.fillRect(px + 14, py, 3, TILE_SIZE);
    } else {
      ctx.fillStyle = tile === "G" || tile === "F" ? "#4f9a4f" : "#67aa5f";
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      drawGrassDetails(px, py, tile);
    }

    if (tile === "T") {
      drawTree(px, py);
    } else if (tile === "C") {
      ctx.fillStyle = "#7f4b2c";
      ctx.fillRect(px + 3, py + 9, 26, 17);
      ctx.fillStyle = "#bd8757";
      ctx.fillRect(px + 3, py + 8, 26, 5);
    } else if (tile === "S") {
      ctx.fillStyle = "#66503a";
      ctx.fillRect(px + 14, py + 13, 4, 16);
      ctx.fillStyle = "#e0c567";
      ctx.fillRect(px + 6, py + 5, 20, 12);
      ctx.strokeStyle = "#6f5338";
      ctx.strokeRect(px + 6.5, py + 5.5, 19, 11);
    }
  }

  function drawGrassDetails(px, py, tile) {
    ctx.fillStyle = "rgba(33, 87, 49, 0.35)";
    ctx.fillRect(px + 6, py + 8, 3, 9);
    ctx.fillRect(px + 21, py + 14, 3, 10);
    ctx.fillRect(px + 13, py + 23, 3, 7);

    if (tile === "F") {
      ctx.fillStyle = "#f5d66b";
      ctx.fillRect(px + 11, py + 10, 4, 4);
      ctx.fillStyle = "#d84f72";
      ctx.fillRect(px + 16, py + 16, 5, 5);
    }
  }

  function drawTree(px, py) {
    ctx.fillStyle = "#5b3e25";
    ctx.fillRect(px + 13, py + 16, 7, 14);
    ctx.fillStyle = "#2f6843";
    ctx.fillRect(px + 5, py + 6, 22, 17);
    ctx.fillStyle = "#3f7e4d";
    ctx.fillRect(px + 9, py + 2, 15, 16);
    ctx.fillStyle = "#255d3b";
    ctx.fillRect(px + 3, py + 13, 26, 9);
  }

  function drawEntity(entity) {
    if (entity.kind === "chest") {
      drawChest(entity);
      drawNameplate(isChestOpen(entity) ? "空" : entity.name, entity.x, entity.y);
      return;
    }

    drawCharacter(entity.x, entity.y, entity.body, entity.hair);
    drawNameplate(entity.name, entity.x, entity.y);
  }

  function drawChest(chest) {
    const px = chest.x * TILE_SIZE;
    const py = chest.y * TILE_SIZE;
    const opened = isChestOpen(chest);

    ctx.fillStyle = "rgba(35, 45, 38, 0.22)";
    ctx.fillRect(px + 6, py + 25, 20, 4);
    ctx.fillStyle = opened ? "#7a5637" : "#9a6237";
    ctx.fillRect(px + 6, py + 13, 20, 14);
    ctx.fillStyle = opened ? "#d7ba7a" : "#f0c05a";
    ctx.fillRect(px + 6, py + 13, 20, 4);
    ctx.fillStyle = "#4d3326";
    ctx.fillRect(px + 14, py + 17, 4, 5);

    if (opened) {
      ctx.fillStyle = "#3a2720";
      ctx.fillRect(px + 6, py + 8, 20, 7);
      ctx.fillStyle = "#c9ad79";
      ctx.fillRect(px + 8, py + 9, 16, 3);
    }
  }

  function drawPlayer(x, y) {
    drawCharacter(x, y, "#c9574d", "#273142");
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    ctx.fillStyle = "#f4d27a";
    ctx.fillRect(px + 11, py + 6, 10, 4);
  }

  function drawCharacter(x, y, bodyColor, hairColor) {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    ctx.fillStyle = "rgba(35, 45, 38, 0.2)";
    ctx.fillRect(px + 8, py + 25, 16, 4);
    ctx.fillStyle = bodyColor;
    ctx.fillRect(px + 9, py + 15, 14, 12);
    ctx.fillStyle = "#f0c8a0";
    ctx.fillRect(px + 10, py + 7, 12, 10);
    ctx.fillStyle = hairColor;
    ctx.fillRect(px + 9, py + 5, 14, 5);
    ctx.fillStyle = "#26313a";
    ctx.fillRect(px + 13, py + 12, 2, 2);
    ctx.fillRect(px + 18, py + 12, 2, 2);
  }

  function drawNameplate(name, x, y) {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    ctx.save();
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(24, 28, 25, 0.7)";
    ctx.fillRect(px + 1, py - 1, 30, 12);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(name, px + 16, py);
    ctx.restore();
  }

  function drawBattleOverlay(enemy) {
    const effect = activeEffect;
    const battleShake = effect?.type === "enemyAttack"
      ? Math.sin(effect.progress * Math.PI * 12) * 7 * (1 - effect.progress)
      : 0;
    const centerX = canvas.width / 2 + battleShake;
    const enemyY = 142;
    const enemyJolt = effect?.type === "slash"
      ? Math.sin(effect.progress * Math.PI) * 7
      : 0;
    const enemyAlpha = effect?.type === "defeat" ? 1 - effect.progress : 1;

    ctx.fillStyle = "#111318";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#1a1f27";
    ctx.fillRect(0, 0, canvas.width, 236);
    ctx.fillStyle = "#253142";
    for (let index = 0; index < 36; index += 1) {
      const x = (index * 43) % canvas.width;
      const y = 12 + ((index * 37) % 172);
      ctx.fillRect(x, y, 2, 2);
    }

    drawRetroWindow(18, 16, 176, 58);
    ctx.fillStyle = "#fffaf1";
    ctx.font = "bold 17px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(enemy.name, 36, 42);
    ctx.font = "14px sans-serif";
    ctx.fillText(`HP ${enemy.hp} / ${enemy.maxHp}`, 36, 62);

    ctx.save();
    ctx.globalAlpha = enemyAlpha;
    ctx.translate(enemyJolt, 0);
    drawEnemySprite(enemy, centerX, enemyY);
    ctx.restore();

    if (effect) {
      drawBattleEffect(effect, centerX, enemyY);
    }

    drawBattleMessage(state.log[0] || "どうする？");
    drawBattleCommandWindow();
  }

  function drawEnemySprite(enemy, centerX, centerY) {
    if (enemy.sprite === "wolf") {
      drawWolfSprite(enemy, centerX, centerY);
    } else if (enemy.sprite === "wasp") {
      drawWaspSprite(enemy, centerX, centerY);
    } else if (enemy.sprite === "spirit") {
      drawSpiritSprite(enemy, centerX, centerY);
    } else {
      drawSlimeSprite(enemy, centerX, centerY);
    }
  }

  function drawSlimeSprite(enemy, centerX, centerY) {
    ctx.fillStyle = enemy.color;
    ctx.fillRect(centerX - 48, centerY - 18, 96, 50);
    ctx.fillRect(centerX - 32, centerY - 38, 64, 22);
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(centerX - 28, centerY - 25, 18, 12);
    ctx.fillStyle = "#15191f";
    ctx.fillRect(centerX - 22, centerY, 7, 7);
    ctx.fillRect(centerX + 15, centerY, 7, 7);
    ctx.fillRect(centerX - 11, centerY + 18, 22, 4);
  }

  function drawWolfSprite(enemy, centerX, centerY) {
    ctx.fillStyle = enemy.color;
    ctx.fillRect(centerX - 52, centerY - 18, 104, 48);
    ctx.fillRect(centerX - 38, centerY - 50, 76, 38);
    ctx.fillRect(centerX - 44, centerY - 66, 18, 24);
    ctx.fillRect(centerX + 26, centerY - 66, 18, 24);
    ctx.fillStyle = "#e6e0d1";
    ctx.fillRect(centerX - 24, centerY - 36, 48, 26);
    ctx.fillStyle = "#15191f";
    ctx.fillRect(centerX - 22, centerY - 31, 6, 6);
    ctx.fillRect(centerX + 16, centerY - 31, 6, 6);
    ctx.fillRect(centerX - 5, centerY - 20, 10, 5);
  }

  function drawWaspSprite(enemy, centerX, centerY) {
    ctx.fillStyle = "rgba(223, 239, 255, 0.72)";
    ctx.fillRect(centerX - 58, centerY - 48, 42, 34);
    ctx.fillRect(centerX + 16, centerY - 48, 42, 34);
    ctx.fillStyle = enemy.color;
    ctx.fillRect(centerX - 34, centerY - 24, 68, 58);
    ctx.fillStyle = "#392d23";
    ctx.fillRect(centerX - 34, centerY - 9, 68, 8);
    ctx.fillRect(centerX - 34, centerY + 12, 68, 8);
    ctx.fillStyle = "#15191f";
    ctx.fillRect(centerX - 18, centerY - 14, 6, 6);
    ctx.fillRect(centerX + 12, centerY - 14, 6, 6);
  }

  function drawSpiritSprite(enemy, centerX, centerY) {
    const floatY = Math.sin(performance.now() / 180) * 5;
    ctx.fillStyle = enemy.color;
    ctx.fillRect(centerX - 36, centerY - 45 + floatY, 72, 76);
    ctx.fillRect(centerX - 24, centerY - 61 + floatY, 48, 20);
    ctx.fillStyle = "#dfe9ff";
    ctx.fillRect(centerX - 20, centerY - 24 + floatY, 10, 10);
    ctx.fillRect(centerX + 10, centerY - 24 + floatY, 10, 10);
    ctx.fillStyle = "#15191f";
    ctx.fillRect(centerX - 17, centerY - 21 + floatY, 4, 4);
    ctx.fillRect(centerX + 13, centerY - 21 + floatY, 4, 4);
    ctx.fillStyle = "#111318";
    ctx.fillRect(centerX - 36, centerY + 25 + floatY, 12, 14);
    ctx.fillRect(centerX - 6, centerY + 25 + floatY, 12, 14);
    ctx.fillRect(centerX + 24, centerY + 25 + floatY, 12, 14);
  }

  function drawBattleMessage(text) {
    drawRetroWindow(18, 268, 316, 92);
    ctx.fillStyle = "#fffaf1";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    wrapText(text, 36, 302, 280, 22);
  }

  function drawBattleCommandWindow() {
    drawRetroWindow(348, 268, 146, 92);
    ctx.fillStyle = "#fffaf1";
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "left";

    if (battleCommandView === "action") {
      ctx.fillText("攻撃", 370, 298);
      ctx.fillText("特技", 370, 324);
      ctx.fillText("魔法", 430, 298);
      ctx.fillText("戻る", 430, 324);
      return;
    }

    ctx.fillText("たたかう", 370, 298);
    ctx.fillText("どうぐ", 370, 324);
    ctx.fillText("にげる", 430, 298);
  }

  function drawRetroWindow(x, y, width, height) {
    ctx.fillStyle = "#15191f";
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = "#fffaf1";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, width - 3, height - 3);
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    let line = "";
    let lineY = y;

    [...text].forEach((character) => {
      const testLine = line + character;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, lineY);
        line = character;
        lineY += lineHeight;
        return;
      }
      line = testLine;
    });

    if (line) {
      ctx.fillText(line, x, lineY);
    }
  }

  function drawBattleEffect(effect, centerX, centerY) {
    if (effect.type === "slash") {
      drawSlashEffect(effect, centerX, centerY);
    } else if (effect.type === "enemyAttack") {
      drawEnemyAttackEffect(effect, centerX, centerY);
    } else if (effect.type === "heal") {
      drawHealEffect(effect, centerX, centerY);
    } else if (effect.type === "run") {
      drawRunEffect(effect, centerX, centerY);
    } else if (effect.type === "defeat") {
      drawDefeatEffect(effect, centerX, centerY);
    }
  }

  function drawSlashEffect(effect, centerX, centerY) {
    const progress = effect.progress;
    const alpha = progress < 0.82 ? 1 - progress * 0.7 : 0;
    const travel = easeOutCubic(progress);
    const startX = centerX - 86 + travel * 130;
    const startY = centerY - 67 + travel * 38;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "square";
    ctx.strokeStyle = "#fff7d6";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + 64, startY + 52);
    ctx.stroke();

    ctx.strokeStyle = "#d43f35";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX + 8, startY + 7);
    ctx.lineTo(startX + 58, startY + 47);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX - 18, startY + 40);
    ctx.lineTo(startX + 22, startY + 72);
    ctx.moveTo(startX + 36, startY - 16);
    ctx.lineTo(startX + 86, startY + 24);
    ctx.stroke();
    ctx.restore();

    if (progress > 0.38) {
      drawFloatingText(`-${effect.damage}`, centerX, centerY - 56, progress, "#d43f35");
    }
  }

  function drawEnemyAttackEffect(effect, centerX, centerY) {
    const progress = effect.progress;
    const flashAlpha = Math.max(0, 0.3 - progress * 0.45);

    ctx.fillStyle = `rgba(184, 79, 66, ${flashAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.globalAlpha = 1 - progress * 0.75;
    ctx.strokeStyle = "#e05a48";
    ctx.lineWidth = 7;
    ctx.lineCap = "square";
    for (let index = 0; index < 3; index += 1) {
      const y = centerY + 28 + index * 14;
      const x = centerX - 86 + progress * 84 + index * 10;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 82, y - 28);
      ctx.stroke();
    }
    ctx.restore();

    drawFloatingText(`-${effect.damage}`, centerX, centerY + 98, progress, "#b84f42");
  }

  function drawHealEffect(effect, centerX, centerY) {
    const progress = effect.progress;
    const ringRadius = 16 + progress * 54;
    const alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#57b96f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 82, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#b7f0c2";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY + 82, ringRadius * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#57b96f";
    for (let index = 0; index < 5; index += 1) {
      const angle = progress * Math.PI * 2 + index * 1.26;
      const x = centerX + Math.cos(angle) * (24 + progress * 34);
      const y = centerY + 82 + Math.sin(angle) * (18 + progress * 28);
      ctx.fillRect(x - 2, y - 8, 4, 16);
      ctx.fillRect(x - 8, y - 2, 16, 4);
    }
    ctx.restore();

    drawFloatingText(`+${effect.amount}`, centerX, centerY + 62, progress, "#2f8f54");
  }

  function drawRunEffect(effect, centerX, centerY) {
    const progress = effect.progress;

    ctx.save();
    ctx.globalAlpha = 1 - progress * 0.85;
    ctx.fillStyle = "#d8d1c3";
    for (let index = 0; index < 5; index += 1) {
      const size = 12 + index * 3 + progress * 15;
      const x = centerX - 74 - progress * 82 + index * 22;
      const y = centerY + 45 + Math.sin(progress * Math.PI * 2 + index) * 9;
      ctx.fillRect(x, y, size, size);
    }
    ctx.restore();
  }

  function drawDefeatEffect(effect, centerX, centerY) {
    const progress = effect.progress;
    const alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#fff5c2";
    for (let index = 0; index < 10; index += 1) {
      const angle = index * 0.63;
      const distance = 18 + progress * 70;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY - 16 + Math.sin(angle) * distance;
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }
    ctx.restore();
  }

  function drawFloatingText(text, x, y, progress, color) {
    const textProgress = clamp((progress - 0.28) / 0.72, 0, 1);
    const alpha = textProgress < 0.8 ? 1 : 1 - (textProgress - 0.8) / 0.2;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fffaf1";
    ctx.fillText(text, x + 2, y - textProgress * 28 + 2);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y - textProgress * 28);
    ctx.restore();
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function renderHud() {
    const player = state.player;
    const enemy = state.battle?.enemy;
    const busy = isBattleBusy();
    const isBattle = state.mode === "battle";
    const hpRatio = (player.hp / player.maxHp) * 100;
    const mpRatio = (player.mp / player.maxMp) * 100;
    const expRatio = (player.exp / player.nextExp) * 100;
    const herbCount = getHerbCount();

    document.body.classList.toggle("battle-focus", isBattle);
    ui.mapValue.textContent = currentMap().name;
    ui.modeValue.textContent = busy ? "演出中" : isBattle ? "戦闘中" : "探索中";
    ui.modeValue.classList.toggle("battle", isBattle);
    ui.levelValue.textContent = player.level;
    ui.attackValue.textContent = effectiveStat(player, "attack");
    ui.defenseValue.textContent = effectiveStat(player, "defense");
    ui.wisdomValue.textContent = effectiveStat(player, "wisdom");
    ui.agilityValue.textContent = effectiveStat(player, "agility");
    ui.dexterityValue.textContent = effectiveStat(player, "dexterity");
    ui.goldValue.textContent = player.gold;
    ui.herbValue.textContent = herbCount;
    ui.hpText.textContent = `HP ${player.hp} / ${player.maxHp}`;
    ui.hpBar.style.width = `${hpRatio}%`;
    ui.touchHpText.textContent = `HP ${player.hp} / ${player.maxHp}`;
    ui.touchHpBar.style.width = `${hpRatio}%`;
    ui.mpText.textContent = `MP ${player.mp} / ${player.maxMp}`;
    ui.mpBar.style.width = `${mpRatio}%`;
    ui.touchMpText.textContent = `MP ${player.mp} / ${player.maxMp}`;
    ui.touchMpBar.style.width = `${mpRatio}%`;
    ui.expText.textContent = `EXP ${player.exp} / ${player.nextExp}`;
    ui.expBar.style.width = `${expRatio}%`;

    ui.enemyPanel.hidden = !enemy;
    if (enemy) {
      ui.enemyName.textContent = enemy.name;
      ui.enemyHpText.textContent = `HP ${enemy.hp} / ${enemy.maxHp}`;
      ui.enemyHpBar.style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
    }

    ui.exploreCommandGrid.hidden = isBattle;
    ui.battleRootMenu.hidden = !isBattle || battleCommandView !== "root";
    ui.battleActionMenu.hidden = !isBattle || battleCommandView !== "action";
    ui.interactButton.disabled = state.mode !== "explore" || busy;
    ui.fightButton.disabled = !isBattle || busy;
    ui.attackButton.disabled = !isBattle || busy;
    ui.skillButton.disabled = !isBattle || busy || player.mp < FULL_SLASH_COST;
    ui.magicButton.disabled = !isBattle || busy || player.mp < HEAL_MAGIC_COST;
    ui.backButton.disabled = !isBattle || busy;
    ui.itemButton.disabled = !isBattle || busy || herbCount <= 0;
    ui.runButton.disabled = !isBattle || busy;
    ui.saveButton.disabled = isBattle || busy;
    ui.loadButton.disabled = busy;
    ui.resetButton.disabled = busy;
    ui.touchBattleStatus.hidden = !isBattle;
    ui.touchInteractButton.hidden = isBattle;
    ui.touchInteractButton.textContent = "決定";
    ui.touchInteractButton.disabled = busy || (!isBattle && state.mode !== "explore");
    ui.battleTouchMenu.hidden = !isBattle || busy;
    ui.battleTouchMenu.classList.toggle("action-menu", battleCommandView === "action");
    ui.touchFightButton.hidden = battleCommandView !== "root";
    ui.touchItemButton.hidden = battleCommandView !== "root";
    ui.touchRunButton.hidden = battleCommandView !== "root";
    ui.touchAttackButton.hidden = battleCommandView !== "action";
    ui.touchSkillButton.hidden = battleCommandView !== "action";
    ui.touchMagicButton.hidden = battleCommandView !== "action";
    ui.touchBackButton.hidden = battleCommandView !== "action";
    ui.touchFightButton.disabled = !isBattle || busy;
    ui.touchAttackButton.disabled = !isBattle || busy;
    ui.touchSkillButton.disabled = !isBattle || busy || player.mp < FULL_SLASH_COST;
    ui.touchMagicButton.disabled = !isBattle || busy || player.mp < HEAL_MAGIC_COST;
    ui.touchBackButton.disabled = !isBattle || busy;
    ui.touchItemButton.disabled = !isBattle || busy || herbCount <= 0;
    ui.touchRunButton.disabled = !isBattle || busy;
    ui.touchMoveButtons.forEach((button) => {
      button.disabled = state.mode !== "explore" || busy;
    });

    ui.logList.replaceChildren(
      ...state.log.map((entry) => {
        const item = document.createElement("li");
        item.textContent = entry;
        return item;
      }),
    );
  }

  function render() {
    draw();
    renderHud();
  }

  function handleKeyDown(event) {
    if (BLOCKED_KEYS.has(event.key)) {
      event.preventDefault();
    }

    if (state.mode === "battle") {
      if (battleCommandView === "root") {
        if (event.key === "1") {
          openBattleActionMenu();
        } else if (event.key === "2") {
          playerUseHerb();
        } else if (event.key === "3") {
          playerRun();
        }
      } else if (event.key === "1") {
        playerAttack();
      } else if (event.key === "2") {
        playerFullSlash();
      } else if (event.key === "3") {
        playerHeal();
      } else if (event.key === "4" || event.key === "Escape") {
        openBattleRootMenu();
      }
      return;
    }

    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const direction = DIRECTIONS[key];

    if (direction) {
      movePlayer(direction.x, direction.y);
      return;
    }

    if (event.key === "Enter" || event.key === " " || key === "e" || key === "z") {
      interact();
    }
  }

  function handleTouchMoveStart(event) {
    const direction = TOUCH_DIRECTIONS[event.currentTarget.dataset.move];
    if (!direction) {
      return;
    }

    event.preventDefault();
    stopTouchMove();
    movePlayer(direction.x, direction.y);

    touchMoveTimer = window.setTimeout(() => {
      touchMoveInterval = window.setInterval(() => {
        movePlayer(direction.x, direction.y);
      }, 170);
    }, 280);
  }

  function handleTouchAction() {
    interact();
  }

  function focusBattleView() {
    if (!window.matchMedia("(max-width: 880px)").matches) {
      return;
    }

    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  }

  function stopTouchMove() {
    if (touchMoveTimer) {
      window.clearTimeout(touchMoveTimer);
      touchMoveTimer = null;
    }

    if (touchMoveInterval) {
      window.clearInterval(touchMoveInterval);
      touchMoveInterval = null;
    }
  }

  function bindEvents() {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerup", stopTouchMove);
    window.addEventListener("pointercancel", stopTouchMove);
    window.addEventListener("blur", stopTouchMove);
    ui.interactButton.addEventListener("click", interact);
    ui.fightButton.addEventListener("click", openBattleActionMenu);
    ui.attackButton.addEventListener("click", playerAttack);
    ui.skillButton.addEventListener("click", playerFullSlash);
    ui.magicButton.addEventListener("click", playerHeal);
    ui.backButton.addEventListener("click", openBattleRootMenu);
    ui.itemButton.addEventListener("click", playerUseHerb);
    ui.runButton.addEventListener("click", playerRun);
    ui.saveButton.addEventListener("click", saveGame);
    ui.loadButton.addEventListener("click", loadGame);
    ui.resetButton.addEventListener("click", resetGame);
    ui.touchInteractButton.addEventListener("click", handleTouchAction);
    ui.touchFightButton.addEventListener("click", openBattleActionMenu);
    ui.touchAttackButton.addEventListener("click", playerAttack);
    ui.touchSkillButton.addEventListener("click", playerFullSlash);
    ui.touchMagicButton.addEventListener("click", playerHeal);
    ui.touchBackButton.addEventListener("click", openBattleRootMenu);
    ui.touchItemButton.addEventListener("click", playerUseHerb);
    ui.touchRunButton.addEventListener("click", playerRun);
    ui.touchMoveButtons.forEach((button) => {
      button.addEventListener("pointerdown", handleTouchMoveStart);
      button.addEventListener("pointerleave", stopTouchMove);
    });
  }

  validateMaps();
  bindEvents();
  render();

  window.rpgGame = {
    getState: () => JSON.parse(JSON.stringify(state)),
    startBattle: () => startBattle(choose(ENEMIES)),
    saveGame,
    loadGame,
    resetGame,
  };
})();
