// 결혼식 음악 테스트 (신랑 입장곡, 신부 입장곡, 행진곡, 축가). 공통 기능은 shared/common.js

// ===== 공개 설정 ==========================================
// 공개할 테스트만 아래 [ ] 안에 적으세요. 저장하면 1~2분 뒤 반영돼요.
//   신랑만        →  ["groom"]
//   신랑 + 신부   →  ["groom", "bride"]
//   전부 공개     →  ["groom", "bride", "march", "serenade"]   (serenade = 축가)
const OPEN = ["groom", "bride"];
// =========================================================

// ※ 신부 입장곡·행진곡·축가 릴스 링크는 shared/common.js 맨 위 "사이트 목록"에 넣어요.

// ===== 데이터: 질문, 결과, 곡 목록 (곡을 바꾸려면 여기만 고치면 돼요) =====
const DATA = {
 "groom": {
  "label": "신랑 입장곡",
  "call": "신랑, 입장!",
  "next": [
   "bride",
   "march",
   "serenade"
  ],
  "questions": [
   {
    "q": "문이 열리고 신랑 등장!\n하객들 첫마디는?",
    "a": "“와… 멋있다”",
    "b": "“ㅋㅋ 귀엽다”"
   },
   {
    "q": "버진로드를 걷는\n신랑의 걸음은?",
    "a": "리듬 타며 여유롭게",
    "b": "당당하게 성큼성큼"
   },
   {
    "q": "둘이 쉬는 날엔\n주로 뭐 해요?",
    "a": "영화·애니·게임 정주행",
    "b": "드라이브하며 노래 듣기"
   },
   {
    "q": "친구들 사이에서\n신랑은?",
    "a": "분위기 메이커",
    "b": "묵묵히 챙기는 사람"
   },
   {
    "q": "오늘 입장을\n영화로 치면?",
    "a": "히어로 액션",
    "b": "로맨틱 코미디"
   },
   {
    "q": "입장곡은\n어떤 노래가 좋아요?",
    "a": "요즘 핫한 노래",
    "b": "다들 아는 명곡"
   }
  ],
  "types": {
   "hero": {
    "name": "영화 주인공형",
    "line": "등장은 웅장하게, 걸음은 당당하게",
    "desc": "하객이 숨죽이고 보는 영화 오프닝 같은 입장이 어울려요.",
    "songs": [
     [
      "Departure",
      "Sato Naoki"
     ],
     [
      "This Is Me",
      "위대한 쇼맨 OST"
     ],
     [
      "Legends Never Die",
      "리그 오브 레전드"
     ]
    ],
    "tip": "웅장한 곡은 인트로가 길어요. “신랑, 입장!”을 외치는 순간 곡이 가장 크게 터지도록, 앞에 전주 부분에는 사회자가 멘트를 하는게 좋아요.",
    "link": "https://drive.google.com/drive/folders/1U6c4n04X41zyWO9fZsYYap9_Uqd7j65A?usp=sharing"  // 링크1  ← "" 안에 구글 드라이브 링크를 붙여넣으세요. 비워 두면 버튼이 안 보여요.
   },
   "energy": {
    "name": "에너지 폭발형",
    "line": "박수는 크게, 환호는 높게",
    "desc": "버진로드가 무대가 돼요. 하객 박수가 저절로 따라 나오는 입장이에요.",
    "songs": [
     [
      "Walking The Wire",
      "Imagine Dragons"
     ],
     [
      "Beautiful Things",
      "Benson Boone"
     ],
     [
      "Viva La Vida",
      "Coldplay"
     ]
    ],
    "tip": "박자가 뚜렷해서 박수 유도가 잘 되는 곡이에요. 노래가 터질 때 입장하면 더 큰 박수 유도를 할 수 있어요.",
    "link": "https://drive.google.com/drive/folders/1s0m8LNaw05jFZuyRWyUgmlkDmKLy-3FL?usp=sharing"  // 링크2
   },
   "gentle": {
    "name": "젠틀맨형",
    "line": "걸음은 여유롭게, 미소는 부드럽게",
    "desc": "서두르지 않는 걸음, 살짝 리듬 타는 어깨. 세련된 신랑이에요.",
    "songs": [
     [
      "I Like Me Better",
      "Lauv"
     ],
     [
      "I Was Born To Love You",
      "Queen"
     ],
     [
      "Feeling Good",
      "Michael Bublé"
     ]
    ],
    "tip": "그루브 있는 곡은 빨리 걸으면 어색해요. 한 박에 한 걸음 걷는다고 생각하고 천천히 걷는 것을 추천해요.",
    "link": "https://drive.google.com/drive/folders/1I0zJDY1-Eb6Pz8d-X7uGcH-CvzbBWQHM?usp=sharing"  // 링크3
   },
   "kpop": {
    "name": "K-감성형",
    "line": "가사는 또렷하게, 마음은 따뜻하게",
    "desc": "가사 한 줄이 하객 마음에 바로 닿는, 담백하고 진심 어린 입장이에요.",
    "songs": [
     [
      "Welcome to the Show",
      "DAY6"
     ],
     [
      "By Your Side",
      "Crush"
     ],
     [
      "Starlight",
      "태일"
     ]
    ],
    "tip": "가사가 들리는 곡은 사회자 멘트와 겹치면 둘 다 묻혀요. 입장 멘트가 끝난 뒤에 가사가 시작되도록 앞부분은 편집을 추천해요.",
    "link": "https://drive.google.com/drive/folders/1xXPrKS-YcZ5ld3M8hskHUYsbGJm8b6_n?usp=sharing"  // 링크4
   },
   "fun": {
    "name": "반전 웃음형",
    "line": "등장은 웃기게, 하객은 즐겁게",
    "desc": "첫 소절에 하객이 빵 터지는 입장이라 식장 긴장이 한 번에 풀려요.",
    "songs": [
     [
      "Come And Get Your Love",
      "가디언즈 오브 갤럭시 OST"
     ],
     [
      "Narco",
      "Blasterjaxx & Timmy Trumpet"
     ],
     [
      "Butter-Fly",
      "전영호 (디지몬 OST)"
     ]
    ],
    "tip": "웃긴 곡은 첫 소절이 전부예요. 인트로 없이 터지는 부분부터 시작하세요😊",
    "link": "https://drive.google.com/drive/folders/1KYlhke6-npjoOPO-N-G5PkEFTq5nGSao?usp=sharing"  // 링크5
   }
  }
 },
 "bride": {
  "label": "신부 입장곡",
  "call": "신부, 입장~",
  "next": [
   "groom",
   "march",
   "serenade"
  ],
  "questions": [
   {
    "q": "문이 열리는 순간,\n하객들 마음은?",
    "a": "“눈물 날 것 같아…”",
    "b": "“어머, 너무 사랑스러워!”"
   },
   {
    "q": "오늘의 신부는?",
    "a": "동화 속 공주님",
    "b": "영화 속 여주인공"
   },
   {
    "q": "입장곡에서\n더 중요한 건?",
    "a": "마음을 전하는 가사",
    "b": "분위기를 채우는 멜로디"
   },
   {
    "q": "꼭 들어갔으면\n하는 소리는?",
    "a": "종소리·합창·오케스트라",
    "b": "피아노·기타 잔잔한 반주"
   },
   {
    "q": "입장곡은\n어떤 노래가 좋아요?",
    "a": "요즘 노래",
    "b": "오래 사랑받은 명곡"
   },
   {
    "q": "하객들이 이 노래를\n들으면?",
    "a": "‘아, 그 시절!’ 추억 소환",
    "b": "‘이 노래 뭐야?’ 새롭게 반함"
   }
  ],
  "types": {
   "princess": {
    "name": "디즈니 공주형",
    "line": "드레스는 반짝, 하객은 깜짝",
    "desc": "오케스트라가 깔리는 순간, 식장이 동화 속 무도회장이 돼요.",
    "songs": [
     [
      "True Love’s Kiss",
      "마법에 걸린 사랑 OST"
     ],
     [
      "So This Is Love",
      "신데렐라 OST"
     ],
     [
      "Strong",
      "Sonna Rele (신데렐라 OST)"
     ]
    ],
    "tip": "디즈니 곡은 앞부분 대사나 효과음이 길 수 있어요. 문이 열리는 순간 멜로디가 바로 나오게 편집하면 “와” 소리가 정확히 그때 나와요.",
    "link": "https://drive.google.com/drive/folders/1AZjgWupkRCmTaacWEpe1_gxx170-TeaQ?usp=sharing"  // 링크신부1
   },
   "sacred": {
    "name": "성스러운 순간형",
    "line": "종은 울리고, 식장은 고요하고",
    "desc": "합창과 종소리가 흐르면 하객 모두 숨을 고르는, 가장 경건한 입장이에요.",
    "songs": [
     [
      "Angel",
      "Libera"
     ],
     [
      "Chagall’s Dream",
      "포레스텔라"
     ],
     [
      "Canon in D",
      "Pachelbel"
     ]
    ],
    "tip": "앞에 종소리를 넣어 하객의 시선을 모으면, 입장이 더 극적으로 느껴져요.",
    "link": "https://drive.google.com/drive/folders/1diWWv6VJ-rdihnYW_TEYryI-tK1sVB-6?usp=sharing"  // 링크신부2
   },
   "lovely": {
    "name": "러블리 K-감성형",
    "line": "걸음마다 설렘, 가사마다 고백",
    "desc": "한국어 가사가 신부 마음을 대신 고백해 주는, 사랑스러운 입장이에요.",
    "songs": [
     [
      "love love love",
      "백예린"
     ],
     [
      "Je T’aime",
      "조이"
     ],
     [
      "L’Amour, Les Baguettes, Paris",
      "스텔라장"
     ]
    ],
    "tip": "가사가 신부 마음을 대신해 주는 곡이에요. 가사가 잘 들리도록 웨딩홀에 음량을 키워달라고 미리 요청하세요.",
    "link": "https://drive.google.com/drive/folders/17lUZAT9gPcSolYW3a5fTEbCIIffaecbO?usp=sharing"  // 링크신부3
   },
   "pop": {
    "name": "로맨틱 팝송형",
    "line": "목소리는 잔잔하게, 마음은 먹먹하게",
    "desc": "기타와 피아노 위로 흐르는 러브송. 담백한데 오래 남는 입장이에요.",
    "songs": [
     [
      "Until I Found You",
      "Stephen Sanchez"
     ],
     [
      "A Thousand Years",
      "Christina Perri"
     ],
     [
      "Ready For Love",
      "Kelly Sweet"
     ]
    ],
    "tip": "잔잔한 곡은 버진로드가 길면 중간이 늘어질 수 있어요. 식장 길이에 맞춰 후렴이 버진로드 중간쯤 오도록 편집하세요. 앞부분을 잘라내고 음원 하이라이트 부분에서 입장하는 것도 좋은 방법이에요.",
    "link": "https://drive.google.com/drive/folders/1Gm_og3B3obq1Wnqws8vkthpIPmZK-vt4?usp=sharing"  // 링크신부4
   },
   "drama": {
    "name": "드라마 여주인공형",
    "line": "장면은 아련하게, 기억은 선명하게",
    "desc": "옛 영화 속 한 장면처럼, 하객들 추억까지 불러오는 입장이에요.",
    "songs": [
     [
      "Be There For You",
      "My Unicorn Girl OST"
     ],
     [
      "Beautiful in White",
      "Shania Yan"
     ],
     [
      "A Lover’s Concerto",
      "진혜림"
     ]
    ],
    "tip": "익숙한 명곡은 하객이 첫 소절에 알아봐요. 문이 열리는 순간 첫 소절이 나오게 맞추면 하객의 반응을 더 크게 유도할 수 있어요.",
    "link": "https://drive.google.com/drive/folders/1PzsYEHvQXsZ7hkba0ucu5XMVxOWtMD5A?usp=sharing"  // 링크신부5
   }
  }
 },
 "march": {
  "label": "행진곡",
  "call": "신랑 신부, 행진!",
  "next": [
   "groom",
   "bride",
   "serenade"
  ],
  "questions": [
   {
    "q": "행진할 때\n하객들은?",
    "a": "다 같이 박수치며 떼창",
    "b": "흐뭇하게 바라보며 박수"
   },
   {
    "q": "행진곡에서\n더 중요한 건?",
    "a": "마음을 전하는 가사",
    "b": "분위기를 띄우는 사운드"
   },
   {
    "q": "두 사람의 걸음은?",
    "a": "손 흔들며 신나게",
    "b": "눈 맞추며 천천히"
   },
   {
    "q": "행진곡은\n어떤 노래가 좋아요?",
    "a": "요즘 노래",
    "b": "추억의 명곡"
   },
   {
    "q": "행진을 한 장면으로\n치면?",
    "a": "뮤지컬 피날레",
    "b": "콘서트 앵콜"
   },
   {
    "q": "행진 끝에\n남기고 싶은 건?",
    "a": "달달한 고백",
    "b": "멋진 엔딩 크레딧"
   }
  ],
  "types": {
   "band": {
    "name": "떼창 밴드형",
    "line": "박수도 다 같이, 떼창도 다 같이",
    "desc": "하객이 따라 부르는 순간, 식장이 작은 콘서트장이 돼요.",
    "songs": [
     [
      "스마일보이",
      "로이킴"
     ],
     [
      "한 페이지가 될 수 있게",
      "DAY6"
     ],
     [
      "투게더!",
      "잔나비"
     ]
    ],
    "tip": "떼창 나오는 후렴을 행진 시작에 맞추세요. 앞 부분에는 타이밍 멘트를 넣고 “행진” 직후에 노래가 터지면 반응이 좋아요.",
    "link": "https://drive.google.com/drive/folders/1fHZI3kafUQDGbhkT-P0DyRlWitnERg8j?usp=sharing"  // 링크행진1  ← "" 안에 구글 드라이브 링크를 붙여넣으세요. 비워 두면 버튼이 안 보여요.
   },
   "sweet": {
    "name": "달달 고백형",
    "line": "가사는 달콤하게, 걸음은 나란하게",
    "desc": "두 사람이 서로 보며 웃게 되는, 가사가 고백 같은 행진이에요.",
    "songs": [
     [
      "에피소드",
      "이무진"
     ],
     [
      "Perhaps Love (사랑인가요)",
      "제이, 하울"
     ],
     [
      "팡파레",
      "다비치"
     ]
    ],
    "tip": "멘트가 끝나자마자 가사가 시작되게 맞추면 하객 귀에 가사가 그대로 들어가요. 가사가 좋아서, 가사를 행진 대본에 넣으면 연결되고 좋아요.",
    "link": "https://drive.google.com/drive/folders/1AuxoA_2fxQuhEo_bVEas7hbfLwYOxT32?usp=sharing"  // 링크행진2
   },
   "modern": {
    "name": "모던 팝 주인공형",
    "line": "조명은 환하게, 엔딩은 멋지게",
    "desc": "뮤직비디오 마지막 장면처럼 세련되게 퇴장하는 행진이에요.",
    "songs": [
     [
      "Love Me Like You Do",
      "Ellie Goulding"
     ],
     [
      "Steal The Show",
      "Lauv"
     ],
     [
      "Just The Way You Are",
      "Bruno Mars"
     ]
    ],
    "tip": "드라마틱한 곡은 중간에 끊기면 아쉬워요. 버진로드 끝에 도착할 때 클라이맥스가 오도록 편집하면 마지막 사진이 살아나요.",
    "link": "https://drive.google.com/drive/folders/1lw1DiYhprFZn6zEgI5VdvmU82XzCwiF6?usp=sharing"  // 링크행진3
   },
   "retro": {
    "name": "레트로 흥폭발형",
    "line": "어깨도 들썩, 하객도 들썩",
    "desc": "흥겨운 레트로 팝에 어르신 하객까지 어깨가 들썩이는 행진이에요.",
    "songs": [
     [
      "Can’t Take My Eyes Off You",
      "Morten Harket"
     ],
     [
      "Marvin Gaye",
      "Charlie Puth"
     ],
     [
      "Love On Top",
      "Beyoncé"
     ]
    ],
    "tip": "모든 세대가 아는 곡이라 박수 유도가 가장 쉬워요. 행진 중간에 “양가 부모님께도 큰 박수!” 한마디면 어르신 호응까지 챙길 수 있어요.",
    "link": "https://drive.google.com/drive/folders/1SxUE2W0XHBoiVRZpKcm2NLokogeLYgdg?usp=sharing"  // 링크행진4
   },
   "fairy": {
    "name": "동화 피날레형",
    "line": "그리고 두 사람은, 오래오래 행복하게",
    "desc": "동화책 마지막 장을 덮는 것처럼, 박수 속에 막이 내리는 행진이에요.",
    "songs": [
     [
      "The Wedding + A Whole New World",
      "알라딘 OST"
     ],
     [
      "Another Day of Sun",
      "라라랜드 OST"
     ],
     [
      "Rewrite The Stars",
      "위대한 쇼맨 OST"
     ]
    ],
    "tip": "뮤지컬 곡은 끝이 웅장하게 마무리돼요. 퇴장 문 앞에서 곡이 끝나도록 길이를 맞추면 박수와 함께 깔끔하게 막이 내려요.",
    "link": "https://drive.google.com/drive/folders/1gc1nu21IhZhLl3LJ0l8X0o3Pe3YHpmf4?usp=sharing"  // 링크행진5
   }
  }
 },
 "serenade": {
  "label": "축가",
  "kind": "우리 축가 유형",
  "linkLabel": "추천곡 3곡 MR 받기",
  "call": "멋진 무대를\n만나보겠습니다!",
  "hint": "이 카드를 저장해서 축가 부를 분께 보내 보세요. 스토리에 올려도 좋아요.",
  "next": [
   "groom",
   "bride",
   "march"
  ],
  "questions": [
   {
    "q": "우리 축가,\n누가 불러요?",
    "a": "친구·지인",
    "b": "신랑 (또는 우리 둘이)"
   },
   {
    "q": "부르는 사람\n노래 실력은?",
    "a": "노래방 90점 이상",
    "b": "점수보다 진심"
   },
   {
    "q": "축가 끝나고\n하객 반응은?",
    "a": "“감동이다…” 눈물 글썽",
    "b": "“앵콜!” 박수와 환호"
   },
   {
    "q": "무대에는\n몇 명이 서요?",
    "a": "한 명이 집중",
    "b": "둘 이상 같이"
   },
   {
    "q": "둘이 노래방 가면\n주로?",
    "a": "발라드 열창",
    "b": "댄스곡 떼창"
   },
   {
    "q": "축가는\n어떤 노래가 좋아요?",
    "a": "요즘 많이 부르는 노래",
    "b": "다들 아는 명곡"
   }
  ],
  "types": {
   "ballad": {
    "name": "눈물샘 발라드형",
    "line": "첫 소절은 조용히, 후렴은 눈물로",
    "desc": "목소리 하나로 식장을 울리는 축가예요. 양가 부모님 눈가가 가장 먼저 촉촉해져요.",
    "songs": [
     [
      "감사",
      "김동률"
     ],
     [
      "봄이 와도",
      "로이킴"
     ],
     [
      "모든 날, 모든 순간",
      "폴킴"
     ]
    ],
    "tip": "발라드는 원키가 높은 곡이 많아요. 키를 1~2개 낮춘 MR을 미리 준비하고, 2절은 빼고 1절+하이라이트로 2분 30초 안팎으로 편집하면 끝까지 집중이 유지돼요.",
    "link": ""  // 링크축가1  ← "" 안에 구글 드라이브 링크(MR 폴더)를 붙여넣으세요. 비워 두면 버튼이 안 보여요.
   },
   "party": {
    "name": "흥 폭발 파티형",
    "line": "박수는 크게, 떼창은 더 크게",
    "desc": "첫 박자부터 하객이 손뼉을 치고, 후렴은 식장 전체가 따라 불러요. 분위기가 한 번에 올라가는 축가예요.",
    "songs": [
     [
      "팡파레",
      "다비치"
     ],
     [
      "그대랑",
      "이적"
     ],
     [
      "예술이야",
      "싸이"
     ]
    ],
    "tip": "신나는 곡은 하객 호응이 전부예요. 후렴 직전에 제가 “다 같이!” 한마디로 박수를 모아 드릴게요. 신랑신부도 자리에서 같이 흔들어 주면 영상이 훨씬 살아요.",
    "link": ""  // 링크축가2
   },
   "duet": {
    "name": "달달 듀엣형",
    "line": "화음은 달달하게, 눈빛은 더 달달하게",
    "desc": "둘이 주고받는 가사가 신랑신부 이야기처럼 들려요. 사랑스러운 분위기가 식장을 채우는 축가예요.",
    "songs": [
     [
      "좋겠다",
      "스윗소로우"
     ],
     [
      "사랑인가봐",
      "멜로망스"
     ],
     [
      "너의 의미",
      "아이유"
     ]
    ],
    "tip": "듀엣은 마이크 2개가 필수예요. 웨딩홀 음향팀에 미리 말해 두고, 파트를 나눈 가사지를 두 장 준비하세요. 마지막 소절만 둘이 같이 부르면 박수가 자연스럽게 터져요.",
    "link": ""  // 링크축가3
   },
   "surprise": {
    "name": "신랑 서프라이즈형",
    "line": "가사는 고백처럼, 눈은 신부만 보고",
    "desc": "신랑이 마이크를 잡는 순간 하객이 “어?” 하고 웃다가, 후렴에서 신부가 울어요. 그날 가장 오래 기억되는 장면이에요.",
    "songs": [
     [
      "청혼하지 않을 이유를 못 찾았어",
      "이무진"
     ],
     [
      "소나기",
      "이클립스"
     ],
     [
      "달리 표현할 수 없어요",
      "로이킴"
     ]
    ],
    "tip": "서프라이즈는 사회자와 음향팀만 알면 돼요. 식순에는 ‘축가’로만 적어 두면 제가 신부 모르게 자연스럽게 마이크를 넘겨 드릴게요. 가사를 잊어도 괜찮아요. “사랑해” 한마디면 식장이 터져요.",
    "link": ""  // 링크축가4
   },
   "easy": {
    "name": "노래 못해도 되는 축가형",
    "line": "실력 대신 떼창으로, 음정 대신 진심으로",
    "desc": "첫 소절만 나와도 하객이 다 같이 따라 부르는 곡이에요. 음정이 흔들려도 박수로 덮이는, 가장 마음 편한 축가예요.",
    "songs": [
     [
      "라라라",
      "SG워너비"
     ],
     [
      "아로하",
      "쿨 · 조정석"
     ],
     [
      "커플",
      "젝스키스"
     ]
    ],
    "tip": "이 곡들은 하객이 더 잘 알아요. 후렴에서 마이크를 하객 쪽으로 돌리면 떼창이 터지고, 음이 틀려도 아무도 몰라요. 가사지를 들고 불러도 괜찮아요.",
    "link": ""  // 링크축가5
   }
  }
 }
};

