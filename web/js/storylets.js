/* storylets.js - 스토리릿 시스템 (조건부 미니 이벤트) */

const STORYLETS = [
  {
    id: 'sl_merchant', name: '수상한 행상인',
    conditions: [{ level_gte: 3 }],
    locations: ['forest', 'ruins', 'cave'],
    chance: 0.12, repeatable: false,
    actions: [
      { action: 'print', text: '길가에 보따리를 펼친 수상한 행상인이 눈에 띈다.' },
      { action: 'print', text: '"여기서 만나다니, 운이 좋군! 특별한 물건이 있다네."' },
      { action: 'menu', options: [
        { label: '물건을 살펴본다', actions: [
          { action: 'print', text: '행상인이 묘한 미소와 함께 작은 병을 내민다.' },
          { action: 'if', cond: { gold_gte: 80 }, then: [
            { action: 'print', text: '"이 비약은 80G야. 마시면 힘이 솟을걸?"' },
            { action: 'menu', options: [
              { label: '구매한다 (80G)', actions: [
                { action: 'sub_gold', amount: 80 },
                { action: 'add_stat', attack: 2, message: true },
                { action: 'print', text: '공격력이 영구적으로 상승했다!' },
              ]},
              { label: '거절한다', actions: [
                { action: 'print', text: '"다음에 또 보자고."' },
              ]},
            ]},
          ], else: [
            { action: 'print', text: '"하지만 자네 주머니 사정이 좀..." 행상인이 혀를 찼다.' },
          ]},
        ]},
        { label: '무시하고 지나간다', actions: [
          { action: 'print', text: '의심스러운 눈빛으로 그를 지나쳤다.' },
        ]},
      ]},
    ],
  },
  {
    id: 'sl_dark_whisper', name: '어둠의 속삭임',
    conditions: [{ dark_gte: 5 }],
    locations: null, chance: 0.1, repeatable: false,
    actions: [
      { action: 'print', text: '갑자기 머릿속에 차가운 목소리가 울려퍼진다.' },
      { action: 'print', text: '"그래... 어둠에 물들어가는 것이 느껴지는군..."' },
      { action: 'menu', options: [
        { label: '어둠에 귀를 기울인다', actions: [
          { action: 'add_dark', amount: 3 },
          { action: 'add_stat', attack: 3, message: true },
          { action: 'print', text: '어둠의 힘이 몸에 스며들었다. 공격력이 올라갔지만...' },
        ]},
        { label: '저항한다', actions: [
          { action: 'sub_dark', amount: 2 },
          { action: 'print', text: '이를 악물고 목소리를 밀어냈다. 어둠 점수가 줄어들었다.' },
        ]},
      ]},
    ],
  },
  {
    id: 'sl_lost_diary', name: '잃어버린 일기',
    conditions: [{ has_item: '지도 조각' }],
    locations: ['cave', 'ruins'], chance: 0.15, repeatable: false,
    actions: [
      { action: 'print', text: '바닥에 낡은 일기장이 놓여 있다. 지도 조각과 같은 문양이 새겨져 있다.' },
      { action: 'print', text: '일기를 펼치니 고대 유적의 비밀이 적혀 있다.' },
      { action: 'print', text: '"...이 땅의 마왕은 본래 인간이었으니..."' },
      { action: 'set_flag', key: 'lore_diary_found', value: true },
      { action: 'add_item', item: '고대의 기록' },
    ],
  },
  {
    id: 'sl_spirit_blessing', name: '정령의 축복',
    conditions: [{ flag: 'elf_village_visited' }],
    locations: ['elf_village', 'moonlight_lake'], chance: 0.1, repeatable: false,
    actions: [
      { action: 'print', text: '작은 빛의 정령이 나타나 주위를 맴돈다.' },
      { action: 'print', text: '"당신의 선한 마음을 느꼈어요. 작은 선물을 드릴게요."' },
      { action: 'heal', amount: 'full' },
      { action: 'add_stat', max_hp: 10, message: true },
      { action: 'print', text: 'HP가 완전히 회복되고, 최대 HP가 영구적으로 10 증가했다!' },
    ],
  },
  {
    id: 'sl_merc_challenge', name: '용병의 도전',
    conditions: [{ level_gte: 8 }],
    locations: null, chance: 0.08, repeatable: false,
    actions: [
      { action: 'print', text: '낯선 용병이 길을 막아섰다.' },
      { action: 'print', text: '"네가 소문난 모험가인가? 한판 붙어보지!"' },
      { action: 'menu', options: [
        { label: '도전을 받아들인다', actions: [
          { action: 'battle', enemy: 'bandit', on_win: [
            { action: 'print', text: '"대단하군! 이걸 받아라."' },
            { action: 'add_gold', amount: 120 },
            { action: 'add_item', item: '중형 포션' },
          ], on_lose: [
            { action: 'print', text: '"약하군... 더 강해져서 다시 오게."' },
            { action: 'heal', amount: 20, message: false },
          ]},
        ]},
        { label: '거절한다', actions: [
          { action: 'print', text: '"겁쟁이로군." 용병이 비웃으며 떠났다.' },
        ]},
      ]},
    ],
  },
  {
    id: 'sl_moonlight_secret', name: '달빛 호수의 비밀',
    conditions: [{ flag: 'moonlight_lake_visited' }],
    locations: ['moonlight_lake'], chance: 0.12, repeatable: false,
    actions: [
      { action: 'print', text: '달빛이 호수 위에서 유독 밝게 빛나고 있다.' },
      { action: 'print', text: '수면 아래에서 무언가 은은하게 빛나는 것이 보인다.' },
      { action: 'menu', options: [
        { label: '물속을 살펴본다', actions: [
          { action: 'print', text: '호수 바닥에서 빛나는 보석을 발견했다!' },
          { action: 'add_item', item: '달빛 보석' },
          { action: 'add_gold', amount: 200 },
        ]},
        { label: '그냥 지나간다', actions: [
          { action: 'print', text: '호기심을 억누르고 발걸음을 돌렸다.' },
        ]},
      ]},
    ],
  },
  {
    id: 'sl_old_warrior', name: '노병의 가르침',
    conditions: [{ level_gte: 5 }],
    locations: ['town'], chance: 0.1, repeatable: false,
    actions: [
      { action: 'print', text: '주점 한구석에서 은퇴한 노병이 술잔을 기울이고 있다.' },
      { action: 'print', text: '"젊은이, 전투의 요령을 좀 알려주지."' },
      { action: 'add_stat', defense: 2, message: true },
      { action: 'print', text: '노병의 조언 덕분에 방어력이 상승했다!' },
    ],
  },
  {
    id: 'sl_treasure_chest', name: '숨겨진 보물상자',
    conditions: [{ level_gte: 3 }],
    locations: ['forest', 'cave', 'ruins', 'desert'], chance: 0.08, repeatable: false,
    actions: [
      { action: 'print', text: '길 옆 수풀 사이에서 먼지 쌓인 보물상자를 발견했다!' },
      { action: 'menu', options: [
        { label: '열어본다', actions: [
          { action: 'random', branches: [
            { weight: 3, actions: [
              { action: 'print', text: '상자 안에서 금화를 발견했다!' },
              { action: 'add_gold', amount: 60 },
            ]},
            { weight: 2, actions: [
              { action: 'print', text: '포션이 들어있었다!' },
              { action: 'add_item', item: '중형 포션' },
            ]},
            { weight: 1, actions: [
              { action: 'print', text: '함정이었다! 작은 폭발이 일어났다!' },
              { action: 'damage', amount: 15 },
            ]},
          ]},
        ]},
        { label: '무시한다', actions: [
          { action: 'print', text: '함정일 수 있다고 생각하고 지나쳤다.' },
        ]},
      ]},
    ],
  },
  {
    id: 'sl_fairy_ring', name: '요정의 고리',
    conditions: [],
    locations: ['forest', 'elf_village'], chance: 0.07, repeatable: false,
    actions: [
      { action: 'print', text: '버섯으로 이루어진 신비로운 원형이 나타났다.' },
      { action: 'print', text: '따뜻한 빛이 원 안에서 피어오른다.' },
      { action: 'menu', options: [
        { label: '원 안으로 들어간다', actions: [
          { action: 'heal', amount: 'full' },
          { action: 'print', text: '몸이 따뜻해지며 모든 상처가 치유되었다!' },
          { action: 'set_flag', key: 'fairy_blessing', value: true },
        ]},
        { label: '조심해서 돌아간다', actions: [
          { action: 'print', text: '요정의 장난일지도 모른다고 생각하며 물러섰다.' },
        ]},
      ]},
    ],
  },
  {
    id: 'sl_wounded_soldier', name: '부상당한 병사',
    conditions: [{ has_item: '소형 포션' }],
    locations: ['town', 'forest', 'castle_gate'], chance: 0.1, repeatable: false,
    actions: [
      { action: 'print', text: '길가에 부상당한 병사가 쓰러져 있다.' },
      { action: 'print', text: '"제발... 물이라도..."' },
      { action: 'menu', options: [
        { label: '소형 포션을 준다', actions: [
          { action: 'remove_item', item: '소형 포션' },
          { action: 'print', text: '"고맙습니다... 이것은 제가 가진 것인데 받아주세요."' },
          { action: 'add_gold', amount: 40 },
          { action: 'sub_dark', amount: 1 },
          { action: 'print', text: '선한 행동에 어둠이 조금 물러났다.' },
        ]},
        { label: '무시하고 지나간다', actions: [
          { action: 'add_dark', amount: 1 },
          { action: 'print', text: '병사의 신음 소리가 등 뒤에서 들려왔다.' },
        ]},
      ]},
    ],
  },
  {
    id: 'sl_herb_spot', name: '약초 군락지',
    conditions: [{ level_gte: 2 }],
    locations: ['forest', 'swamp'], chance: 0.1, repeatable: false,
    actions: [
      { action: 'print', text: '무성한 풀밭 사이에서 빛나는 약초를 발견했다!' },
      { action: 'add_item', item: '소형 포션' },
      { action: 'add_item', item: '소형 포션' },
      { action: 'print', text: '약초로 포션 2개를 만들었다!' },
    ],
  },
  {
    id: 'sl_dark_altar', name: '어둠의 제단',
    conditions: [{ dark_gte: 3 }],
    locations: ['ruins', 'dark_tower', 'castle_inside'], chance: 0.09, repeatable: false,
    actions: [
      { action: 'print', text: '금이 간 어둠의 제단이 검은 빛을 내뿜고 있다.' },
      { action: 'menu', options: [
        { label: '어둠에 기도한다', actions: [
          { action: 'add_dark', amount: 5 },
          { action: 'add_stat', attack: 5, message: true },
          { action: 'print', text: '어둠의 힘이 급격히 흘러들어온다! 공격력이 크게 올랐지만 어둠이 깊어졌다...' },
        ]},
        { label: '제단을 파괴한다', actions: [
          { action: 'sub_dark', amount: 3 },
          { action: 'add_stat', defense: 2, message: true },
          { action: 'print', text: '제단을 부수자 정화의 빛이 퍼졌다. 어둠이 물러나고 방어력이 올랐다.' },
        ]},
        { label: '무시한다', actions: [
          { action: 'print', text: '위험한 물건이라 판단하고 조용히 지나갔다.' },
        ]},
      ]},
    ],
  },
];

const StoryletManager = {
  checkAndTrigger(player) {
    const eligible = STORYLETS.filter(sl => {
      if (!sl.repeatable && player.seenStorylets.includes(sl.id)) return false;
      if (sl.locations && sl.locations.length > 0) {
        if (!sl.locations.includes(player.currentLocation)) return false;
      }
      if (sl.conditions && sl.conditions.length > 0) {
        if (!EventEngine.checkCondition(sl.conditions, player)) return false;
      }
      if (Math.random() >= (sl.chance || 0.1)) return false;
      return true;
    });
    if (eligible.length === 0) return null;
    return eligible[Math.floor(Math.random() * eligible.length)];
  },

  async trigger(storylet, player) {
    player.seenStorylets.push(storylet.id);
    UI.showToast(`📖 ${storylet.name}`, 'toast-storylet');
    await new Promise(r => setTimeout(r, 600));
    return await EventEngine.runActions(storylet.actions, player, {});
  },
};
