const RADIUS = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const URGENT_SECONDS = 3;

// 영상 위에 떠 있는 원형 카운트다운 배지. remaining(남은 초)과
// elapsedRatio(0~1, 진행률)만 받아서 그리므로 WATCHING/REVEALING처럼
// 서로 다른 영상 위에서도 동일하게 재사용할 수 있다.
export default function CountdownBadge({ remaining, elapsedRatio }) {
  if (remaining == null) return null;
  const urgent = remaining <= URGENT_SECONDS;

  return (
    <div className={`video-timer${urgent ? " urgent" : ""}`}>
      <svg className="video-timer-ring" viewBox="0 0 56 56" aria-hidden="true">
        <circle className="video-timer-track" cx="28" cy="28" r={RADIUS} />
        <circle
          className="video-timer-arc"
          cx="28"
          cy="28"
          r={RADIUS}
          style={{
            strokeDasharray: CIRCUMFERENCE,
            strokeDashoffset: CIRCUMFERENCE * elapsedRatio,
          }}
        />
      </svg>
      <span className="video-timer-value">{remaining}</span>
    </div>
  );
}