// ===== 답 64가지 → 유형 결정표 (A=1, B=0, 1번 질문이 맨 앞자리) =====
const TABLES = {"groom": ["gentle", "kpop", "energy", "kpop", "fun", "fun", "fun", "energy", "fun", "fun", "fun", "energy", "fun", "fun", "hero", "hero", "kpop", "kpop", "gentle", "kpop", "gentle", "kpop", "kpop", "energy", "gentle", "kpop", "hero", "kpop", "fun", "kpop", "fun", "fun", "gentle", "kpop", "energy", "energy", "hero", "energy", "hero", "energy", "fun", "hero", "hero", "hero", "hero", "energy", "hero", "energy", "gentle", "gentle", "gentle", "gentle", "gentle", "kpop", "energy", "energy", "gentle", "kpop", "gentle", "energy", "fun", "gentle", "hero", "hero"], "bride": ["pop", "drama", "pop", "drama", "sacred", "princess", "sacred", "princess", "lovely", "pop", "lovely", "pop", "princess", "drama", "lovely", "princess", "pop", "pop", "pop", "pop", "princess", "princess", "princess", "princess", "lovely", "lovely", "lovely", "lovely", "princess", "princess", "lovely", "lovely", "drama", "drama", "pop", "drama", "sacred", "sacred", "sacred", "sacred", "drama", "drama", "pop", "pop", "drama", "drama", "sacred", "drama", "drama", "drama", "pop", "drama", "sacred", "princess", "sacred", "princess", "lovely", "pop", "lovely", "pop", "sacred", "sacred", "lovely", "sacred"], "march": ["modern", "sweet", "modern", "fairy", "modern", "sweet", "modern", "fairy", "retro", "retro", "retro", "fairy", "modern", "sweet", "modern", "fairy", "modern", "sweet", "fairy", "sweet", "sweet", "sweet", "sweet", "sweet", "retro", "retro", "fairy", "fairy", "modern", "sweet", "fairy", "fairy", "band", "retro", "retro", "fairy", "modern", "band", "modern", "sweet", "retro", "band", "retro", "retro", "band", "band", "band", "fairy", "band", "band", "retro", "fairy", "modern", "sweet", "modern", "sweet", "band", "retro", "retro", "retro", "band", "band", "band", "fairy"], "serenade": ["easy", "easy", "easy", "easy", "easy", "easy", "surprise", "surprise", "easy", "duet", "ballad", "ballad", "surprise", "surprise", "surprise", "surprise", "party", "party", "duet", "duet", "party", "party", "surprise", "surprise", "duet", "duet", "duet", "duet", "surprise", "surprise", "surprise", "surprise", "easy", "easy", "easy", "easy", "easy", "easy", "ballad", "party", "easy", "duet", "ballad", "ballad", "ballad", "party", "ballad", "ballad", "party", "party", "duet", "duet", "party", "party", "party", "ballad", "duet", "duet", "duet", "duet", "ballad", "party", "ballad", "ballad"]};
// 테스트 전용 페이지(groom/, lovely-bride/, hand-in-hand/, sing-for-you/)면 body의 data-test 값으로 그 테스트만 보여줘요
// 폴더 이름(주소)은 shared/common.js의 사이트 목록에 있어요
const FIXED = DATA[document.body.dataset.test] ? document.body.dataset.test : null;
function isOpen(k){ return OPEN.includes(k); }
let state = { test:null, i:0, answers:[] };

