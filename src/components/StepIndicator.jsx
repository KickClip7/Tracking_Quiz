const STEPS = [
  { n: 1, label: "영상 랜덤 선택" },
  { n: 2, label: "원본 영상 시청" },
  { n: 3, label: "팀 선택" },
  { n: 4, label: "결과 영상 확인" },
];

export default function StepIndicator({ currentStep }) {
  return (
    <ol className="step-indicator">
      {STEPS.map((step) => (
        <li
          key={step.n}
          className={`step-item${
            step.n === currentStep ? " active" : step.n < currentStep ? " done" : ""
          }`}
        >
          <span className="step-num">{step.n}</span>
          <span className="step-label">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}
