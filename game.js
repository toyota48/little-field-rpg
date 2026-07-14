(() => {
  "use strict";

  const TILE_SIZE = 32;
  const MAP_COLS = 16;
  const MAP_ROWS = 12;
  const SAVE_KEY = "little-field-rpg-save-v1";
  const SAVE_VERSION = 4;
  const INN_PRICE = 5;
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
  const BATTLE_ACTION_DETAILS = {
    fullSlash: {
      name: "全力斬り",
      costLabel: `MP${FULL_SLASH_COST}`,
      description: "全力を尽くして切りかかる。対象に小ダメージ",
    },
    heal: {
      name: "回復",
      costLabel: `MP${HEAL_MAGIC_COST}`,
      description: "初級回復魔法。少量のHPを回復する。",
    },
    herb: {
      name: "薬草",
      costLabel: "どうぐ",
      description: "薬草を使ってHPを少し回復する。",
    },
  };

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  let activeEffect = null;
  let audioContext = null;
  let activeMessage = null;
  let controlsLocked = false;
  let battleMessage = "町の南から草原へ向かえる。";
  let pendingBattleAction = null;

  const ui = {
    mapValue: document.getElementById("mapValue"),
    fieldMapBadge: document.getElementById("fieldMapBadge"),
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
    screenFrame: document.getElementById("screenFrame"),
    fieldFade: document.getElementById("fieldFade"),
    fieldMessage: document.getElementById("fieldMessage"),
    messageSpeaker: document.getElementById("messageSpeaker"),
    messageText: document.getElementById("messageText"),
    messageChoices: document.getElementById("messageChoices"),
    messageYesButton: document.getElementById("messageYesButton"),
    messageNoButton: document.getElementById("messageNoButton"),
    messagePrompt: document.getElementById("messagePrompt"),
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
    menuButton: document.getElementById("menuButton"),
    mobileMenuPanel: document.getElementById("mobileMenuPanel"),
    menuCloseButton: document.getElementById("menuCloseButton"),
    menuSaveButton: document.getElementById("menuSaveButton"),
    menuLoadButton: document.getElementById("menuLoadButton"),
    menuResetButton: document.getElementById("menuResetButton"),
    mobileMapValue: document.getElementById("mobileMapValue"),
    mobileModeValue: document.getElementById("mobileModeValue"),
    mobileLevelValue: document.getElementById("mobileLevelValue"),
    mobileAttackValue: document.getElementById("mobileAttackValue"),
    mobileDefenseValue: document.getElementById("mobileDefenseValue"),
    mobileWisdomValue: document.getElementById("mobileWisdomValue"),
    mobileAgilityValue: document.getElementById("mobileAgilityValue"),
    mobileDexterityValue: document.getElementById("mobileDexterityValue"),
    mobileGoldValue: document.getElementById("mobileGoldValue"),
    mobileHerbValue: document.getElementById("mobileHerbValue"),
    mobileHpText: document.getElementById("mobileHpText"),
    mobileHpBar: document.getElementById("mobileHpBar"),
    mobileMpText: document.getElementById("mobileMpText"),
    mobileMpBar: document.getElementById("mobileMpBar"),
    mobileExpText: document.getElementById("mobileExpText"),
    mobileExpBar: document.getElementById("mobileExpBar"),
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
          id: "luca",
          kind: "npc",
          name: "ルカ",
          x: 7,
          y: 9,
          body: "#7b4ea3",
          hair: "#273142",
          messages: [
            "ルカ「魔王討伐は長い旅になる。迷ったら町で準備を整えよう。」",
            "ルカ「草原の魔物で腕を磨いてから、次の目的地を探すんだ。」",
          ],
        },
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

  const TUTORIAL_ENEMY = {
    name: "訓練スライム",
    maxHp: 14,
    attack: 28,
    defense: 8,
    wisdom: 8,
    agility: 8,
    dexterity: 10,
    exp: 12,
    gold: 0,
    color: "#6fbf71",
    sprite: "slime",
    tutorial: true,
  };

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
      tutorial: {
        done: false,
        active: false,
        requiredAction: null,
      },
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
    battleMessage = text;
    state.log.unshift(text);
    state.log = state.log.slice(0, 8);
    renderHud();
    draw();
  }

  function setBattleMessage(text) {
    battleMessage = text;
    render();
  }

  function isInputLocked() {
    return controlsLocked || Boolean(activeMessage);
  }

  function showFieldMessage(speaker, text, options = {}) {
    const choices = options.choices || null;
    ui.screenFrame.classList.add("has-message");
    ui.fieldMessage.hidden = false;
    ui.messageSpeaker.textContent = speaker || "";
    ui.messageText.textContent = text;
    ui.messageChoices.hidden = !choices;
    ui.messagePrompt.hidden = Boolean(choices);

    if (choices) {
      ui.messageYesButton.textContent = choices.yes || "はい";
      ui.messageNoButton.textContent = choices.no || "いいえ";
    }

    return new Promise((resolve) => {
      activeMessage = { choices, resolve };
      renderHud();
    });
  }

  function closeFieldMessage(value = true) {
    if (!activeMessage) {
      return false;
    }

    const { resolve } = activeMessage;
    activeMessage = null;
    ui.fieldMessage.hidden = true;
    ui.messageChoices.hidden = true;
    ui.screenFrame.classList.remove("has-message");
    renderHud();
    resolve(value);
    return true;
  }

  function advanceFieldMessage(value) {
    if (!activeMessage) {
      return false;
    }

    if (activeMessage.choices && typeof value === "undefined") {
      return true;
    }

    return closeFieldMessage(value);
  }

  function say(speaker, text) {
    return showFieldMessage(speaker, text);
  }

  function ask(speaker, text, labels = {}) {
    return showFieldMessage(speaker, text, {
      choices: {
        yes: labels.yes || "はい",
        no: labels.no || "いいえ",
      },
    });
  }

  function openMobileMenu() {
    if (!ui.mobileMenuPanel || state.mode === "battle") {
      return;
    }

    ui.mobileMenuPanel.hidden = false;
    ui.menuButton?.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
  }

  function closeMobileMenu() {
    if (!ui.mobileMenuPanel) {
      return;
    }

    ui.mobileMenuPanel.hidden = true;
    ui.menuButton?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }

  function runMobileMenuAction(action) {
    closeMobileMenu();
    action();
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
    if (state.mode !== "explore" || isInputLocked()) {
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
    setBattleMessage(exit.message);
    showFieldMessage("", exit.message);
    return true;
  }

  function tryRandomEncounter() {
    const tile = getTile(state.mapId, state.player.x, state.player.y);
    const encounterRate = TILES[tile].encounter || 0;

    if (encounterRate > 0 && Math.random() < encounterRate) {
      startBattle(choose(ENEMIES));
    }
  }

  function splitNpcMessage(entity, message) {
    const match = message.match(/^([^「]+)「(.+)」$/);
    if (!match) {
      return { speaker: entity.name, text: message };
    }

    return { speaker: match[1], text: match[2] };
  }

  async function interact() {
    if (state.mode !== "explore" || isInputLocked()) {
      return;
    }

    const entity = getAdjacentEntity();

    if (!entity) {
      await say("", "近くには何もない。");
      return;
    }

    if (entity.kind === "npc") {
      const talkIndex = state.npcTalkIndex[entity.id] || 0;
      const message = splitNpcMessage(entity, entity.messages[talkIndex % entity.messages.length]);
      state.npcTalkIndex[entity.id] = talkIndex + 1;
      await say(message.speaker, message.text);
      return;
    }

    if (entity.kind === "inn") {
      await stayAtInn();
      return;
    }

    if (entity.kind === "chest") {
      await openChest(entity);
    }
  }

  async function stayAtInn() {
    if (state.player.gold < INN_PRICE) {
      if (state.player.hp === state.player.maxHp && state.player.mp === state.player.maxMp) {
        await say("宿屋", "もう元気いっぱいですね。");
      } else {
        await say("宿屋", `一泊${INN_PRICE}Gです。お金が足りないようです。`);
      }
      return;
    }

    const willRest = await ask("宿屋", `休憩して行くかい？（一泊${INN_PRICE}G）`);
    if (!willRest) {
      await say("宿屋", "またいつでもどうぞ。");
      return;
    }

    state.player.gold -= INN_PRICE;
    render();
    await playInnRestSequence();
    state.player.hp = state.player.maxHp;
    state.player.mp = state.player.maxMp;
    render();
    await say("宿屋", "よく眠れたかい？");
  }

  async function openChest(chest) {
    if (isChestOpen(chest)) {
      await say("宝箱", "宝箱は空っぽだ。");
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

    render();
    await say("宝箱", `宝箱を開けた。\n${rewards.join(" と ")}を手に入れた。`);
  }

  function startBattle(enemyTemplate, options = {}) {
    closeMobileMenu();
    const enemy = {
      ...enemyTemplate,
      hp: enemyTemplate.maxHp,
    };

    state.mode = "battle";
    state.battle = { enemy, busy: false, tutorial: Boolean(options.tutorial || enemyTemplate.tutorial) };
    battleCommandView = "root";
    pendingBattleAction = null;
    setBattleMessage(`${enemy.name}が現れた。`);
    render();
    focusBattleView();
  }

  async function maybeStartTutorial() {
    if (state.tutorial?.done || state.tutorial?.active || state.mode !== "explore") {
      return;
    }

    state.tutorial.active = true;
    state.tutorial.requiredAction = null;
    controlsLocked = true;
    render();

    await wait(180);
    await say("ルカ", "目を覚ましたね。大変な知らせがある。");
    await say("ルカ", "魔王が誕生した。魔物たちは世界各地を襲い、町の外はもう安全ではない。");
    await say("ルカ", "王からの命令だ。君には魔王討伐の旅に出てもらう。");
    await say("ルカ", "その前に、まずは私と一緒に戦い方を確認しよう。");

    controlsLocked = false;
    startBattle(TUTORIAL_ENEMY, { tutorial: true });
    state.tutorial.requiredAction = "attack";
    setBattleMessage("まずは「たたかう」から「攻撃」を選ぼう。");
    await say("ルカ", "実際に攻撃してみよう！「たたかう」から「攻撃」を選んで。");
    renderHud();
  }

  async function advanceTutorialAfterAction(actionType) {
    if (!isTutorialBattle()) {
      return;
    }

    if (state.tutorial.requiredAction === "attack" && actionType === "attack") {
      state.tutorial.requiredAction = null;
      renderHud();
      await say("ルカ", "いてて。傷を負ったみたいだね。次は回復してみよう。");
      await say("ルカ", "回復は特定の道具を使うか、特定の魔法を唱えることで行えるよ。今回は魔法を使ってみよう！");
      await say("ルカ", "「たたかう」から「魔法」、そして「回復」を選んで。");
      state.tutorial.requiredAction = "magic";
      setBattleMessage("「たたかう」→「魔法」→「回復」を選ぼう。");
      renderHud();
      return;
    }

    if (state.tutorial.requiredAction === "magic" && actionType === "magic") {
      state.tutorial.requiredAction = null;
      renderHud();
      await say("ルカ", "そうそう！魔法を使うにはMPを消費するよ。");
      await say("ルカ", "MPが0になっても死ぬことはないけれど、戦闘中はMP切れに気をつけよう。");
      await say("ルカ", "最後に特技を使ってやっつけよう！「特技」から「全力斬り」を選んで。");
      state.tutorial.requiredAction = "skill";
      setBattleMessage("「たたかう」→「特技」→「全力斬り」を選ぼう。");
      renderHud();
    }
  }

  async function runPostTutorialSequence() {
    controlsLocked = true;
    state.tutorial.requiredAction = null;
    state.mapId = "town";
    state.player.x = 5;
    state.player.y = 5;
    render();

    await say("ルカ", "よし、今の流れで戦闘の基本は大丈夫だ。");
    await say("ルカ", "レベルが上がると、HPやMP、攻撃力などのステータスが伸びる。少しずつ強くなっていこう。");
    await say("ルカ", "疲れただろう。宿屋で休んでから出発しよう。");
    await playInnRestSequence();
    controlsLocked = true;
    state.player.hp = state.player.maxHp;
    state.player.mp = state.player.maxMp;
    render();
    await say("宿屋", "よく眠れたかい？");
    await say("ルカ", "こんな感じだね。それでは魔王討伐、頑張って。世界を頼んだよ。");

    state.tutorial.done = true;
    state.tutorial.active = false;
    controlsLocked = false;
    render();
  }

  function openBattleActionMenu() {
    if (state.mode !== "battle" || isBattleBusy() || !canUseTutorialChoice("fight")) {
      return;
    }

    battleCommandView = "action";
    pendingBattleAction = null;
    setBattleMessage("どうする？");
    renderHud();
  }

  function openBattleRootMenu() {
    if (state.mode !== "battle" || isBattleBusy()) {
      return;
    }

    battleCommandView = "root";
    pendingBattleAction = null;
    setBattleMessage("どうする？");
    renderHud();
  }

  function openBattleSkillMenu() {
    if (state.mode !== "battle" || isBattleBusy() || !canUseTutorialChoice("skill")) {
      return;
    }

    battleCommandView = "skillList";
    pendingBattleAction = null;
    setBattleMessage("どの特技を使う？");
    renderHud();
  }

  function openBattleMagicMenu() {
    if (state.mode !== "battle" || isBattleBusy() || !canUseTutorialChoice("magic")) {
      return;
    }

    battleCommandView = "magicList";
    pendingBattleAction = null;
    setBattleMessage("どの魔法を唱える？");
    renderHud();
  }

  function openBattleItemMenu() {
    if (state.mode !== "battle" || isBattleBusy() || !canUseTutorialChoice("item")) {
      return;
    }

    battleCommandView = "itemList";
    pendingBattleAction = null;
    setBattleMessage("どのどうぐを使う？");
    renderHud();
  }

  function getBattleActionInfo(type) {
    const herbCount = getHerbCount();
    const fullSlash = BATTLE_ACTION_DETAILS.fullSlash;
    const heal = BATTLE_ACTION_DETAILS.heal;
    const herb = BATTLE_ACTION_DETAILS.herb;
    const actions = {
      fullSlash: {
        label: `${fullSlash.name}（消費${fullSlash.costLabel}）`,
        shortLabel: fullSlash.name,
        costLabel: fullSlash.costLabel,
        description: fullSlash.description,
        fromView: "skillList",
        disabled: state.player.mp < FULL_SLASH_COST,
        execute: playerFullSlash,
      },
      heal: {
        label: `${heal.name}（消費${heal.costLabel}）`,
        shortLabel: heal.name,
        costLabel: heal.costLabel,
        description: heal.description,
        fromView: "magicList",
        disabled: state.player.mp < HEAL_MAGIC_COST,
        execute: playerHeal,
      },
      herb: {
        label: `${herb.name}（残り${herbCount}個）`,
        shortLabel: herb.name,
        costLabel: `残り${herbCount}`,
        description: herb.description,
        fromView: "itemList",
        disabled: herbCount <= 0,
        execute: playerUseHerb,
      },
    };

    return actions[type];
  }

  function chooseBattleAction(type) {
    if (state.mode !== "battle" || isBattleBusy() || !canUseTutorialChoice(type)) {
      return;
    }

    if (type === "attack") {
      playerAttack();
      return;
    }

    const action = getBattleActionInfo(type);
    if (!action || action.disabled) {
      setBattleMessage("今は使えない。");
      return;
    }

    pendingBattleAction = { type, fromView: action.fromView };
    battleCommandView = "confirm";
    setBattleMessage(action.description);
    renderHud();
  }

  function confirmPendingBattleAction() {
    if (!pendingBattleAction || isBattleBusy()) {
      return;
    }

    const action = getBattleActionInfo(pendingBattleAction.type);
    pendingBattleAction = null;
    battleCommandView = "root";

    if (!action || action.disabled) {
      setBattleMessage("今は使えない。");
      return;
    }

    action.execute();
  }

  function cancelPendingBattleAction() {
    if (pendingBattleAction) {
      battleCommandView = pendingBattleAction.fromView;
      pendingBattleAction = null;
      setBattleMessage("どうする？");
      renderHud();
      return;
    }

    openBattleRootMenu();
  }

  function handleBattlePrimaryButton() {
    if (battleCommandView === "action") {
      chooseBattleAction("attack");
    } else if (battleCommandView === "skillList") {
      chooseBattleAction("fullSlash");
    } else if (battleCommandView === "magicList") {
      chooseBattleAction("heal");
    } else if (battleCommandView === "itemList") {
      chooseBattleAction("herb");
    } else if (battleCommandView === "confirm") {
      confirmPendingBattleAction();
    }
  }

  function handleBattleBackButton() {
    const backChoice = battleCommandView === "confirm" ? "confirmNo" : "back";
    if (!canUseTutorialChoice(backChoice)) {
      return;
    }

    if (battleCommandView === "action") {
      openBattleRootMenu();
    } else if (battleCommandView === "skillList" || battleCommandView === "magicList") {
      openBattleActionMenu();
    } else if (battleCommandView === "itemList") {
      openBattleRootMenu();
    } else if (battleCommandView === "confirm") {
      cancelPendingBattleAction();
    }
  }

  async function runPlayerBattleAction(action, actionType) {
    if (state.mode !== "battle" || isBattleBusy()) {
      return;
    }

    const enemy = state.battle.enemy;
    const playerFirst = isTutorialBattle() || playerActsFirst(enemy);
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

      if (playerFirst && (!isTutorialBattle() || actionType === "attack")) {
        await wait(220);
        await enemyTurn();
      }
    } finally {
      if (state.mode === "battle" && state.battle) {
        setBattleBusy(false);
      }
    }

    if (state.mode === "battle" && state.battle) {
      await advanceTutorialAfterAction(actionType);
    }
  }

  async function playerAttack() {
    await runPlayerBattleAction(() => executePhysicalPlayerAction({
      label: "攻撃した",
      attackMultiplier: 1,
      actionType: "attack",
    }), "attack");
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
      actionType: "skill",
    }), "skill");
  }

  async function executePhysicalPlayerAction({ label, attackMultiplier, mpCost = 0, actionType = "attack" }) {
    if (mpCost > 0) {
      state.player.mp = clamp(state.player.mp - mpCost, 0, state.player.maxMp);
    }

    const enemy = state.battle.enemy;
    let result = calculatePhysicalDamage(state.player, enemy, { attackMultiplier });
    if (isTutorialBattle() && actionType === "attack") {
      result = { damage: Math.min(6, Math.max(1, enemy.hp - 8)), isCritical: false };
    } else if (isTutorialBattle() && actionType === "skill") {
      result = { damage: enemy.hp, isCritical: false };
    }

    playSlashSound();
    await playEffect({ type: "slash", damage: result.damage }, EFFECT_DURATIONS.slash);

    enemy.hp = clamp(enemy.hp - result.damage, 0, enemy.maxHp);
    const criticalText = result.isCritical ? "会心の一撃！" : "";
    addLog(`${label}。${criticalText}${enemy.name}に${result.damage}ダメージ。`);

    if (enemy.hp <= 0) {
      playDefeatSound();
      await playEffect({ type: "defeat" }, EFFECT_DURATIONS.defeat);
      await finishBattle(enemy);
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
    }, "magic");
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
    }, "item");
  }

  async function playerRun() {
    if (state.mode !== "battle" || isBattleBusy() || !canUseTutorialChoice("run")) {
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
    let result = calculatePhysicalDamage(enemy, state.player);
    if (isTutorialBattle()) {
      result = { damage: Math.min(7, Math.max(1, state.player.hp - 1)), isCritical: false };
    }

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

  async function finishBattle(enemy) {
    const wasTutorialBattle = Boolean(enemy.tutorial && state.tutorial?.active);
    battleCommandView = "root";
    pendingBattleAction = null;
    state.player.gold += enemy.gold;
    setBattleMessage("たたかいに勝った！");
    await say("戦闘結果", "たたかいに勝った！");
    await say("戦闘結果", `${enemy.exp}の経験値を獲得！`);

    if (enemy.gold > 0) {
      await say("戦闘結果", `${enemy.gold}Gを手に入れた！`);
    }

    const levelResults = gainExp(enemy.exp);
    for (const result of levelResults) {
      playLevelUpSound();
      await say("レベルアップ", [
        `Lv ${result.before.level} → ${result.after.level}`,
        `HP ${result.before.maxHp} → ${result.after.maxHp}`,
        `MP ${result.before.maxMp} → ${result.after.maxMp}`,
        `攻撃力 ${result.before.attack} → ${result.after.attack}`,
        `防御力 ${result.before.defense} → ${result.after.defense}`,
        `賢さ ${result.before.wisdom} → ${result.after.wisdom}`,
        `素早さ ${result.before.agility} → ${result.after.agility}`,
        `器用さ ${result.before.dexterity} → ${result.after.dexterity}`,
      ].join("\n"));
    }

    state.mode = "explore";
    state.battle = null;
    battleCommandView = "root";
    render();

    if (wasTutorialBattle) {
      await runPostTutorialSequence();
    }
  }

  function gainExp(amount) {
    state.player.exp += amount;
    const results = [];

    while (state.player.exp >= state.player.nextExp) {
      const before = {
        level: state.player.level,
        maxHp: state.player.maxHp,
        maxMp: state.player.maxMp,
        attack: state.player.attack,
        defense: state.player.defense,
        wisdom: state.player.wisdom,
        agility: state.player.agility,
        dexterity: state.player.dexterity,
      };

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
      results.push({
        before,
        after: {
          level: state.player.level,
          maxHp: state.player.maxHp,
          maxMp: state.player.maxMp,
          attack: state.player.attack,
          defense: state.player.defense,
          wisdom: state.player.wisdom,
          agility: state.player.agility,
          dexterity: state.player.dexterity,
        },
      });
    }

    return results;
  }

  function isBattleBusy() {
    return Boolean(state.battle?.busy);
  }

  function isTutorialBattle() {
    return Boolean(state.tutorial?.active && state.battle?.tutorial);
  }

  function currentTutorialAction() {
    return state.tutorial?.active ? state.tutorial.requiredAction : null;
  }

  function canUseTutorialChoice(choice) {
    const requiredAction = currentTutorialAction();
    if (!requiredAction) {
      return true;
    }

    const allowedChoices = {
      attack: new Set(["fight", "attack"]),
      magic: new Set(["fight", "magic", "heal", "confirmYes"]),
      skill: new Set(["fight", "skill", "fullSlash", "confirmYes"]),
    };

    return allowedChoices[requiredAction]?.has(choice) || false;
  }

  function isTutorialChoiceGuided(choice) {
    const requiredAction = currentTutorialAction();
    if (!requiredAction) {
      return false;
    }

    const guidedChoices = {
      attack: new Set(["fight", "attack"]),
      magic: new Set(["fight", "magic", "heal", "confirmYes"]),
      skill: new Set(["fight", "skill", "fullSlash", "confirmYes"]),
    };

    return guidedChoices[requiredAction]?.has(choice) || false;
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

  async function playInnRestSequence() {
    controlsLocked = true;
    ui.fieldFade.hidden = false;
    renderHud();
    playInnSound();
    await wait(40);
    ui.fieldFade.classList.add("visible");
    await wait(1250);
    ui.fieldFade.classList.remove("visible");
    await wait(950);
    ui.fieldFade.hidden = true;
    controlsLocked = false;
    renderHud();
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

  function playInnSound() {
    playTone(392, 0, 0.24, "sine", 0.045);
    playTone(523, 0.22, 0.28, "sine", 0.05);
    playTone(659, 0.48, 0.32, "sine", 0.045);
    playTone(523, 0.82, 0.36, "triangle", 0.04);
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
    pendingBattleAction = null;
    setBattleMessage(`力尽きた。町で目を覚ました。-${lostGold}G`);
    render();
    showFieldMessage("", `力尽きた。町で目を覚ました。\n${lostGold}Gを失った。`);
  }

  function saveGame() {
    if (state.mode === "battle") {
      showFieldMessage("", "戦闘中はセーブできない。");
      return;
    }

    const payload = {
      version: SAVE_VERSION,
      savedAt: new Date().toISOString(),
      mapId: state.mapId,
      player: state.player,
      npcTalkIndex: state.npcTalkIndex,
      openedChests: state.openedChests,
      log: state.log,
      steps: state.steps,
      tutorial: {
        done: Boolean(state.tutorial?.done),
      },
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      setBattleMessage("セーブした。");
      showFieldMessage("", "セーブした。");
    } catch (error) {
      showFieldMessage("", "セーブに失敗した。");
      console.error(error);
    }
  }

  function loadGame() {
    let payload;

    try {
      payload = JSON.parse(localStorage.getItem(SAVE_KEY));
    } catch (error) {
      console.error(error);
      showFieldMessage("", "ロードデータを読めなかった。");
      return;
    }

    if (!isValidSave(payload)) {
      showFieldMessage("", "ロードデータが見つからない。");
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
      tutorial: {
        done: payload.tutorial ? Boolean(payload.tutorial.done) : true,
        active: false,
        requiredAction: null,
      },
    };

    battleCommandView = "root";
    pendingBattleAction = null;
    controlsLocked = false;
    setBattleMessage("ロードした。");
    render();
    showFieldMessage("", "ロードした。");
  }

  function isValidSave(payload) {
    if (!payload || ![1, 2, 3, 4].includes(payload.version)) {
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
    pendingBattleAction = null;
    controlsLocked = false;
    setBattleMessage("新しく冒険を始めた。");
    render();
    maybeStartTutorial();
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

    ctx.save();
    ctx.globalAlpha = enemyAlpha;
    ctx.translate(enemyJolt, 0);
    drawBattleEnemyName(enemy, centerX, enemyY - 94);
    drawEnemySprite(enemy, centerX, enemyY);
    ctx.restore();

    if (effect) {
      drawBattleEffect(effect, centerX, enemyY);
    }

    drawBattleMessage(battleMessage || "どうする？");
    drawBattleCommandWindow();
  }

  function enemyHealthTextColor(enemy) {
    const ratio = (enemy.hp / enemy.maxHp) * 100;
    if (ratio <= 20) {
      return "#e05a48";
    }
    if (ratio <= 50) {
      return "#f5d66b";
    }
    return "#fffaf1";
  }

  function drawBattleEnemyName(enemy, centerX, y) {
    const label = enemy.name;
    ctx.save();
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const width = Math.max(84, ctx.measureText(label).width + 28);
    drawRetroWindow(centerX - width / 2, y - 20, width, 40);
    ctx.fillStyle = enemyHealthTextColor(enemy);
    ctx.fillText(label, centerX, y);
    ctx.restore();
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
    drawRetroWindow(340, 268, 154, 92);
    ctx.fillStyle = "#fffaf1";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";

    if (battleCommandView === "confirm" && pendingBattleAction) {
      const action = getBattleActionInfo(pendingBattleAction.type);
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(`HP ${state.player.hp}/${state.player.maxHp}`, 356, 286);
      ctx.fillText(`MP ${state.player.mp}/${state.player.maxMp}`, 356, 301);
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(`${action.shortLabel}を`, 356, 320);
      ctx.fillText("使いますか？", 356, 335);
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("はい", 360, 352);
      ctx.fillText("いいえ", 418, 352);
      return;
    }

    const menuLabels = {
      root: ["たたかう", "どうぐ", "にげる"],
      action: ["攻撃", "特技", "魔法", "戻る"],
      skillList: ["全力斬り", `MP${FULL_SLASH_COST}`, "戻る"],
      magicList: ["回復", `MP${HEAL_MAGIC_COST}`, "戻る"],
      itemList: ["薬草", `x${getHerbCount()}`, "戻る"],
    }[battleCommandView] || ["たたかう", "どうぐ", "にげる"];

    menuLabels.forEach((label, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      ctx.fillText(label, 356 + column * 62, 298 + row * 26);
    });
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

  function setCommandButton(button, choice, label, hidden, disabled) {
    button.textContent = label;
    button.hidden = hidden;
    button.disabled = disabled;
    button.classList.toggle("guided-command", !hidden && !disabled && isTutorialChoiceGuided(choice));
  }

  function isBattleChoiceDisabled(choice, busy, extraDisabled = false) {
    return state.mode !== "battle" || busy || extraDisabled || !canUseTutorialChoice(choice);
  }

  function renderHud() {
    const player = state.player;
    const enemy = state.battle?.enemy;
    const busy = isBattleBusy();
    const isBattle = state.mode === "battle";
    const messageOpen = Boolean(activeMessage);
    const controlsBusy = busy || isInputLocked();
    const hpRatio = (player.hp / player.maxHp) * 100;
    const mpRatio = (player.mp / player.maxMp) * 100;
    const expRatio = (player.exp / player.nextExp) * 100;
    const herbCount = getHerbCount();

    document.body.classList.toggle("battle-focus", isBattle);
    ui.mapValue.textContent = currentMap().name;
    ui.fieldMapBadge.textContent = currentMap().name;
    ui.modeValue.textContent = busy ? "演出中" : isBattle ? "戦闘中" : "探索中";
    ui.modeValue.classList.toggle("battle", isBattle);
    ui.mobileMapValue.textContent = currentMap().name;
    ui.mobileModeValue.textContent = ui.modeValue.textContent;
    ui.mobileModeValue.classList.toggle("battle", isBattle);
    ui.levelValue.textContent = player.level;
    ui.mobileLevelValue.textContent = player.level;
    ui.attackValue.textContent = effectiveStat(player, "attack");
    ui.mobileAttackValue.textContent = effectiveStat(player, "attack");
    ui.defenseValue.textContent = effectiveStat(player, "defense");
    ui.mobileDefenseValue.textContent = effectiveStat(player, "defense");
    ui.wisdomValue.textContent = effectiveStat(player, "wisdom");
    ui.mobileWisdomValue.textContent = effectiveStat(player, "wisdom");
    ui.agilityValue.textContent = effectiveStat(player, "agility");
    ui.mobileAgilityValue.textContent = effectiveStat(player, "agility");
    ui.dexterityValue.textContent = effectiveStat(player, "dexterity");
    ui.mobileDexterityValue.textContent = effectiveStat(player, "dexterity");
    ui.goldValue.textContent = player.gold;
    ui.mobileGoldValue.textContent = player.gold;
    ui.herbValue.textContent = herbCount;
    ui.mobileHerbValue.textContent = herbCount;
    ui.hpText.textContent = `HP ${player.hp} / ${player.maxHp}`;
    ui.hpBar.style.width = `${hpRatio}%`;
    ui.mobileHpText.textContent = `HP ${player.hp} / ${player.maxHp}`;
    ui.mobileHpBar.style.width = `${hpRatio}%`;
    ui.touchHpText.textContent = `HP ${player.hp} / ${player.maxHp}`;
    ui.touchHpBar.style.width = `${hpRatio}%`;
    ui.mpText.textContent = `MP ${player.mp} / ${player.maxMp}`;
    ui.mpBar.style.width = `${mpRatio}%`;
    ui.mobileMpText.textContent = `MP ${player.mp} / ${player.maxMp}`;
    ui.mobileMpBar.style.width = `${mpRatio}%`;
    ui.touchMpText.textContent = `MP ${player.mp} / ${player.maxMp}`;
    ui.touchMpBar.style.width = `${mpRatio}%`;
    ui.expText.textContent = `EXP ${player.exp} / ${player.nextExp}`;
    ui.expBar.style.width = `${expRatio}%`;
    ui.mobileExpText.textContent = `EXP ${player.exp} / ${player.nextExp}`;
    ui.mobileExpBar.style.width = `${expRatio}%`;

    ui.enemyPanel.hidden = true;
    if (enemy) {
      ui.enemyName.textContent = enemy.name;
      ui.enemyName.style.color = enemyHealthTextColor(enemy);
      ui.enemyHpText.textContent = `HP ${enemy.hp} / ${enemy.maxHp}`;
      ui.enemyHpBar.style.width = `${(enemy.hp / enemy.maxHp) * 100}%`;
    }

    ui.exploreCommandGrid.hidden = isBattle;
    ui.battleRootMenu.hidden = !isBattle || battleCommandView !== "root";
    ui.battleActionMenu.hidden = !isBattle || battleCommandView === "root";
    ui.interactButton.disabled = state.mode !== "explore" || controlsBusy;
    setCommandButton(ui.fightButton, "fight", "たたかう", false, isBattleChoiceDisabled("fight", controlsBusy));
    setCommandButton(ui.itemButton, "item", "どうぐ", false, isBattleChoiceDisabled("item", controlsBusy, herbCount <= 0));
    setCommandButton(ui.runButton, "run", "逃げる", false, isBattleChoiceDisabled("run", controlsBusy));

    let primaryChoice = "attack";
    let primaryLabel = "攻撃";
    let primaryDisabled = false;
    let skillHidden = false;
    let magicHidden = false;
    let backChoice = "back";
    let backLabel = "戻る";
    let backDisabled = false;

    if (battleCommandView === "skillList") {
      primaryChoice = "fullSlash";
      primaryLabel = `全力斬り MP${FULL_SLASH_COST}`;
      primaryDisabled = player.mp < FULL_SLASH_COST;
      skillHidden = true;
      magicHidden = true;
    } else if (battleCommandView === "magicList") {
      primaryChoice = "heal";
      primaryLabel = `回復 MP${HEAL_MAGIC_COST}`;
      primaryDisabled = player.mp < HEAL_MAGIC_COST;
      skillHidden = true;
      magicHidden = true;
    } else if (battleCommandView === "itemList") {
      primaryChoice = "herb";
      primaryLabel = `薬草 x${herbCount}`;
      primaryDisabled = herbCount <= 0;
      skillHidden = true;
      magicHidden = true;
    } else if (battleCommandView === "confirm") {
      primaryChoice = "confirmYes";
      primaryLabel = "はい";
      skillHidden = true;
      magicHidden = true;
      backChoice = "confirmNo";
      backLabel = "いいえ";
    }

    setCommandButton(
      ui.attackButton,
      primaryChoice,
      primaryLabel,
      false,
      isBattleChoiceDisabled(primaryChoice, controlsBusy, primaryDisabled),
    );
    setCommandButton(ui.skillButton, "skill", "特技", skillHidden, isBattleChoiceDisabled("skill", controlsBusy));
    setCommandButton(ui.magicButton, "magic", "魔法", magicHidden, isBattleChoiceDisabled("magic", controlsBusy));
    setCommandButton(ui.backButton, backChoice, backLabel, false, isBattleChoiceDisabled(backChoice, controlsBusy, backDisabled));

    ui.saveButton.disabled = isBattle || controlsBusy || Boolean(state.tutorial?.active);
    ui.loadButton.disabled = controlsBusy;
    ui.resetButton.disabled = controlsBusy;
    ui.menuSaveButton.disabled = ui.saveButton.disabled;
    ui.menuLoadButton.disabled = ui.loadButton.disabled;
    ui.menuResetButton.disabled = ui.resetButton.disabled;
    ui.menuButton.disabled = isBattle || controlsBusy;
    ui.touchBattleStatus.hidden = !isBattle;
    ui.touchInteractButton.hidden = isBattle && !messageOpen;
    ui.touchInteractButton.textContent = "決定";
    ui.touchInteractButton.disabled = !messageOpen && (controlsBusy || (!isBattle && state.mode !== "explore"));
    ui.battleTouchMenu.hidden = !isBattle || controlsBusy;
    ui.battleTouchMenu.classList.toggle("action-menu", battleCommandView === "action");
    ui.battleTouchMenu.classList.toggle(
      "list-menu",
      battleCommandView === "skillList" || battleCommandView === "magicList" || battleCommandView === "itemList",
    );
    ui.battleTouchMenu.classList.toggle("confirm-menu", battleCommandView === "confirm");
    ui.touchFightButton.hidden = battleCommandView !== "root";
    ui.touchItemButton.hidden = battleCommandView !== "root";
    ui.touchRunButton.hidden = battleCommandView !== "root";
    ui.touchAttackButton.hidden = battleCommandView === "root";
    ui.touchSkillButton.hidden = battleCommandView !== "action";
    ui.touchMagicButton.hidden = battleCommandView !== "action";
    ui.touchBackButton.hidden = battleCommandView === "root";
    setCommandButton(ui.touchFightButton, "fight", "たたかう", battleCommandView !== "root", isBattleChoiceDisabled("fight", controlsBusy));
    setCommandButton(ui.touchItemButton, "item", "どうぐ", battleCommandView !== "root", isBattleChoiceDisabled("item", controlsBusy, herbCount <= 0));
    setCommandButton(ui.touchRunButton, "run", "逃げる", battleCommandView !== "root", isBattleChoiceDisabled("run", controlsBusy));
    setCommandButton(
      ui.touchAttackButton,
      primaryChoice,
      primaryLabel,
      battleCommandView === "root",
      isBattleChoiceDisabled(primaryChoice, controlsBusy, primaryDisabled),
    );
    setCommandButton(ui.touchSkillButton, "skill", "特技", battleCommandView !== "action", isBattleChoiceDisabled("skill", controlsBusy));
    setCommandButton(ui.touchMagicButton, "magic", "魔法", battleCommandView !== "action", isBattleChoiceDisabled("magic", controlsBusy));
    setCommandButton(
      ui.touchBackButton,
      backChoice,
      backLabel,
      battleCommandView === "root",
      isBattleChoiceDisabled(backChoice, controlsBusy, backDisabled),
    );
    ui.touchMoveButtons.forEach((button) => {
      button.disabled = state.mode !== "explore" || controlsBusy;
    });

    if (ui.logList) {
      ui.logList.replaceChildren();
    }
  }

  function render() {
    draw();
    renderHud();
  }

  function handleKeyDown(event) {
    if (BLOCKED_KEYS.has(event.key)) {
      event.preventDefault();
    }

    if (activeMessage) {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (activeMessage.choices) {
        if (event.key === "Enter" || key === "y" || key === "z") {
          advanceFieldMessage(true);
        } else if (event.key === "Escape" || key === "n" || key === "x") {
          advanceFieldMessage(false);
        }
      } else if (event.key === "Enter" || event.key === " " || key === "e" || key === "z") {
        advanceFieldMessage();
      }
      return;
    }

    if (state.mode === "battle") {
      if (battleCommandView === "root") {
        if (event.key === "1") {
          openBattleActionMenu();
        } else if (event.key === "2") {
          openBattleItemMenu();
        } else if (event.key === "3") {
          playerRun();
        }
      } else if (battleCommandView === "action") {
        if (event.key === "1") {
          handleBattlePrimaryButton();
        } else if (event.key === "2") {
          openBattleSkillMenu();
        } else if (event.key === "3") {
          openBattleMagicMenu();
        } else if (event.key === "4" || event.key === "Escape") {
          handleBattleBackButton();
        }
      } else if (event.key === "1" || event.key === "Enter") {
        handleBattlePrimaryButton();
      } else if (event.key === "2" || event.key === "4" || event.key === "Escape") {
        handleBattleBackButton();
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
    if (activeMessage) {
      advanceFieldMessage(activeMessage.choices ? true : undefined);
      return;
    }

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
    ui.attackButton.addEventListener("click", handleBattlePrimaryButton);
    ui.skillButton.addEventListener("click", openBattleSkillMenu);
    ui.magicButton.addEventListener("click", openBattleMagicMenu);
    ui.backButton.addEventListener("click", handleBattleBackButton);
    ui.itemButton.addEventListener("click", openBattleItemMenu);
    ui.runButton.addEventListener("click", playerRun);
    ui.saveButton.addEventListener("click", saveGame);
    ui.loadButton.addEventListener("click", loadGame);
    ui.resetButton.addEventListener("click", resetGame);
    ui.menuButton.addEventListener("click", openMobileMenu);
    ui.menuCloseButton.addEventListener("click", closeMobileMenu);
    ui.menuSaveButton.addEventListener("click", () => runMobileMenuAction(saveGame));
    ui.menuLoadButton.addEventListener("click", () => runMobileMenuAction(loadGame));
    ui.menuResetButton.addEventListener("click", () => runMobileMenuAction(resetGame));
    ui.touchInteractButton.addEventListener("click", handleTouchAction);
    ui.touchFightButton.addEventListener("click", openBattleActionMenu);
    ui.touchAttackButton.addEventListener("click", handleBattlePrimaryButton);
    ui.touchSkillButton.addEventListener("click", openBattleSkillMenu);
    ui.touchMagicButton.addEventListener("click", openBattleMagicMenu);
    ui.touchBackButton.addEventListener("click", handleBattleBackButton);
    ui.touchItemButton.addEventListener("click", openBattleItemMenu);
    ui.touchRunButton.addEventListener("click", playerRun);
    ui.fieldMessage.addEventListener("click", () => advanceFieldMessage());
    ui.messageYesButton.addEventListener("click", (event) => {
      event.stopPropagation();
      advanceFieldMessage(true);
    });
    ui.messageNoButton.addEventListener("click", (event) => {
      event.stopPropagation();
      advanceFieldMessage(false);
    });
    ui.touchMoveButtons.forEach((button) => {
      button.addEventListener("pointerdown", handleTouchMoveStart);
      button.addEventListener("pointerleave", stopTouchMove);
    });
  }

  validateMaps();
  bindEvents();
  render();
  window.setTimeout(() => {
    if (!localStorage.getItem(SAVE_KEY)) {
      maybeStartTutorial();
    }
  }, 250);

  window.rpgGame = {
    getState: () => JSON.parse(JSON.stringify(state)),
    startBattle: () => startBattle(choose(ENEMIES)),
    saveGame,
    loadGame,
    resetGame,
  };
})();