function home(){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  app.innerHTML = `
    <div class="top"><span>결혼식 음악 찾기 테스트</span><span>6문항</span></div>
    ${brandLogo()}
    <p class="for">예비 신랑·신부님을 위한</p>
    <h1>우리 결혼식<br>음악 찾기</h1>
    <div class="bar"></div>
    <p class="lead">A, B 중에 고르기만 하세요. 1분이면 끝나요.</p>
    <div class="pick">
      ${["groom","bride","march","serenade"].map(k=>isOpen(k)?siteLink(k,"go",`<span>${DATA[k].label}</span><span class="q">시작하기</span>`):`<button disabled><span>${DATA[k].label}</span><span class="q">곧 공개</span></button>`).join("")}
    </div>
    <p class="note">※ 실제 결혼식 현장에서 반응이 가장 좋은 인기곡 TOP3를 골랐어요.</p>
    ${foot()}`;
}

function start(k){
  state = { test:k, i:0, answers:[] };
  ask();
}

function ask(){
  document.body.classList.remove("is-cover");
  app.className = "wrap";
  const t = DATA[state.test], q = t.questions[state.i];
  app.innerHTML = `
    <div class="top"><span>${t.label} 테스트</span><span class="count">${pad(state.i+1)} / 06</span></div>
    <h2 class="question">${esc(q.q)}</h2>
    <div class="answers" role="group" aria-label="답 고르기">
      <button data-v="1"><span class="box">${CHECK}</span><span>${esc(q.a)}</span></button>
      <div class="div"></div>
      <button data-v="0"><span class="box">${CHECK}</span><span>${esc(q.b)}</span></button>
    </div>
    <div class="under">
      ${state.i>0?'<button class="text-btn" id="back">이전 질문</button>':'<span></span>'}
      <button class="text-btn" id="home">${FIXED?"처음부터 다시":"처음으로"}</button>
    </div>
    ${foot()}`;
  app.querySelectorAll(".answers button").forEach(b=>b.onclick=()=>{
    if(app.dataset.lock) return; app.dataset.lock="1";
    b.classList.add("on");
    setTimeout(()=>{ delete app.dataset.lock; pick(+b.dataset.v) }, reduce?60:260);
  });
  const back=document.getElementById("back");
  if(back) back.onclick=()=>{ state.i--; state.answers.pop(); ask(); };
  document.getElementById("home").onclick=()=>FIXED?start(FIXED):goHome();
  app.querySelector(".answers button").focus({preventScroll:true});
}

