// 클립마다 등장하는 두 팀(teamA/teamB)을 자유롭게 지정할 수 있습니다.
// - matchTitle: 어떤 대회/리그의 경기인지 (예: "2026 월드컵 조별예선")
// - code: 내부적으로 정답(answer)과 매칭하는 식별자 (클립 안에서만 고유하면 됨)
// - label: 버튼/결과창에 표시되는 팀 이름
// - flag: 버튼 앞에 붙는 국기 이모지 (없어도 됨)
// - color: 그 팀의 유니폼/포인트 컬러 (버튼 유리 톤에 그대로 반영됨)
//
// 영상 길이는 클립마다 달라도 됩니다. 실제 영상 파일이 있으면 그 영상의
// 진짜 timeupdate/ended 이벤트를 그대로 쓰기 때문에 따로 적을 필요가 없습니다.
export const clips = [
  {
    id: 1,
    matchTitle: "2026 월드컵 아시아 최종예선",
    original: "/videos/clip_01_original.mp4",
    overlay: "/videos/clip_01_overlay.mp4",
    teamA: { code: "kr", label: "한국", flag: "🇰🇷", color: "#2474ff" },
    teamB: { code: "jp", label: "일본", flag: "🇯🇵", color: "#39ff88" },
    answer: "kr",
    scoreA: 58,
    scoreB: 42,
  },
  {
    id: 2,
    matchTitle: "2026 월드컵 아시아 최종예선",
    original: "/videos/clip_02_original.mp4",
    overlay: "/videos/clip_02_overlay.mp4",
    teamA: { code: "kr", label: "한국", flag: "🇰🇷", color: "#2474ff" },
    teamB: { code: "jp", label: "일본", flag: "🇯🇵", color: "#39ff88" },
    answer: "jp",
    scoreA: 45,
    scoreB: 55,
  },
  {
    id: 3,
    matchTitle: "동아시안컵",
    original: "/videos/clip_03_original.mp4",
    overlay: "/videos/clip_03_overlay.mp4",
    teamA: { code: "kr", label: "한국", flag: "🇰🇷", color: "#2474ff" },
    teamB: { code: "jp", label: "일본", flag: "🇯🇵", color: "#39ff88" },
    answer: "kr",
    scoreA: 63,
    scoreB: 37,
  },
  {
    id: 4,
    matchTitle: "친선경기",
    original: "/videos/clip_04_original.mp4",
    overlay: "/videos/clip_04_overlay.mp4",
    teamA: { code: "kr", label: "한국", flag: "🇰🇷", color: "#2474ff" },
    teamB: { code: "jp", label: "일본", flag: "🇯🇵", color: "#39ff88" },
    answer: "jp",
    scoreA: 49,
    scoreB: 51,
  },
  {
    id: 5,
    matchTitle: "아시안컵",
    original: "/videos/clip_05_original.mp4",
    overlay: "/videos/clip_05_overlay.mp4",
    teamA: { code: "kr", label: "한국", flag: "🇰🇷", color: "#2474ff" },
    teamB: { code: "jp", label: "일본", flag: "🇯🇵", color: "#39ff88" },
    answer: "kr",
    scoreA: 55,
    scoreB: 45,
  },
];
