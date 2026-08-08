// 클립마다 등장하는 두 팀(teamA/teamB)을 자유롭게 지정할 수 있습니다.
// - matchTitle: 어떤 대회/리그의 경기인지 (예: "2026 월드컵 조별예선")
// - code: 내부적으로 정답(answer)과 매칭하는 식별자 (클립 안에서만 고유하면 됨)
//   ⚠️ answer 값은 반드시 teamA.code 또는 teamB.code와 "정확히" 같아야 합니다.
// - label: 버튼/결과창에 표시되는 팀 이름
// - flag: 버튼 앞에 붙는 국기 이모지 (없어도 됨)
// - color: 그 팀의 유니폼/포인트 컬러 (버튼 유리 톤, 영상 위 유니폼 범례에 반영됨)
// - colorLabel: 유니폼 색을 말로 설명하는 텍스트 (예: "화이트", "레드") — 실제
//   영상 속 유니폼 색과 다르면 자유롭게 수정하세요. (색상만 봐도 되면 생략 가능)
//
// 영상 길이는 클립마다 달라도 됩니다. 실제 영상 파일이 있으면 그 영상의
// 진짜 timeupdate/ended 이벤트를 그대로 쓰기 때문에 따로 적을 필요가 없습니다.
export const clips = [
  {
    id: 1,
    matchTitle: "2002년 한일 월드컵 한국 vs 이탈리아",
    original: "/videos/clip_01_original.mp4",
    overlay: "/videos/clip_01_overlay.mp4",
    teamA: { code: "KOR", label: "한국", flag: "🇰🇷", color: "#ffffff", colorLabel: "화이트" },
    teamB: { code: "ITA", label: "이탈리아", flag: "🇮🇹", color: "#001eff", colorLabel: "블루" },
    answer: "KOR",
    scoreA: 69.3,
    scoreB: 30.7,
  },
  {
    id: 2,
    matchTitle: "프리미어 리그 토트넘 vs 첼시",
    original: "/videos/clip_02_original.mp4",
    overlay: "/videos/clip_02_overlay.mp4",
    teamA: { code: "TOT", label: "토트텀", flag: "⚪️", color: "#ffffff", colorLabel: "화이트" },
    teamB: { code: "CHE", label: "첼시", flag: "🔵", color: "#3974ff", colorLabel: "블루" },
    answer: "TOT",
    scoreA: 50.2,
    scoreB: 49.8,
  },
  {
    id: 3,
    matchTitle: "프리미어 리그 토트넘 vs 첼시",
    original: "/videos/clip_03_original.mp4",
    overlay: "/videos/clip_03_overlay.mp4",
    teamA: { code: "TOT", label: "토트텀", flag: "⚪️", color: "#ffffff", colorLabel: "화이트" },
    teamB: { code: "CHE", label: "첼시", flag: "🔵", color: "#3974ff", colorLabel: "블루" },
    answer: "TOT",
    scoreA: 77.2,
    scoreB: 22.8,
  },
  {
    id: 4,
    matchTitle: "2022년 카타르 월드컵 대한민국 vs 포르투갈",
    original: "/videos/clip_04_original.mp4",
    overlay: "/videos/clip_04_overlay.mp4",
    teamA: { code: "KR", label: "한국", flag: "🇰🇷", color: "#fe2323", colorLabel: "레드" },
    teamB: { code: "PT", label: "포르투갈", flag: "🇵🇹", color: "#ffffff", colorLabel: "화이트" },
    answer: "KR",
    scoreA: 64,
    scoreB: 36,
  },
  {
    id: 5,
    matchTitle: "2012년 런던올림픽 대한민국vs일본",
    original: "/videos/clip_05_original.mp4",
    overlay: "/videos/clip_05_overlay.mp4",
    teamA: { code: "KR", label: "한국", flag: "🇰🇷", color: "#ffffff", colorLabel: "화이트" },
    teamB: { code: "JP", label: "일본", flag: "🇯🇵", color: "#210098", colorLabel: "블루" },
    // 이전엔 "KOR"로 적혀 있어서 teamA.code("KR")와 안 맞았습니다 — 이 클립은
    // 정답을 맞혀도 항상 오답 처리되던 버그였어요. teamA.code와 동일하게 수정.
    answer: "KR",
    scoreA: 67.3,
    scoreB: 32.7,
  },
];