function pick(v){
  state.answers.push(v);
  if(state.i<5){ state.i++; ask(); return; }
  const idx = state.answers.reduce((s,b)=>s*2+b,0);
  const type = TABLES[state.test][idx];
  reveal(DATA[state.test].call, ()=>result(state.test,type));
}

function result(k,type){
  document.body.classList.remove("is-cover");
  app.className="wrap";
  const t=DATA[k], r=t.types[type];
  app.innerHTML=`
    <article class="card" id="card">
      <div class="head"><span class="kind">${esc(t.kind||"나의 "+t.label+" 유형")}</span><span class="handle">@wed_voice.su</span></div>
      <h2>${esc(r.name)}</h2>
      <p class="line">${esc(r.line)}</p>
      <p class="desc">${esc(r.desc)}</p>
      <ol class="songs" aria-label="추천곡 TOP3">
        ${r.songs.map((s,i)=>`<li><span class="n">${i+1}</span><span><span class="t">${esc(s[0])}</span><span class="a">${esc(s[1])}</span></span></li>`).join("")}
      </ol>
      ${r.link?`<a class="listen" href="${esc(r.link)}" target="_blank" rel="noopener" data-html2canvas-ignore>${esc(t.linkLabel||"추천곡 3곡 음원 받기")}</a>`:""}
      <div class="tip"><b>사회자 한마디</b><p>${esc(r.tip)}</p></div>
      ${sign()}
    </article>
    <div class="after">
      <p class="hint">${esc(t.hint||"이 카드를 캡처하거나 저장해서 스토리에 올려보세요")}</p>
      <div class="btns">
        <button class="btn main" id="save">이미지로 저장하기</button>
        <p class="msg" id="msg" role="status"></p>
        ${t.next.map(n=>isOpen(n)?siteLink(n,"btn ghost",`${DATA[n].label}도 찾아보기`):`<button class="btn ghost" disabled>${DATA[n].label} 테스트는 곧 공개돼요</button>`).join("")}
        <a class="btn insta" href="${INSTA}" target="_blank" rel="noopener">인스타에서 결혼 준비 꿀팁 보기</a>
        ${SITES[k].direct?'<button class="text-btn btn-link" id="copy">테스트 링크 복사하기</button>':""}
        <button class="text-btn btn-link" id="again">다시 하기</button>
      </div>
    </div>`;
  document.getElementById("again").onclick=()=>start(k);
  window.scrollTo(0,0);
  prepareImage(({march:"행진곡-",serenade:"축가-"}[k]||"입장곡-")+r.name);  // 저장되는 이미지 파일 이름
  document.getElementById("save").onclick=saveCard;
  // 링크 복사 버튼은 주소가 공개된 테스트(SITES에서 direct)에만 있어요. 신부·행진곡은 댓글로 링크를 받게 해요
  const copy=document.getElementById("copy"); if(copy) copy.onclick=()=>copyLink("테스트 링크를 복사했어요.");
}

