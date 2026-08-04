function CheckIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="currentColor" fillOpacity="0.16" />
      <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M7.5 12.5l2.8 2.8L16.5 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="currentColor" fillOpacity="0.16" />
      <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M9 9l6 6M15 9l-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ResultModal({
  isCorrect,
  winningTeam,
  teamA,
  teamB,
  scoreA,
  scoreB,
  onReset,
  onReplay,
}) {
  return (
    <div className="result-overlay">
      <div className={`result-modal${isCorrect ? " correct" : " wrong"}`}>
        <span className="result-icon">{isCorrect ? <CheckIcon /> : <XIcon />}</span>
        <h2>{isCorrect ? "정답입니다!" : "아쉬워요!"}</h2>
        <p>
          정답은 {winningTeam.flag ? `${winningTeam.flag} ` : ""}
          {winningTeam.label}
          {" "}
          ({teamA.label} {scoreA}% · {teamB.label} {scoreB}%)
        </p>
        <div className="result-actions">
          <button type="button" className="button ghost" onClick={onReplay}>
            결과 영상 다시보기
          </button>
          <button type="button" className="button primary large" onClick={onReset}>
            다시하기
          </button>
        </div>
      </div>
    </div>
  );
}
