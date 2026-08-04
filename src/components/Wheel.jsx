const NUMBERS = [1, 2, 3, 4, 5];
const SEGMENT_ANGLE = 360 / NUMBERS.length;
// 하나의 이어지는 그라데이션이 원을 한 바퀴 돌도록 6개의 색상 정지점을 사용
// (마지막 정지점을 첫 정지점과 같은 색으로 닫아서 이음새를 부드럽게 만든다)
const GRADIENT_STOPS = ["#123a91", "#2474ff", "#2dd4bf", "#39ff88", "#39c6ff", "#123a91"];

const conicBackground = GRADIENT_STOPS.map(
  (color, i) => `${color} ${i * SEGMENT_ANGLE}deg`,
).join(", ");

export default function Wheel({ rotation, spinning, onSpin }) {
  return (
    <div className="wheel-wrap">
      <div className="wheel-pointer" aria-hidden="true" />
      <div
        className="wheel"
        style={{
          background: `conic-gradient(${conicBackground})`,
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {NUMBERS.map((n, i) => {
          const angle = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
          return (
            <div
              key={n}
              className="wheel-number-pos"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              <span style={{ transform: `rotate(${-angle}deg)` }}>{n}</span>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="wheel-hub"
        onClick={onSpin}
        disabled={spinning}
        aria-label="번호 뽑기"
      >
        {spinning ? "•••" : "GO"}
      </button>
    </div>
  );
}