// ===== 아직 공개 전인 테스트에 들어왔을 때 =====
function soon(k){
  document.body.classList.add("is-cover");
  app.className = "wrap cover";
  const first = ["groom","bride","march","serenade"].find(isOpen);
  app.innerHTML = `
    <div class="top"><span>결혼식 음악 찾기 테스트</span><span>6문항</span></div>
    ${brandLogo()}
    <p class="for">곧 공개돼요</p>
    <h1>${esc(DATA[k].label)}<br>찾기</h1>
    <div class="bar"></div>
    <p class="lead">인스타를 팔로우하면 공개 소식을 가장 먼저 받아볼 수 있어요.</p>
    <div class="pick">
      <a class="soon-insta" href="${INSTA}" target="_blank" rel="noopener">인스타 팔로우하기</a>
      ${first?siteLink(first,"go",`<span>${DATA[first].label} 테스트 먼저 하기</span>`):""}
    </div>
    ${foot()}`;
}

function goHome(){ try{ history.replaceState(null,"","#") }catch(e){} home(); }

function route(){
  if(FIXED){ isOpen(FIXED) ? start(FIXED) : soon(FIXED); return; }
  // 예전 주소(#groom)로 들어와도 새 주소(groom/)로 옮겨줘요. 신부·행진곡은 주소가 드러나지 않게 옮기지 않아요
  const h=(location.hash||"").replace("#","");
  if(h==="groom"){ location.replace(siteUrl("groom")); return; }
  home();
}
route();
