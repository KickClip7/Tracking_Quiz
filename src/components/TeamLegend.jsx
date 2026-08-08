// 어느 팀이 무슨 색 유니폼인지 보여주는 범례. INTRO의 매치 카드(layout="row")와
// 원본/결과 영상 위 코너 배지(layout="corner")에서 재사용한다.
export default function TeamLegend({ teamA, teamB, layout = "row" }) {
  return (
    <div className={`team-legend team-legend-${layout}`}>
      <span className="legend-chip">
        <span className="legend-swatch" style={{ backgroundColor: teamA.color }} />
        {teamA.label}
        {teamA.colorLabel ? ` · ${teamA.colorLabel}` : ""}
      </span>
      <span className="legend-chip">
        <span className="legend-swatch" style={{ backgroundColor: teamB.color }} />
        {teamB.label}
        {teamB.colorLabel ? ` · ${teamB.colorLabel}` : ""}
      </span>
    </div>
  );
}
