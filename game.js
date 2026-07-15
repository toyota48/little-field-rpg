(() => {
  "use strict";

  const TILE_SIZE = 32;
  const VIEW_COLS = 16;
  const VIEW_ROWS = 12;
  const SAVE_KEY = "little-field-rpg-save-v1";
  const SAVE_VERSION = 6;
  const INN_PRICE = 5;
  const HEAL_MAGIC_COST = 3;
  const FULL_SLASH_COST = 3;
  const TOUCH_HOLD_INITIAL_DELAY = 220;
  const TOUCH_HOLD_REPEAT_DELAY = 145;
  const HERB_HEAL = 18;
  const TOOL_ITEMS = {
    herb: {
      name: "薬草",
      description: "旅人の定番薬。HPを少し回復する。",
      icon: "薬",
      sellable: true,
    },
  };
  const KEY_ITEMS = {
    worldMap: {
      name: "旅の地図",
      description: "村人から受け取った地図。町、草原、森、洞窟への道が描かれている。",
      icon: "地",
      mapText: [
        "      [町]",
        "       |",
        "     [草原] ---- [森] ---- [洞窟]",
        "",
        "町: 宿屋、道具屋、武器屋、民家",
        "草原: ゴブリン親分の交易路",
        "森: 奥に洞窟への入口",
        "洞窟: 強い魔物が潜む場所",
      ].join("\n"),
    },
  };
  const EFFECT_DURATIONS = {
    slash: 720,
    enemyAttack: 780,
    heal: 900,
    magicAttack: 860,
    run: 520,
    defeat: 760,
  };
  const BATTLE_TURN_PAUSE = 520;
  const BATTLE_ACTION_DETAILS = {
    fullSlash: {
      category: "skill",
      name: "全力斬り",
      costLabel: `MP${FULL_SLASH_COST}`,
      mpCost: FULL_SLASH_COST,
      minLevel: 1,
      attackMultiplier: 1.5,
      description: "全力を尽くして切りかかる。対象に小ダメージ",
    },
    doubleSlash: {
      category: "skill",
      name: "二段斬り",
      costLabel: "MP5",
      mpCost: 5,
      minLevel: 4,
      attackMultiplier: 1.9,
      description: "素早く二度切りつける。対象に中ダメージ",
    },
    helmSplitter: {
      category: "skill",
      name: "かぶと割り",
      costLabel: "MP7",
      mpCost: 7,
      minLevel: 7,
      attackMultiplier: 2.25,
      description: "守りを砕く一撃。対象に大きめのダメージ",
    },
    heal: {
      category: "magic",
      name: "回復",
      costLabel: `MP${HEAL_MAGIC_COST}`,
      mpCost: HEAL_MAGIC_COST,
      minLevel: 1,
      effect: "heal",
      healMultiplier: 1,
      description: "初級回復魔法。少量のHPを回復する。",
    },
    fire: {
      category: "magic",
      name: "メラ",
      costLabel: "MP4",
      mpCost: 4,
      minLevel: 3,
      effect: "damage",
      power: 18,
      description: "小さな火球を放つ。対象に小ダメージ",
    },
    midHeal: {
      category: "magic",
      name: "ベホイミ",
      costLabel: "MP7",
      mpCost: 7,
      minLevel: 6,
      effect: "heal",
      healMultiplier: 1.85,
      description: "中級回復魔法。HPを中程度回復する。",
    },
    herb: {
      category: "item",
      name: "薬草",
      costLabel: "どうぐ",
      minLevel: 1,
      description: "薬草を使ってHPを少し回復する。",
    },
  };
  const EQUIPMENT_ITEMS = {
    copperSword: {
      name: "銅の剣",
      slot: "weapon",
      attack: 8,
      description: "扱いやすい剣。攻撃力+8",
    },
    rangerVest: {
      name: "旅人の服",
      slot: "armor",
      defense: 7,
      agility: 2,
      description: "動きやすい服。防御力+7、素早さ+2",
    },
    wisdomRing: {
      name: "知恵の指輪",
      slot: "accessory",
      wisdom: 8,
      dexterity: 3,
      description: "魔力を整える指輪。賢さ+8、器用さ+3",
    },
    ironSword: {
      name: "鉄の剣",
      slot: "weapon",
      attack: 15,
      description: "ずしりと重い剣。攻撃力+15",
    },
    ironArmor: {
      name: "鉄のよろい",
      slot: "armor",
      defense: 14,
      agility: -2,
      description: "頼れるよろい。防御力+14、素早さ-2",
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
    titleScreen: document.getElementById("titleScreen"),
    titleNewGameButton: document.getElementById("titleNewGameButton"),
    titleContinueButton: document.getElementById("titleContinueButton"),
    titleHowToButton: document.getElementById("titleHowToButton"),
    titleHowToPanel: document.getElementById("titleHowToPanel"),
    titleNotice: document.getElementById("titleNotice"),
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
    equipmentValue: document.getElementById("equipmentValue"),
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
    mobileStatusTab: document.getElementById("mobileStatusTab"),
    mobileItemsTab: document.getElementById("mobileItemsTab"),
    mobileStatusPanel: document.getElementById("mobileStatusPanel"),
    mobileItemsPanel: document.getElementById("mobileItemsPanel"),
    itemEquipmentTab: document.getElementById("itemEquipmentTab"),
    itemToolsTab: document.getElementById("itemToolsTab"),
    itemKeyTab: document.getElementById("itemKeyTab"),
    itemList: document.getElementById("itemList"),
    itemDetail: document.getElementById("itemDetail"),
    itemIcon: document.getElementById("itemIcon"),
    itemName: document.getElementById("itemName"),
    itemDescription: document.getElementById("itemDescription"),
    itemUseButton: document.getElementById("itemUseButton"),
    itemDropButton: document.getElementById("itemDropButton"),
    itemBackButton: document.getElementById("itemBackButton"),
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
    mobileEquipmentValue: document.getElementById("mobileEquipmentValue"),
    mobileHpText: document.getElementById("mobileHpText"),
    mobileHpBar: document.getElementById("mobileHpBar"),
    mobileMpText: document.getElementById("mobileMpText"),
    mobileMpBar: document.getElementById("mobileMpBar"),
    mobileExpText: document.getElementById("mobileExpText"),
    mobileExpBar: document.getElementById("mobileExpBar"),
    mobileAbilityDetails: document.getElementById("mobileAbilityDetails"),
  };

  const TILES = {
    ".": { name: "grass", walkable: true },
    G: { name: "wild grass", walkable: true, encounter: 0.13 },
    F: { name: "flower", walkable: true, encounter: 0.07 },
    A: { name: "forest floor", walkable: true, encounter: 0.11 },
    B: { name: "cave floor", walkable: true, encounter: 0.15 },
    P: { name: "path", walkable: true },
    I: { name: "inn floor", walkable: true },
    D: { name: "door", walkable: true },
    T: { name: "tree", walkable: false },
    R: { name: "rock wall", walkable: false },
    M: { name: "mountain", walkable: false },
    W: { name: "water", walkable: false },
    "#": { name: "wall", walkable: false },
    C: { name: "counter", walkable: false },
    S: { name: "sign", walkable: false },
  };

  const MAPS = {
    town: {
      name: "町",
      encounters: [],
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
          spawn: { x: 11, y: 1 },
          message: "草原に出た。",
        },
      ],
      entities: [
        {
          id: "village-house-door",
          kind: "door",
          name: "民家",
          buildingLabel: "民家",
          x: 12,
          y: 5,
          to: "villageHouse",
          spawn: { x: 7, y: 10 },
          message: "民家に入った。",
        },
        {
          id: "item-shop",
          kind: "shop",
          shopType: "item",
          name: "道具屋",
          buildingLabel: "道具",
          x: 10,
          y: 5,
        },
        {
          id: "weapon-shop",
          kind: "shop",
          shopType: "equipment",
          name: "武器屋",
          buildingLabel: "武器",
          x: 13,
          y: 5,
        },
        {
          id: "cartographer",
          kind: "mapGiver",
          name: "地図好きの村人",
          x: 10,
          y: 8,
          body: "#5b8fc0",
          hair: "#5b3f2e",
        },
        {
          id: "trade-villager",
          kind: "npc",
          name: "商人",
          x: 12,
          y: 8,
          body: "#b87333",
          hair: "#273142",
          messages: [
            "商人「草原の東道は、ゴブリンのギャングが支配しているせいで隣町との交易が途絶えているんだ。」",
            "商人「腕に自信がついたら、草原の奥で親分を探してみてくれないか。」",
          ],
        },
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
            "ルカ「草原の東には森がある。さらに奥には洞窟が口を開けているらしい。」",
            "ルカ「各地には魔物を率いる中ボスがいる。見かけたら準備して話しかけるんだ。」",
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
          buildingLabel: "宿",
          x: 5,
          y: 4,
        },
      ],
    },
    villageHouse: {
      name: "民家",
      encounters: [],
      tiles: [
        "################",
        "#IIIIIIIIIIIIII#",
        "#IIIIIIIIIIIIII#",
        "#IIIIICCCCIIIII#",
        "#IIIIIIIIIIIIII#",
        "#IIIII####IIIII#",
        "#IIIII#II#IIIII#",
        "#IIIII#II#IIIII#",
        "#IIIIIIIIIIIIII#",
        "#IIIIIIIIIIIIII#",
        "#IIIIIIIIIIDIII#",
        "#######DD#######",
      ],
      exits: [
        {
          xMin: 7,
          xMax: 8,
          y: 11,
          to: "town",
          spawn: { x: 12, y: 6 },
          message: "外に出た。",
        },
      ],
      entities: [
        {
          id: "house-elder",
          kind: "npc",
          name: "村の古老",
          x: 7,
          y: 4,
          body: "#7b4ea3",
          hair: "#c7c0af",
          messages: [
            "古老「魔王の影は、道を知る者から自由を奪う。地図を持って旅をしなされ。」",
            "古老「店で装備を整え、薬草を持ってから草原に出るとよい。」",
          ],
        },
      ],
    },
    grassland: {
      name: "草原",
      encounters: ["slime", "wolf", "wasp", "spirit"],
      tiles: [
        "T".repeat(9) + "P".repeat(6) + "T".repeat(9),
        "T" + "G".repeat(8) + "P".repeat(6) + "G".repeat(8) + "T",
        "T" + "G".repeat(2) + "F".repeat(2) + "G".repeat(4) + "P".repeat(6) + "G".repeat(3) + "F" + "G".repeat(4) + "T",
        "T" + "G".repeat(22) + "T",
        "T" + "G".repeat(4) + "T".repeat(2) + "G".repeat(8) + "T".repeat(2) + "G".repeat(6) + "T",
        "T" + "G".repeat(7) + "P".repeat(4) + "G".repeat(11) + "P",
        "T" + "G".repeat(3) + "F" + "G".repeat(3) + "P".repeat(4) + "G".repeat(3) + "F" + "G".repeat(7) + "P",
        "T" + "G".repeat(22) + "T",
        "T" + "G".repeat(3) + "T".repeat(2) + "G".repeat(11) + "T".repeat(2) + "G".repeat(4) + "P",
        "T" + "G".repeat(8) + "P".repeat(4) + "G".repeat(10) + "T",
        "T" + "G".repeat(8) + "P".repeat(4) + "G".repeat(10) + "T",
        "T" + "G".repeat(4) + "F" + "G".repeat(5) + "P".repeat(4) + "G".repeat(5) + "F" + "G".repeat(2) + "T",
        "T" + "G".repeat(22) + "T",
        "T" + "G".repeat(2) + "T".repeat(2) + "G".repeat(14) + "T".repeat(2) + "G".repeat(2) + "T",
        "T" + "G".repeat(22) + "T",
        "T" + "G".repeat(8) + "P".repeat(4) + "G".repeat(10) + "T",
        "T" + "G".repeat(8) + "P".repeat(4) + "G".repeat(10) + "T",
        "T".repeat(24),
      ],
      exits: [
        {
          xMin: 9,
          xMax: 14,
          y: 0,
          to: "town",
          spawn: { x: 7, y: 10 },
          message: "町に戻った。",
        },
        {
          x: 23,
          yMin: 5,
          yMax: 8,
          to: "forest",
          spawn: { x: 1, y: 9 },
          message: "森に入った。",
        },
      ],
      entities: [
        {
          id: "grassland-cache",
          kind: "chest",
          name: "宝箱",
          x: 20,
          y: 6,
          contents: { herb: 2, gold: 12 },
        },
        {
          id: "grassland-sword",
          kind: "chest",
          name: "宝箱",
          x: 3,
          y: 15,
          contents: { equipment: "copperSword", gold: 8 },
        },
        {
          id: "grassland-warden",
          kind: "boss",
          name: "ゴブリン親分",
          x: 19,
          y: 12,
          body: "#835b33",
          hair: "#2f2a22",
          enemyId: "grassWarden",
          messages: [
            "ゴブリン親分「交易路は俺たちのものだ。通りたければ荷物を置いていけ！」",
            "ゴブリン親分「勇者気取りか。ならば力ずくで追い返してやる！」",
          ],
          victoryMessage: "ゴブリンのギャングを追い払った。途絶えていた交易路に少し希望が戻った。",
        },
      ],
    },
    forest: {
      name: "森",
      encounters: ["leafImp", "forestBat", "wildBoar", "wasp"],
      tiles: [
        "T".repeat(24),
        "T" + "A".repeat(22) + "T",
        "T" + "A".repeat(6) + "P".repeat(4) + "A".repeat(12) + "T",
        "T" + "AAA" + "T".repeat(3) + "A".repeat(5) + "D".repeat(3) + "A".repeat(8) + "T",
        "T" + "A".repeat(22) + "T",
        "T" + "A".repeat(4) + "T".repeat(2) + "A".repeat(8) + "F" + "A".repeat(7) + "T",
        "P" + "A".repeat(8) + "P".repeat(4) + "A".repeat(10) + "T",
        "P" + "A".repeat(3) + "F" + "A".repeat(4) + "P".repeat(4) + "A".repeat(3) + "F" + "A".repeat(6) + "T",
        "P" + "A".repeat(22) + "T",
        "P" + "A".repeat(6) + "T".repeat(2) + "A".repeat(6) + "P".repeat(3) + "A".repeat(5) + "T",
        "T" + "A".repeat(8) + "P".repeat(4) + "A".repeat(10) + "T",
        "T" + "A".repeat(22) + "T",
        "T" + "A".repeat(3) + "T".repeat(3) + "A".repeat(12) + "T".repeat(2) + "A".repeat(2) + "T",
        "T" + "A".repeat(22) + "T",
        "T" + "A".repeat(8) + "P".repeat(4) + "A".repeat(10) + "T",
        "T" + "A".repeat(22) + "T",
        "T" + "A".repeat(8) + "P".repeat(4) + "A".repeat(10) + "T",
        "T".repeat(24),
      ],
      exits: [
        {
          x: 0,
          yMin: 6,
          yMax: 9,
          to: "grassland",
          spawn: { x: 22, y: 6 },
          message: "草原に戻った。",
        },
        {
          xMin: 12,
          xMax: 14,
          y: 3,
          to: "cave",
          spawn: { x: 11, y: 16 },
          message: "洞窟に入った。",
        },
      ],
      entities: [
        {
          id: "forest-vest",
          kind: "chest",
          name: "宝箱",
          x: 18,
          y: 6,
          contents: { equipment: "rangerVest", herb: 1 },
        },
        {
          id: "forest-ring",
          kind: "chest",
          name: "宝箱",
          x: 4,
          y: 15,
          contents: { equipment: "wisdomRing" },
        },
        {
          id: "forest-warden",
          kind: "boss",
          name: "森の番人",
          x: 12,
          y: 12,
          body: "#3f7e4d",
          hair: "#1f4530",
          enemyId: "forestWarden",
          messages: [
            "森の番人「木々がざわめいている。人の子よ、ここを荒らすつもりか。」",
            "森の番人「ならば森の試練を受けてみよ！」",
          ],
          victoryMessage: "森の番人は枝を下ろした。洞窟へ続く気配がはっきりした。",
        },
      ],
    },
    cave: {
      name: "洞窟",
      encounters: ["caveBat", "goblin", "stoneSlime", "spirit"],
      tiles: [
        "R".repeat(24),
        "R" + "B".repeat(22) + "R",
        "R" + "B".repeat(3) + "R".repeat(3) + "B".repeat(7) + "R".repeat(3) + "B".repeat(6) + "R",
        "R" + "B".repeat(22) + "R",
        "R" + "B".repeat(5) + "R".repeat(3) + "B".repeat(7) + "R".repeat(2) + "B".repeat(5) + "R",
        "R" + "B".repeat(22) + "R",
        "R".repeat(3) + "B".repeat(6) + "R" + "B".repeat(6) + "R".repeat(3) + "B".repeat(4) + "R",
        "R" + "B".repeat(22) + "R",
        "R" + "B".repeat(4) + "R".repeat(3) + "B".repeat(8) + "R".repeat(2) + "B".repeat(5) + "R",
        "R" + "B".repeat(22) + "R",
        "R" + "B".repeat(5) + "R".repeat(2) + "B".repeat(15) + "R",
        "R" + "B".repeat(22) + "R",
        "R".repeat(3) + "B".repeat(3) + "R" + "B".repeat(5) + "R" + "B".repeat(4) + "R".repeat(4) + "B".repeat(2) + "R",
        "R" + "B".repeat(22) + "R",
        "R" + "B".repeat(4) + "R".repeat(3) + "B".repeat(10) + "R".repeat(2) + "B".repeat(3) + "R",
        "R" + "B".repeat(22) + "R",
        "R" + "B".repeat(9) + "P".repeat(4) + "B".repeat(9) + "R",
        "R".repeat(10) + "P".repeat(4) + "R".repeat(10),
      ],
      exits: [
        {
          xMin: 10,
          xMax: 13,
          y: 17,
          to: "forest",
          spawn: { x: 13, y: 4 },
          message: "森に戻った。",
        },
      ],
      entities: [
        {
          id: "cave-iron-sword",
          kind: "chest",
          name: "宝箱",
          x: 20,
          y: 10,
          contents: { equipment: "ironSword", gold: 18 },
        },
        {
          id: "cave-armor",
          kind: "chest",
          name: "宝箱",
          x: 3,
          y: 5,
          contents: { equipment: "ironArmor" },
        },
        {
          id: "cave-warden",
          kind: "boss",
          name: "洞窟の番人",
          x: 12,
          y: 8,
          body: "#6c6875",
          hair: "#2a2d35",
          enemyId: "caveWarden",
          messages: [
            "洞窟の番人「地の底まで来るとは、なかなかの胆力だ。」",
            "洞窟の番人「この岩穴の力、受け止めてみせろ！」",
          ],
          victoryMessage: "洞窟の番人を退けた。奥から冷たい風が吹いている。",
        },
      ],
    },
  };

  const ENEMY_TEMPLATES = {
    slime: {
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
    wolf: {
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
    wasp: {
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
    spirit: {
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
    leafImp: {
      name: "リーフインプ",
      maxHp: 28,
      attack: 48,
      defense: 24,
      wisdom: 28,
      agility: 36,
      dexterity: 34,
      exp: 14,
      gold: 10,
      color: "#4f9a4f",
      sprite: "spirit",
    },
    forestBat: {
      name: "もりこうもり",
      maxHp: 22,
      attack: 46,
      defense: 18,
      wisdom: 18,
      agility: 52,
      dexterity: 44,
      exp: 12,
      gold: 9,
      color: "#5d5170",
      sprite: "wasp",
    },
    wildBoar: {
      name: "あばれイノシシ",
      maxHp: 34,
      attack: 56,
      defense: 28,
      wisdom: 14,
      agility: 34,
      dexterity: 28,
      exp: 18,
      gold: 13,
      color: "#8b5c3d",
      sprite: "wolf",
    },
    caveBat: {
      name: "どうくつこうもり",
      maxHp: 30,
      attack: 58,
      defense: 24,
      wisdom: 22,
      agility: 56,
      dexterity: 48,
      exp: 19,
      gold: 14,
      color: "#4d4a63",
      sprite: "wasp",
    },
    goblin: {
      name: "ゴブリン",
      maxHp: 42,
      attack: 66,
      defense: 34,
      wisdom: 24,
      agility: 34,
      dexterity: 38,
      exp: 25,
      gold: 18,
      color: "#6d8c43",
      sprite: "wolf",
    },
    stoneSlime: {
      name: "いしスライム",
      maxHp: 48,
      attack: 54,
      defense: 48,
      wisdom: 18,
      agility: 18,
      dexterity: 22,
      exp: 28,
      gold: 16,
      color: "#7f858d",
      sprite: "slime",
    },
    grassWarden: {
      name: "ゴブリン親分",
      maxHp: 70,
      attack: 64,
      defense: 38,
      wisdom: 24,
      agility: 32,
      dexterity: 36,
      exp: 36,
      gold: 30,
      color: "#835b33",
      sprite: "wolf",
      boss: true,
    },
    forestWarden: {
      name: "森の番人",
      maxHp: 96,
      attack: 76,
      defense: 48,
      wisdom: 44,
      agility: 38,
      dexterity: 42,
      exp: 58,
      gold: 48,
      color: "#3f7e4d",
      sprite: "spirit",
      boss: true,
    },
    caveWarden: {
      name: "洞窟の番人",
      maxHp: 128,
      attack: 88,
      defense: 62,
      wisdom: 34,
      agility: 28,
      dexterity: 38,
      exp: 82,
      gold: 70,
      color: "#6c6875",
      sprite: "wolf",
      boss: true,
    },
  };
  const ENEMIES = ["slime", "wolf", "wasp", "spirit"].map((enemyId) => ENEMY_TEMPLATES[enemyId]);

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
  let touchMovePointerId = null;
  let touchMoveDirection = null;
  let battleCommandView = "root";
  let activeMobileMenuTab = "status";
  let activeItemCategory = "equipment";
  let selectedInventoryItem = null;
  let viewedKeyItemId = null;
  let titleScreenVisible = true;

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
        gear: {
          weapon: null,
          armor: null,
          accessory: null,
        },
        inventory: {
          herb: 1,
          equipment: {},
          keyItems: {},
        },
      },
      npcTalkIndex: {},
      openedChests: {},
      defeatedBosses: {},
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

  function mapWidth(mapId = state.mapId) {
    return MAPS[mapId].tiles[0].length;
  }

  function mapHeight(mapId = state.mapId) {
    return MAPS[mapId].tiles.length;
  }

  function validateMaps() {
    Object.entries(MAPS).forEach(([mapId, map]) => {
      if (map.tiles.length < VIEW_ROWS) {
        throw new Error(`${mapId} must have at least ${VIEW_ROWS} rows.`);
      }

      const width = map.tiles[0]?.length || 0;
      if (width < VIEW_COLS) {
        throw new Error(`${mapId} must have at least ${VIEW_COLS} columns.`);
      }

      map.tiles.forEach((row, index) => {
        if (row.length !== width) {
          throw new Error(`${mapId} row ${index} must have ${width} columns.`);
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
    if (x < 0 || x >= mapWidth(mapId) || y < 0 || y >= mapHeight(mapId)) {
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
    return currentMap().entities.find((entity) => entity.x === x && entity.y === y && !isEntityGone(entity));
  }

  function getAdjacentEntity() {
    return currentMap().entities.find((entity) => {
      if (isEntityGone(entity)) {
        return false;
      }

      const distance = Math.abs(entity.x - state.player.x) + Math.abs(entity.y - state.player.y);
      return distance === 1 || distance === 0;
    });
  }

  function isBossDefeated(entityOrId) {
    const bossId = typeof entityOrId === "string" ? entityOrId : entityOrId.id;
    return Boolean(state.defeatedBosses?.[bossId]);
  }

  function isEntityGone(entity) {
    return entity.kind === "boss" && isBossDefeated(entity);
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

  function hideTitleScreen() {
    titleScreenVisible = false;
    if (ui.titleScreen) {
      ui.titleScreen.hidden = true;
    }
  }

  function showTitleNotice(message) {
    if (ui.titleNotice) {
      ui.titleNotice.textContent = message;
    }
  }

  function toggleHowTo() {
    if (!ui.titleHowToPanel) {
      return;
    }

    ui.titleHowToPanel.hidden = !ui.titleHowToPanel.hidden;
    showTitleNotice("");
  }

  function startNewGame(options = {}) {
    const shouldConfirm = options.confirm !== false;
    if (shouldConfirm && !window.confirm("最初から始めますか？")) {
      return false;
    }

    hideTitleScreen();
    state = createInitialState();
    battleCommandView = "root";
    pendingBattleAction = null;
    controlsLocked = false;
    activeMessage = null;
    ui.fieldMessage.hidden = true;
    ui.messageChoices.hidden = true;
    ui.screenFrame.classList.remove("has-message");
    setBattleMessage("新しく冒険を始めた。");
    render();
    maybeStartTutorial();
    return true;
  }

  function openMobileMenu() {
    if (!ui.mobileMenuPanel || state.mode === "battle") {
      return;
    }

    ui.mobileMenuPanel.hidden = false;
    ui.menuButton?.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
    renderMobileMenu();
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

  function setMobileMenuTab(tab) {
    activeMobileMenuTab = tab;
    selectedInventoryItem = null;
    renderMobileMenu();
  }

  function setItemCategory(category) {
    activeItemCategory = category;
    selectedInventoryItem = null;
    viewedKeyItemId = null;
    renderMobileMenu();
  }

  function selectedInventoryEntry() {
    if (!selectedInventoryItem) {
      return null;
    }

    return getInventoryEntries(selectedInventoryItem.category)
      .find((entry) => entry.id === selectedInventoryItem.id) || null;
  }

  function selectInventoryItem(category, id) {
    selectedInventoryItem = { category, id };
    viewedKeyItemId = null;
    renderMobileMenu();
  }

  function clearInventorySelection() {
    selectedInventoryItem = null;
    renderMobileMenu();
  }

  function renderMobileMenu() {
    if (!ui.mobileMenuPanel) {
      return;
    }

    const showingStatus = activeMobileMenuTab === "status";
    ui.mobileStatusTab?.setAttribute("aria-selected", String(showingStatus));
    ui.mobileItemsTab?.setAttribute("aria-selected", String(!showingStatus));
    if (ui.mobileStatusPanel) {
      ui.mobileStatusPanel.hidden = !showingStatus;
    }
    if (ui.mobileItemsPanel) {
      ui.mobileItemsPanel.hidden = showingStatus;
    }

    renderAbilityDetails();
    renderInventoryMenu();
  }

  function renderAbilityDetails() {
    if (!ui.mobileAbilityDetails) {
      return;
    }

    const player = state.player;
    const rows = [
      ["攻撃力", effectiveStat(player, "attack")],
      ["防御力", effectiveStat(player, "defense")],
      ["賢さ", effectiveStat(player, "wisdom")],
      ["素早さ", effectiveStat(player, "agility")],
      ["器用さ", effectiveStat(player, "dexterity")],
    ];

    ui.mobileAbilityDetails.innerHTML = "";
    rows.forEach(([label, value]) => {
      const row = document.createElement("div");
      const term = document.createElement("dt");
      const detail = document.createElement("dd");
      term.textContent = label;
      detail.textContent = value;
      row.append(term, detail);
      ui.mobileAbilityDetails.append(row);
    });
  }

  function renderInventoryMenu() {
    if (!ui.itemList || !ui.itemDetail) {
      return;
    }

    const categoryMap = {
      equipment: ui.itemEquipmentTab,
      tools: ui.itemToolsTab,
      key: ui.itemKeyTab,
    };
    Object.entries(categoryMap).forEach(([category, button]) => {
      button?.setAttribute("aria-selected", String(activeItemCategory === category));
    });

    const entries = getInventoryEntries(activeItemCategory);
    const selectedEntry = selectedInventoryEntry();
    ui.itemList.innerHTML = "";

    if (entries.length === 0) {
      const note = document.createElement("p");
      note.className = "empty-item-note";
      note.textContent = "この分類のアイテムはまだ持っていない。";
      ui.itemList.append(note);
    } else {
      entries.forEach((entry) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = selectedEntry?.id === entry.id && selectedEntry.category === entry.category
          ? "is-selected"
          : "";
        button.addEventListener("click", () => selectInventoryItem(entry.category, entry.id));

        const name = document.createElement("span");
        const count = document.createElement("span");
        name.textContent = entry.name;
        count.className = "item-count";
        count.textContent = entry.countLabel;
        button.append(name, count);
        ui.itemList.append(button);
      });
    }

    renderItemDetail(selectedEntry);
  }

  function statsWithItemEquipped(itemId) {
    const item = EQUIPMENT_ITEMS[itemId];
    if (!item) {
      return null;
    }

    const currentGear = ensureGear();
    const previewGear = { ...currentGear, [item.slot]: itemId };
    const previewEquipment = equipmentStatsFromGear(previewGear);
    return ["attack", "defense", "wisdom", "agility", "dexterity"].map((stat) => ({
      stat,
      label: statLabel(stat),
      before: effectiveStat(state.player, stat),
      after: Math.max(0, (Number(state.player[stat]) || 0) + (Number(previewEquipment[stat]) || 0)),
    }));
  }

  function statLabel(stat) {
    return {
      attack: "攻撃力",
      defense: "防御力",
      wisdom: "賢さ",
      agility: "素早さ",
      dexterity: "器用さ",
    }[stat] || stat;
  }

  function renderEquipmentPreview(itemId) {
    const rows = statsWithItemEquipped(itemId);
    if (!rows) {
      return null;
    }

    const preview = document.createElement("div");
    preview.className = "equipment-preview";
    rows
      .filter((row) => row.before !== row.after)
      .forEach((row) => {
        const line = document.createElement("div");
        const label = document.createElement("span");
        const value = document.createElement("span");
        line.className = "equipment-preview-row";
        label.textContent = row.label;
        value.innerHTML = `${row.before} → <span class="${row.after > row.before ? "stat-up" : "stat-down"}">${row.after}</span>`;
        line.append(label, value);
        preview.append(line);
      });

    if (!preview.children.length) {
      const line = document.createElement("div");
      line.className = "equipment-preview-row";
      line.textContent = "能力値に変化はない。";
      preview.append(line);
    }

    return preview;
  }

  function renderWorldMapView(itemId) {
    const keyItem = KEY_ITEMS[itemId];
    if (!keyItem?.mapText) {
      return null;
    }

    const wrapper = document.createElement("div");
    const map = document.createElement("pre");
    wrapper.className = "world-map-view";
    map.textContent = keyItem.mapText;
    wrapper.append(map);
    return wrapper;
  }

  function renderItemDetail(entry) {
    if (!ui.itemDetail) {
      return;
    }

    ui.itemDetail.hidden = !entry;
    if (!entry) {
      return;
    }

    ui.itemIcon.className = `item-icon ${entry.category === "tools" ? "tool" : entry.category}`;
    ui.itemIcon.textContent = entry.icon || "品";
    ui.itemName.textContent = entry.name;
    ui.itemDescription.textContent = entry.description;
    ui.itemDetail.querySelectorAll(".equipment-preview, .world-map-view").forEach((element) => element.remove());

    if (entry.category === "equipment") {
      const preview = renderEquipmentPreview(entry.id);
      if (preview) {
        ui.itemDescription.after(preview);
      }
      ui.itemUseButton.hidden = false;
      ui.itemUseButton.disabled = entry.equipped;
      ui.itemUseButton.textContent = entry.equipped ? "装備中" : "装備する";
      ui.itemDropButton.hidden = false;
      ui.itemDropButton.disabled = false;
      ui.itemDropButton.textContent = "捨てる";
    } else if (entry.category === "tools") {
      ui.itemUseButton.hidden = false;
      ui.itemUseButton.disabled = entry.id === "herb" && state.player.hp >= state.player.maxHp;
      ui.itemUseButton.textContent = "使う";
      ui.itemDropButton.hidden = false;
      ui.itemDropButton.disabled = false;
      ui.itemDropButton.textContent = "捨てる";
    } else {
      if (entry.id === "worldMap" && viewedKeyItemId === entry.id) {
        const mapView = renderWorldMapView(entry.id);
        if (mapView) {
          ui.itemDescription.after(mapView);
        }
      }
      ui.itemUseButton.hidden = false;
      ui.itemUseButton.disabled = entry.id !== "worldMap";
      ui.itemUseButton.textContent = entry.id === "worldMap" ? "見る" : "使えない";
      ui.itemDropButton.hidden = false;
      ui.itemDropButton.disabled = true;
      ui.itemDropButton.textContent = "捨てられない";
    }
  }

  function useSelectedInventoryItem() {
    const entry = selectedInventoryEntry();
    if (!entry) {
      return;
    }

    const inventory = ensureInventory();
    if (entry.category === "equipment") {
      equipItem(entry.id);
      setBattleMessage(`${entry.name}を装備した。`);
      playItemSound();
    } else if (entry.category === "tools" && entry.id === "herb" && inventory.herb > 0) {
      if (state.player.hp >= state.player.maxHp) {
        setBattleMessage("HPは満タンだ。");
      } else {
        inventory.herb -= 1;
        const healed = Math.min(state.player.maxHp - state.player.hp, HERB_HEAL);
        state.player.hp += healed;
        setBattleMessage(`薬草を使った。HPが${healed}回復した。`);
        playHealSound();
      }
    } else if (entry.category === "key" && entry.id === "worldMap") {
      viewedKeyItemId = entry.id;
      playItemSound();
    }

    render();
  }

  function dropSelectedInventoryItem() {
    const entry = selectedInventoryEntry();
    if (!entry || entry.category === "key") {
      return;
    }

    const confirmed = window.confirm(`${entry.name}を捨てますか？`);
    if (!confirmed) {
      return;
    }

    const inventory = ensureInventory();
    if (entry.category === "equipment") {
      unequipItem(entry.id);
      delete inventory.equipment[entry.id];
    } else if (entry.category === "tools" && entry.id === "herb") {
      inventory.herb = Math.max(0, inventory.herb - 1);
    }

    selectedInventoryItem = null;
    setBattleMessage(`${entry.name}を捨てた。`);
    render();
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

  function enemyTemplateById(enemyId) {
    return ENEMY_TEMPLATES[enemyId] || ENEMY_TEMPLATES.slime;
  }

  function chooseEnemyForCurrentMap() {
    const encounterIds = currentMap().encounters?.length ? currentMap().encounters : ["slime"];
    return enemyTemplateById(choose(encounterIds));
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

  function ensureGear(player = state.player) {
    if (!player.gear) {
      player.gear = { weapon: null, armor: null, accessory: null };
    }

    ["weapon", "armor", "accessory"].forEach((slot) => {
      if (!EQUIPMENT_ITEMS[player.gear[slot]]) {
        player.gear[slot] = null;
      }
    });

    return player.gear;
  }

  function equipmentStatsFromGear(gear) {
    const stats = { attack: 0, defense: 0, wisdom: 0, agility: 0, dexterity: 0 };
    Object.values(gear).forEach((itemId) => {
      const item = EQUIPMENT_ITEMS[itemId];
      if (!item) {
        return;
      }

      Object.keys(stats).forEach((stat) => {
        stats[stat] += Number(item[stat]) || 0;
      });
    });
    return stats;
  }

  function syncEquipmentStats(player = state.player) {
    const gear = ensureGear(player);
    player.equipment = equipmentStatsFromGear(gear);
    return player.equipment;
  }

  function hasEquippedGear(player = state.player) {
    const gear = ensureGear(player);
    return Object.values(gear).some(Boolean);
  }

  function ensureEquipment(entity = state.player) {
    if (!entity.equipment) {
      entity.equipment = {};
    }

    if (entity === state.player && hasEquippedGear(entity)) {
      return syncEquipmentStats(entity);
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

  function calculateMagicHeal(caster, multiplier = 1) {
    const wisdomScore = Math.floor(effectiveStat(caster, "wisdom") / 2);
    const levelScore = Math.floor(caster.level * 3);
    const baseHeal = Math.max(1, wisdomScore + levelScore);
    const dexterityFactor = dexterityModifier(caster);
    const equipmentFactor = equipmentModifier(caster, "wisdom");
    const variance = randomInt(96, 108) / 100;
    return Math.max(1, Math.floor(((baseHeal * multiplier * dexterityFactor * equipmentFactor * variance) / 2) + 6));
  }

  function calculateMagicDamage(caster, defender, action) {
    const wisdomScore = Math.floor(effectiveStat(caster, "wisdom") / 2);
    const resistance = Math.floor((effectiveStat(defender, "wisdom") + effectiveStat(defender, "defense")) / 8);
    const baseDamage = Math.max(1, wisdomScore + (action.power || 12) - resistance);
    const dexterityFactor = dexterityModifier(caster);
    const equipmentFactor = equipmentModifier(caster, "wisdom");
    const variance = randomInt(94, 108) / 100;
    const damage = Math.max(1, Math.floor(((baseDamage * dexterityFactor * equipmentFactor * variance) / 3) + 1));
    return { damage };
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
    if (!player.inventory.equipment) {
      player.inventory.equipment = {};
    }
    if (!player.inventory.keyItems) {
      player.inventory.keyItems = {};
    }
    return player.inventory;
  }

  function getHerbCount() {
    return ensureInventory().herb;
  }

  function equipmentSlotLabel(slot) {
    return {
      weapon: "武器",
      armor: "防具",
      accessory: "装飾",
    }[slot] || slot;
  }

  function equipmentSummary(player = state.player) {
    const gear = ensureGear(player);
    return ["weapon", "armor", "accessory"]
      .map((slot) => `${equipmentSlotLabel(slot)}: ${EQUIPMENT_ITEMS[gear[slot]]?.name || "なし"}`)
      .join(" / ");
  }

  function equipItem(itemId) {
    const item = EQUIPMENT_ITEMS[itemId];
    if (!item) {
      return null;
    }

    const inventory = ensureInventory();
    inventory.equipment[itemId] = true;
    const gear = ensureGear();
    const previousItem = EQUIPMENT_ITEMS[gear[item.slot]] || null;
    gear[item.slot] = itemId;
    syncEquipmentStats();
    return { item, previousItem };
  }

  function hasKeyItem(itemId) {
    return Boolean(ensureInventory().keyItems[itemId]);
  }

  function giveKeyItem(itemId) {
    if (!KEY_ITEMS[itemId]) {
      return false;
    }

    ensureInventory().keyItems[itemId] = true;
    playItemSound();
    return true;
  }

  function unequipItem(itemId) {
    const gear = ensureGear();
    Object.keys(gear).forEach((slot) => {
      if (gear[slot] === itemId) {
        gear[slot] = null;
      }
    });
    syncEquipmentStats();
  }

  function getInventoryEntries(category = activeItemCategory) {
    const inventory = ensureInventory();

    if (category === "equipment") {
      return Object.keys(inventory.equipment)
        .filter((itemId) => inventory.equipment[itemId] && EQUIPMENT_ITEMS[itemId])
        .map((itemId) => {
          const item = EQUIPMENT_ITEMS[itemId];
          const equipped = Object.values(ensureGear()).includes(itemId);
          return {
            category: "equipment",
            id: itemId,
            name: item.name,
            description: item.description,
            icon: item.slot === "weapon" ? "剣" : item.slot === "armor" ? "鎧" : "輪",
            countLabel: equipped ? "装備中" : equipmentSlotLabel(item.slot),
            equipped,
          };
        });
    }

    if (category === "tools") {
      return Object.keys(TOOL_ITEMS)
        .filter((itemId) => (Number(inventory[itemId]) || 0) > 0)
        .map((itemId) => ({
          category: "tools",
          id: itemId,
          name: TOOL_ITEMS[itemId].name,
          description: TOOL_ITEMS[itemId].description,
          icon: TOOL_ITEMS[itemId].icon,
          countLabel: `${inventory[itemId]}個`,
          count: inventory[itemId],
        }));
    }

    return Object.keys(inventory.keyItems)
      .filter((itemId) => inventory.keyItems[itemId] && KEY_ITEMS[itemId])
      .map((itemId) => ({
        category: "key",
        id: itemId,
        name: KEY_ITEMS[itemId].name,
        description: KEY_ITEMS[itemId].description,
        icon: KEY_ITEMS[itemId].icon,
        countLabel: "大切",
      }));
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
      const onHorizontalExit = (
        Number.isFinite(candidate.y) &&
        candidate.y === state.player.y &&
        state.player.x >= candidate.xMin &&
        state.player.x <= candidate.xMax
      );
      const onVerticalExit = (
        Number.isFinite(candidate.x) &&
        candidate.x === state.player.x &&
        state.player.y >= candidate.yMin &&
        state.player.y <= candidate.yMax
      );
      return onHorizontalExit || onVerticalExit;
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
      startBattle(chooseEnemyForCurrentMap());
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

    if (entity.kind === "mapGiver") {
      await talkToMapGiver();
      return;
    }

    if (entity.kind === "shop") {
      await openShop(entity);
      return;
    }

    if (entity.kind === "door") {
      enterDoor(entity);
      return;
    }

    if (entity.kind === "inn") {
      await stayAtInn();
      return;
    }

    if (entity.kind === "chest") {
      await openChest(entity);
      return;
    }

    if (entity.kind === "boss") {
      await challengeBoss(entity);
    }
  }

  async function talkToMapGiver() {
    if (!state.tutorial?.done) {
      await say("地図好きの村人", "旅立ちの準備が終わったら、また声をかけてくれ。役に立つものを渡すよ。");
      return;
    }

    if (hasKeyItem("worldMap")) {
      await say("地図好きの村人", "地図はメニューのアイテム、大切なものから見られるよ。道に迷ったら思い出してくれ。");
      return;
    }

    await say("地図好きの村人", "魔王討伐に向かうなら、道を知っておくのが一番だ。");
    await say("地図好きの村人", "町の南は草原、東の奥に森、森の奥には洞窟がある。これを持っていきな。");
    giveKeyItem("worldMap");
    render();
    await say("地図好きの村人", "旅の地図を手に入れた。メニューの大切なものに入れておいたよ。");
  }

  function enterDoor(entity) {
    state.mapId = entity.to;
    state.player.x = entity.spawn.x;
    state.player.y = entity.spawn.y;
    setBattleMessage(entity.message || "中に入った。");
    showFieldMessage(entity.name, entity.message || "中に入った。");
    render();
  }

  async function openShop(entity) {
    if (entity.shopType === "item") {
      await openItemShop();
    } else {
      await openEquipmentShop();
    }
  }

  async function openItemShop() {
    const price = 8;
    const willBuy = await ask("道具屋", `薬草なら${price}Gだよ。買っていくかい？`);
    if (!willBuy) {
      await say("道具屋", "また必要になったら寄っておくれ。");
      return;
    }

    if (state.player.gold < price) {
      await say("道具屋", "お金が足りないみたいだね。");
      return;
    }

    state.player.gold -= price;
    ensureInventory().herb += 1;
    playItemSound();
    render();
    await say("道具屋", "薬草をひとつ渡したよ。無理は禁物だ。");
  }

  async function openEquipmentShop() {
    const offers = [
      { id: "copperSword", price: 30 },
      { id: "rangerVest", price: 32 },
      { id: "wisdomRing", price: 45 },
    ];
    const inventory = ensureInventory();
    const offer = offers.find((candidate) => !inventory.equipment[candidate.id]);
    if (!offer) {
      await say("武器屋", "今の品はもう全部持っているようだ。新しい仕入れを待ってくれ。");
      return;
    }

    const item = EQUIPMENT_ITEMS[offer.id];
    const willBuy = await ask("武器屋", `${item.name}は${offer.price}Gだ。買って装備していくか？`);

    if (!willBuy) {
      await say("武器屋", "装備は命を守る。必要になったらまた来てくれ。");
      return;
    }

    if (state.player.gold < offer.price) {
      await say("武器屋", "その装備には少しお金が足りないようだ。");
      return;
    }

    state.player.gold -= offer.price;
    const result = equipItem(offer.id);
    playItemSound();
    render();
    await say("武器屋", `${result.item.name}を装備した。これで少し旅が楽になるはずだ。`);
  }

  async function challengeBoss(entity) {
    if (isBossDefeated(entity)) {
      await say(entity.name, "ここにはもう強い魔物の気配はない。");
      return;
    }

    const willFight = await ask(entity.name, "ただならぬ気配がする。挑みますか？");
    if (!willFight) {
      await say(entity.name, "今は退くことにした。");
      return;
    }

    for (const message of entity.messages || []) {
      const splitMessage = splitNpcMessage(entity, message);
      await say(splitMessage.speaker, splitMessage.text);
    }

    startBattle(enemyTemplateById(entity.enemyId), {
      bossId: entity.id,
      victorySpeaker: entity.name,
      victoryMessage: entity.victoryMessage,
    });
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
    const equipmentIds = Array.isArray(chest.contents.equipment)
      ? chest.contents.equipment
      : [chest.contents.equipment].filter(Boolean);
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
    equipmentIds.forEach((equipmentId) => {
      const equipResult = equipItem(equipmentId);
      if (!equipResult) {
        return;
      }

      const replacement = equipResult.previousItem
        ? `（${equipResult.previousItem.name}と交換して装備）`
        : "（装備）";
      rewards.push(`${equipResult.item.name}${replacement}`);
    });

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
    state.battle = {
      enemy,
      busy: false,
      tutorial: Boolean(options.tutorial || enemyTemplate.tutorial),
      bossId: options.bossId || null,
      victorySpeaker: options.victorySpeaker || "",
      victoryMessage: options.victoryMessage || "",
    };
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

  function learnedBattleActionTypes(category, level = state.player.level) {
    return Object.entries(BATTLE_ACTION_DETAILS)
      .filter(([, action]) => action.category === category && (action.minLevel || 1) <= level)
      .map(([type]) => type);
  }

  function isBattleActionLearned(type) {
    const action = BATTLE_ACTION_DETAILS[type];
    return Boolean(action && (action.minLevel || 1) <= state.player.level);
  }

  function battleActionTypesForView(view) {
    if (view === "skillList") {
      return learnedBattleActionTypes("skill").slice(0, 3);
    }
    if (view === "magicList") {
      return learnedBattleActionTypes("magic").slice(0, 3);
    }
    if (view === "itemList") {
      return ["herb"];
    }
    return [];
  }

  function getBattleActionInfo(type) {
    const herbCount = getHerbCount();
    const action = BATTLE_ACTION_DETAILS[type];
    if (!action) {
      return null;
    }

    const mpCost = Number(action.mpCost) || 0;
    const fromView = {
      skill: "skillList",
      magic: "magicList",
      item: "itemList",
    }[action.category];
    const itemDisabled = action.category === "item" && herbCount <= 0;
    const actionDisabled = action.category !== "item" && (!isBattleActionLearned(type) || state.player.mp < mpCost);

    return {
      ...action,
      type,
      label: action.category === "item"
        ? `${action.name}（残り${herbCount}個）`
        : `${action.name}（消費${action.costLabel}）`,
      shortLabel: action.name,
      costLabel: action.category === "item" ? `残り${herbCount}` : action.costLabel,
      fromView,
      disabled: itemDisabled || actionDisabled,
      execute: () => executeBattleAction(type),
    };
  }

  function battleActionButtonLabel(type) {
    const action = getBattleActionInfo(type);
    if (!action) {
      return "";
    }

    if (action.category === "item") {
      return `${action.name} x${getHerbCount()}`;
    }
    return `${action.name} ${action.costLabel}`;
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
    if (action && !isBattleActionLearned(type)) {
      setBattleMessage("まだ覚えていない。");
      return;
    }

    if (!action || action.disabled) {
      setBattleMessage("今は使えない。");
      return;
    }

    pendingBattleAction = { type, fromView: action.fromView };
    battleCommandView = "confirm";
    setBattleMessage(action.description);
    renderHud();
  }

  function chooseListedBattleAction(index) {
    const actionType = battleActionTypesForView(battleCommandView)[index];
    if (!actionType) {
      return;
    }

    chooseBattleAction(actionType);
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
    } else if (battleCommandView === "skillList" || battleCommandView === "magicList" || battleCommandView === "itemList") {
      chooseListedBattleAction(0);
    } else if (battleCommandView === "confirm") {
      confirmPendingBattleAction();
    }
  }

  function handleBattleSecondaryButton() {
    if (battleCommandView === "action") {
      openBattleSkillMenu();
    } else if (battleCommandView === "skillList" || battleCommandView === "magicList" || battleCommandView === "itemList") {
      chooseListedBattleAction(1);
    }
  }

  function handleBattleTertiaryButton() {
    if (battleCommandView === "action") {
      openBattleMagicMenu();
    } else if (battleCommandView === "skillList" || battleCommandView === "magicList" || battleCommandView === "itemList") {
      chooseListedBattleAction(2);
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
        await wait(BATTLE_TURN_PAUSE);
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
        await wait(BATTLE_TURN_PAUSE);
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

  async function executeBattleAction(type) {
    const action = getBattleActionInfo(type);
    if (!action) {
      return;
    }

    if (action.category === "item") {
      await playerUseHerb();
    } else if (action.category === "skill") {
      await playerPhysicalSkill(type);
    } else if (action.category === "magic" && action.effect === "damage") {
      await playerAttackMagic(type);
    } else if (action.category === "magic") {
      await playerHealingMagic(type);
    }
  }

  async function playerPhysicalSkill(type) {
    if (state.mode !== "battle" || isBattleBusy()) {
      return;
    }

    const action = getBattleActionInfo(type);
    if (!action || state.player.mp < action.mpCost) {
      addLog("MPが足りない。");
      render();
      return;
    }

    await runPlayerBattleAction(() => executePhysicalPlayerAction({
      label: action.name,
      attackMultiplier: action.attackMultiplier || 1,
      mpCost: action.mpCost,
      actionType: "skill",
    }), "skill");
  }

  async function playerFullSlash() {
    await playerPhysicalSkill("fullSlash");
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

  async function playerHealingMagic(type) {
    if (state.mode !== "battle" || isBattleBusy()) {
      return;
    }

    const action = getBattleActionInfo(type);
    if (!action) {
      return;
    }

    if (state.player.hp === state.player.maxHp) {
      addLog("HPは満タンだ。");
      render();
      return;
    }

    if (state.player.mp < action.mpCost) {
      addLog("MPが足りない。");
      render();
      return;
    }

    await runPlayerBattleAction(async () => {
      const healAmount = calculateMagicHeal(state.player, action.healMultiplier || 1);
      const before = state.player.hp;
      state.player.mp = clamp(state.player.mp - action.mpCost, 0, state.player.maxMp);
      state.player.hp = clamp(state.player.hp + healAmount, 0, state.player.maxHp);
      const recovered = state.player.hp - before;
      addLog(`${action.name}の魔法を唱えた。HPが${recovered}回復。`);
      playHealSound();
      await playEffect({ type: "heal", amount: recovered }, EFFECT_DURATIONS.heal);
    }, "magic");
  }

  async function playerHeal() {
    await playerHealingMagic("heal");
  }

  async function playerAttackMagic(type) {
    if (state.mode !== "battle" || isBattleBusy()) {
      return;
    }

    const action = getBattleActionInfo(type);
    if (!action || state.player.mp < action.mpCost) {
      addLog("MPが足りない。");
      render();
      return;
    }

    await runPlayerBattleAction(async () => {
      const enemy = state.battle.enemy;
      state.player.mp = clamp(state.player.mp - action.mpCost, 0, state.player.maxMp);
      const result = calculateMagicDamage(state.player, enemy, action);
      playMagicSound();
      await playEffect({ type: "magicAttack", damage: result.damage }, EFFECT_DURATIONS.magicAttack);

      enemy.hp = clamp(enemy.hp - result.damage, 0, enemy.maxHp);
      addLog(`${action.name}を唱えた。${enemy.name}に${result.damage}ダメージ。`);

      if (enemy.hp <= 0) {
        playDefeatSound();
        await playEffect({ type: "defeat" }, EFFECT_DURATIONS.defeat);
        await finishBattle(enemy);
        return;
      }

      render();
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
      await wait(BATTLE_TURN_PAUSE);
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
      await wait(BATTLE_TURN_PAUSE);
      handlePlayerDefeat();
      return;
    }

    render();
  }

  async function finishBattle(enemy) {
    const wasTutorialBattle = Boolean(enemy.tutorial && state.tutorial?.active);
    const battleMeta = {
      bossId: state.battle?.bossId || null,
      victorySpeaker: state.battle?.victorySpeaker || enemy.name,
      victoryMessage: state.battle?.victoryMessage || "",
    };
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
        ...result.learned.map((action) => `${battleActionKindLabel(action)}「${action.name}」を覚えた！`),
      ].join("\n"));
    }

    if (battleMeta.bossId) {
      state.defeatedBosses[battleMeta.bossId] = true;
    }

    state.mode = "explore";
    state.battle = null;
    battleCommandView = "root";
    render();

    if (battleMeta.bossId && battleMeta.victoryMessage) {
      await say(battleMeta.victorySpeaker, battleMeta.victoryMessage);
    }

    if (wasTutorialBattle) {
      await runPostTutorialSequence();
    }
  }

  function battleActionKindLabel(action) {
    return action.category === "skill" ? "特技" : "魔法";
  }

  function learnedActionsBetween(beforeLevel, afterLevel) {
    return Object.values(BATTLE_ACTION_DETAILS)
      .filter((action) => {
        return (
          (action.category === "skill" || action.category === "magic") &&
          action.minLevel > beforeLevel &&
          action.minLevel <= afterLevel
        );
      });
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
      state.player.hp = clamp(state.player.hp + (state.player.maxHp - before.maxHp), 0, state.player.maxHp);
      state.player.mp = clamp(state.player.mp + (state.player.maxMp - before.maxMp), 0, state.player.maxMp);
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
        learned: learnedActionsBetween(before.level, state.player.level),
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
      audioContext.resume().catch(() => {});
    }

    return audioContext;
  }

  function unlockAudio() {
    const audio = getAudioContext();
    if (audio?.state === "suspended") {
      audio.resume().catch(() => {});
    }
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
    playTone(420, 0, 0.16, "sine", 0.075);
    playTone(640, 0.11, 0.2, "sine", 0.085);
    playTone(860, 0.24, 0.22, "sine", 0.07);
  }

  function playMagicSound() {
    playTone(330, 0, 0.13, "triangle", 0.07);
    playTone(740, 0.09, 0.15, "square", 0.075);
    playTone(990, 0.22, 0.14, "sawtooth", 0.055);
  }

  function playItemSound() {
    playTone(660, 0, 0.1, "square", 0.065);
    playTone(880, 0.1, 0.12, "square", 0.07);
  }

  function playRunSound() {
    playTone(260, 0, 0.1, "triangle", 0.065);
    playTone(210, 0.12, 0.1, "triangle", 0.055);
  }

  function playDefeatSound() {
    playTone(560, 0, 0.12, "triangle", 0.08);
    playTone(280, 0.13, 0.24, "triangle", 0.08);
  }

  function playLevelUpSound() {
    playTone(523, 0, 0.16, "square", 0.075);
    playTone(659, 0.13, 0.16, "square", 0.075);
    playTone(784, 0.26, 0.18, "square", 0.085);
    playTone(1046, 0.44, 0.32, "triangle", 0.09);
    playTone(1318, 0.56, 0.24, "sine", 0.06);
  }

  function playInnSound() {
    playTone(392, 0, 0.28, "sine", 0.065);
    playTone(523, 0.26, 0.32, "sine", 0.07);
    playTone(659, 0.56, 0.36, "sine", 0.065);
    playTone(523, 0.94, 0.4, "triangle", 0.055);
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
      defeatedBosses: state.defeatedBosses,
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

  function loadGame(options = {}) {
    let payload;

    try {
      payload = JSON.parse(localStorage.getItem(SAVE_KEY));
    } catch (error) {
      console.error(error);
      if (options.fromTitle) {
        showTitleNotice("ロードデータを読めなかった。");
      } else {
        showFieldMessage("", "ロードデータを読めなかった。");
      }
      return false;
    }

    if (!isValidSave(payload)) {
      if (options.fromTitle) {
        showTitleNotice("ロードデータが見つからない。");
      } else {
        showFieldMessage("", "ロードデータが見つからない。");
      }
      return false;
    }

    const loadedLevel = payload.player.level;
    const statDefaults = defaultBattleStats(loadedLevel);
    const isLegacyStats = !Number.isFinite(payload.player.defense);
    const loadedMaxMp = Number.isFinite(payload.player.maxMp) ? payload.player.maxMp : 10;
    const loadedMp = Number.isFinite(payload.player.mp) ? payload.player.mp : loadedMaxMp;
    const savedHerb = payload.player.inventory?.herb;
    const loadedInventory = {
      herb: Number.isFinite(savedHerb) ? Math.max(0, savedHerb) : 1,
      equipment: payload.player.inventory?.equipment || {},
      keyItems: payload.player.inventory?.keyItems || {},
    };
    const loadedGear = {
      weapon: EQUIPMENT_ITEMS[payload.player.gear?.weapon] ? payload.player.gear.weapon : null,
      armor: EQUIPMENT_ITEMS[payload.player.gear?.armor] ? payload.player.gear.armor : null,
      accessory: EQUIPMENT_ITEMS[payload.player.gear?.accessory] ? payload.player.gear.accessory : null,
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
        gear: loadedGear,
        inventory: loadedInventory,
      },
      npcTalkIndex: payload.npcTalkIndex || {},
      openedChests: payload.openedChests || {},
      defeatedBosses: payload.defeatedBosses || {},
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
    if (hasEquippedGear(state.player)) {
      syncEquipmentStats();
    }
    hideTitleScreen();
    setBattleMessage("ロードした。");
    render();
    showFieldMessage("", "ロードした。");
    return true;
  }

  function isValidSave(payload) {
    if (!payload || ![1, 2, 3, 4, 5, 6].includes(payload.version)) {
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
    startNewGame({ confirm: true });
  }

  function draw() {
    const map = currentMap();
    const camera = getCamera();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < VIEW_ROWS; y += 1) {
      for (let x = 0; x < VIEW_COLS; x += 1) {
        const worldX = camera.x + x;
        const worldY = camera.y + y;
        drawTile(getTile(state.mapId, worldX, worldY), x, y);
      }
    }

    map.entities.forEach((entity) => drawEntity(entity, camera));
    drawPlayer(state.player.x - camera.x, state.player.y - camera.y);

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
    } else if (tile === "A") {
      ctx.fillStyle = "#3f7e4d";
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      drawGrassDetails(px, py, tile);
      ctx.fillStyle = "rgba(27, 70, 38, 0.45)";
      ctx.fillRect(px + 4, py + 5, 5, 9);
      ctx.fillRect(px + 22, py + 19, 4, 8);
    } else if (tile === "B") {
      ctx.fillStyle = "#5c5a63";
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "rgba(30, 31, 36, 0.18)";
      ctx.fillRect(px + 3, py + 8, 10, 3);
      ctx.fillRect(px + 18, py + 22, 9, 3);
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
    } else if (tile === "R") {
      ctx.fillStyle = "#3b3a42";
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "#57545f";
      ctx.fillRect(px + 2, py + 5, 11, 7);
      ctx.fillRect(px + 17, py + 18, 12, 8);
    } else if (tile === "M") {
      ctx.fillStyle = "#68685d";
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "#4d4e46";
      ctx.fillRect(px + 4, py + 9, 24, 18);
    } else if (tile === "W") {
      ctx.fillStyle = "#3e7da8";
      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      ctx.fillStyle = "rgba(217, 241, 255, 0.38)";
      ctx.fillRect(px + 2, py + 10, 14, 3);
      ctx.fillRect(px + 14, py + 22, 16, 3);
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

  function drawEntity(entity, camera) {
    if (isEntityGone(entity)) {
      return;
    }

    const screenX = entity.x - camera.x;
    const screenY = entity.y - camera.y;
    if (screenX < 0 || screenX >= VIEW_COLS || screenY < 0 || screenY >= VIEW_ROWS) {
      return;
    }

    if (entity.kind === "chest") {
      drawChest(entity, screenX, screenY);
      drawNameplate(isChestOpen(entity) ? "空" : entity.name, screenX, screenY);
      return;
    }

    if (entity.kind === "door") {
      drawBuilding(entity, screenX, screenY);
      return;
    }

    if (entity.kind === "shop" || entity.kind === "inn") {
      drawBuilding(entity, screenX, screenY);
      return;
    }

    if (entity.kind === "boss") {
      drawCharacter(screenX, screenY, entity.body || "#835b33", entity.hair || "#2f2a22");
      drawBossMark(screenX, screenY);
      return;
    }

    drawCharacter(screenX, screenY, entity.body, entity.hair);
    drawNameplate(entity.name, screenX, screenY);
  }

  function drawBuilding(entity, x, y) {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    const roofColor = entity.kind === "inn" ? "#b84f42" : entity.shopType === "equipment" ? "#6c6875" : "#7a6553";
    const wallColor = entity.kind === "door" ? "#d7ba7a" : "#c9ad79";

    ctx.fillStyle = "rgba(35, 45, 38, 0.22)";
    ctx.fillRect(px + 2, py + 27, 28, 4);
    ctx.fillStyle = roofColor;
    ctx.fillRect(px + 3, py + 5, 26, 9);
    ctx.fillStyle = wallColor;
    ctx.fillRect(px + 5, py + 13, 22, 16);
    ctx.fillStyle = "#5d3c28";
    ctx.fillRect(px + 13, py + 18, 7, 11);
    ctx.fillStyle = "#fffaf1";
    ctx.fillRect(px + 8, py + 15, 6, 5);
    ctx.fillRect(px + 19, py + 15, 5, 5);

    const label = entity.buildingLabel || entity.name;
    if (label) {
      ctx.save();
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const width = Math.max(24, ctx.measureText(label).width + 6);
      ctx.fillStyle = "#15191f";
      ctx.fillRect(px + 16 - width / 2, py + 1, width, 12);
      ctx.fillStyle = "#fffaf1";
      ctx.fillText(label, px + 16, py + 7);
      ctx.restore();
    }
  }

  function drawBossMark(x, y) {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
    ctx.fillStyle = "#e05a48";
    ctx.fillRect(px + 8, py + 3, 5, 5);
    ctx.fillRect(px + 19, py + 3, 5, 5);
  }

  function drawChest(chest, x, y) {
    const px = x * TILE_SIZE;
    const py = y * TILE_SIZE;
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
    const width = Math.max(30, ctx.measureText(name).width + 6);
    const left = px + 16 - width / 2;
    ctx.fillStyle = "rgba(24, 28, 25, 0.7)";
    ctx.fillRect(left, py - 1, width, 12);
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

    const listLabels = battleActionTypesForView(battleCommandView)
      .map((type) => getBattleActionInfo(type)?.name)
      .filter(Boolean);
    const menuLabels = {
      root: ["たたかう", "どうぐ", "にげる"],
      action: ["攻撃", "特技", "魔法", "戻る"],
      skillList: [...listLabels, "戻る"],
      magicList: [...listLabels, "戻る"],
      itemList: [...listLabels, "戻る"],
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
    } else if (effect.type === "magicAttack") {
      drawMagicAttackEffect(effect, centerX, centerY);
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

  function drawMagicAttackEffect(effect, centerX, centerY) {
    const progress = effect.progress;
    const travel = easeOutCubic(progress);
    const x = centerX - 130 + travel * 132;
    const y = centerY + 84 - travel * 92;
    const alpha = progress < 0.86 ? 1 : 1 - (progress - 0.86) / 0.14;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#f6b24a";
    ctx.fillRect(x - 11, y - 11, 22, 22);
    ctx.fillStyle = "#e05a48";
    ctx.fillRect(x - 7, y - 7, 14, 14);
    ctx.fillStyle = "#fff5c2";
    ctx.fillRect(x - 3, y - 3, 6, 6);
    ctx.restore();

    if (progress > 0.42) {
      drawFloatingText(`-${effect.damage}`, centerX, centerY - 56, progress, "#e05a48");
    }
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
    ui.equipmentValue.textContent = equipmentSummary(player);
    ui.mobileEquipmentValue.textContent = equipmentSummary(player);
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

    const listedActions = battleActionTypesForView(battleCommandView);
    let primaryChoice = "attack";
    let primaryLabel = "攻撃";
    let primaryHidden = false;
    let primaryDisabled = false;
    let secondaryChoice = "skill";
    let secondaryLabel = "特技";
    let secondaryHidden = false;
    let secondaryDisabled = false;
    let tertiaryChoice = "magic";
    let tertiaryLabel = "魔法";
    let tertiaryHidden = false;
    let tertiaryDisabled = false;
    let backChoice = "back";
    let backLabel = "戻る";
    let backDisabled = false;

    if (battleCommandView === "skillList" || battleCommandView === "magicList" || battleCommandView === "itemList") {
      const firstAction = getBattleActionInfo(listedActions[0]);
      const secondAction = getBattleActionInfo(listedActions[1]);
      const thirdAction = getBattleActionInfo(listedActions[2]);
      primaryChoice = listedActions[0] || "none";
      primaryLabel = listedActions[0] ? battleActionButtonLabel(listedActions[0]) : "なし";
      primaryHidden = !listedActions[0];
      primaryDisabled = !firstAction || firstAction.disabled;
      secondaryChoice = listedActions[1] || "none";
      secondaryLabel = listedActions[1] ? battleActionButtonLabel(listedActions[1]) : "";
      secondaryHidden = !listedActions[1];
      secondaryDisabled = !secondAction || secondAction.disabled;
      tertiaryChoice = listedActions[2] || "none";
      tertiaryLabel = listedActions[2] ? battleActionButtonLabel(listedActions[2]) : "";
      tertiaryHidden = !listedActions[2];
      tertiaryDisabled = !thirdAction || thirdAction.disabled;
    } else if (battleCommandView === "confirm") {
      primaryChoice = "confirmYes";
      primaryLabel = "はい";
      secondaryHidden = true;
      tertiaryHidden = true;
      backChoice = "confirmNo";
      backLabel = "いいえ";
    }

    setCommandButton(
      ui.attackButton,
      primaryChoice,
      primaryLabel,
      primaryHidden,
      isBattleChoiceDisabled(primaryChoice, controlsBusy, primaryDisabled),
    );
    setCommandButton(
      ui.skillButton,
      secondaryChoice,
      secondaryLabel,
      secondaryHidden,
      isBattleChoiceDisabled(secondaryChoice, controlsBusy, secondaryDisabled),
    );
    setCommandButton(
      ui.magicButton,
      tertiaryChoice,
      tertiaryLabel,
      tertiaryHidden,
      isBattleChoiceDisabled(tertiaryChoice, controlsBusy, tertiaryDisabled),
    );
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
      battleCommandView === "root" || primaryHidden,
      isBattleChoiceDisabled(primaryChoice, controlsBusy, primaryDisabled),
    );
    setCommandButton(
      ui.touchSkillButton,
      secondaryChoice,
      secondaryLabel,
      battleCommandView === "root" || secondaryHidden,
      isBattleChoiceDisabled(secondaryChoice, controlsBusy, secondaryDisabled),
    );
    setCommandButton(
      ui.touchMagicButton,
      tertiaryChoice,
      tertiaryLabel,
      battleCommandView === "root" || tertiaryHidden,
      isBattleChoiceDisabled(tertiaryChoice, controlsBusy, tertiaryDisabled),
    );
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

    if (ui.mobileMenuPanel && !ui.mobileMenuPanel.hidden) {
      renderMobileMenu();
    }
  }

  function render() {
    draw();
    renderHud();
  }

  function getCamera() {
    const maxX = Math.max(0, mapWidth() - VIEW_COLS);
    const maxY = Math.max(0, mapHeight() - VIEW_ROWS);
    return {
      x: clamp(state.player.x - Math.floor(VIEW_COLS / 2), 0, maxX),
      y: clamp(state.player.y - Math.floor(VIEW_ROWS / 2), 0, maxY),
    };
  }

  function handleKeyDown(event) {
    unlockAudio();

    if (BLOCKED_KEYS.has(event.key)) {
      event.preventDefault();
    }

    if (titleScreenVisible) {
      return;
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
          handleBattleSecondaryButton();
        } else if (event.key === "3") {
          handleBattleTertiaryButton();
        } else if (event.key === "4" || event.key === "Escape") {
          handleBattleBackButton();
        }
      } else if (battleCommandView === "skillList" || battleCommandView === "magicList" || battleCommandView === "itemList") {
        if (event.key === "1" || event.key === "Enter") {
          handleBattlePrimaryButton();
        } else if (event.key === "2") {
          handleBattleSecondaryButton();
        } else if (event.key === "3") {
          handleBattleTertiaryButton();
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
    if (!direction || event.currentTarget.disabled) {
      return;
    }

    event.preventDefault();
    stopTouchMove();
    touchMovePointerId = event.pointerId;
    touchMoveDirection = direction;

    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    movePlayer(direction.x, direction.y);

    const repeatMove = () => {
      if (!touchMoveDirection || state.mode !== "explore" || isInputLocked()) {
        stopTouchMove();
        return;
      }

      movePlayer(touchMoveDirection.x, touchMoveDirection.y);
    };

    touchMoveTimer = window.setTimeout(() => {
      repeatMove();
      touchMoveInterval = window.setInterval(repeatMove, TOUCH_HOLD_REPEAT_DELAY);
    }, TOUCH_HOLD_INITIAL_DELAY);
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

  function stopTouchMove(event) {
    if (event?.pointerId && touchMovePointerId !== null && event.pointerId !== touchMovePointerId) {
      return;
    }

    if (touchMoveTimer) {
      window.clearTimeout(touchMoveTimer);
      touchMoveTimer = null;
    }

    if (touchMoveInterval) {
      window.clearInterval(touchMoveInterval);
      touchMoveInterval = null;
    }

    touchMovePointerId = null;
    touchMoveDirection = null;
  }

  function bindEvents() {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("pointerup", stopTouchMove);
    window.addEventListener("pointercancel", stopTouchMove);
    window.addEventListener("blur", stopTouchMove);
    ui.titleNewGameButton.addEventListener("click", () => {
      unlockAudio();
      startNewGame({ confirm: false });
    });
    ui.titleContinueButton.addEventListener("click", () => {
      unlockAudio();
      loadGame({ fromTitle: true });
    });
    ui.titleHowToButton.addEventListener("click", toggleHowTo);
    ui.interactButton.addEventListener("click", interact);
    ui.fightButton.addEventListener("click", openBattleActionMenu);
    ui.attackButton.addEventListener("click", handleBattlePrimaryButton);
    ui.skillButton.addEventListener("click", handleBattleSecondaryButton);
    ui.magicButton.addEventListener("click", handleBattleTertiaryButton);
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
    ui.mobileStatusTab.addEventListener("click", () => setMobileMenuTab("status"));
    ui.mobileItemsTab.addEventListener("click", () => setMobileMenuTab("items"));
    ui.itemEquipmentTab.addEventListener("click", () => setItemCategory("equipment"));
    ui.itemToolsTab.addEventListener("click", () => setItemCategory("tools"));
    ui.itemKeyTab.addEventListener("click", () => setItemCategory("key"));
    ui.itemUseButton.addEventListener("click", useSelectedInventoryItem);
    ui.itemDropButton.addEventListener("click", dropSelectedInventoryItem);
    ui.itemBackButton.addEventListener("click", clearInventorySelection);
    ui.touchInteractButton.addEventListener("click", handleTouchAction);
    ui.touchFightButton.addEventListener("click", openBattleActionMenu);
    ui.touchAttackButton.addEventListener("click", handleBattlePrimaryButton);
    ui.touchSkillButton.addEventListener("click", handleBattleSecondaryButton);
    ui.touchMagicButton.addEventListener("click", handleBattleTertiaryButton);
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
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    });
  }

  validateMaps();
  bindEvents();
  render();
  window.setTimeout(() => {
    if (!titleScreenVisible && !localStorage.getItem(SAVE_KEY)) {
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
