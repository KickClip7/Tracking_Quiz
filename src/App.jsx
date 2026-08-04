import { useEffect, useRef, useState } from "react";
import TopBar from "./components/TopBar.jsx";
import StepIndicator from "./components/StepIndicator.jsx";
import Wheel from "./components/Wheel.jsx";
import VideoStage from "./components/VideoStage.jsx";
import ResultModal from "./components/ResultModal.jsx";
import { clips } from "./data/clips.js";

const NUMBERS = clips.map((clip) => clip.id);
const SEGMENT_ANGLE = 360 / NUMBERS.length;
const SPIN_DURATION_MS = 3200;
const WATCH_SIMULATE_MS = 8000;
const LOADING_DURATION_MS = 1800;
const REVEAL_SIMULATE_MS = 7000;
// 어느 팀이 우세한지는 정확히 50:50에서 시작해서, 재생 중간에는
// 엎치락뒤치락 흔들리다가 영상이 끝나는 시점에 정답 비율로 수렴한다.
// baseline: 50%에서 정답 비율로 선형 이동, swing: 양 끝(0, 1)에서는 0이 되고
// 중간 지점에서 가장 크게 흔들리는 envelope(ratio*(1-ratio))를 사인파에 곱한 값
const REVEAL_SWING_AMPLITUDE = 1.15;
const REVEAL_SWING_CYCLES = 2.4;
// 우세 팀 버튼이 깜빡이는 주기: 영상 초반엔 느긋하게, 끝에 가까울수록 빨라진다
const PULSE_DURATION_START = 1.1;
const PULSE_DURATION_END = 0.35;

const STAGE_TO_STEP = {
  INTRO: 1,
  WATCHING: 2,
  SELECTING: 3,
  LOADING: 4,
  REVEALING: 4,
};

export default function App() {
  const [stage, setStage] = useState("INTRO");
  const [pickedNumber, setPickedNumber] = useState(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [userPick, setUserPick] = useState(null);
  const [leadTeam, setLeadTeam] = useState("A");
  const [pulseDuration, setPulseDuration] = useState(PULSE_DURATION_START);
  const [finalRevealed, setFinalRevealed] = useState(false);
  const [replayToken, setReplayToken] = useState(0);

  const spinCountRef = useRef(0);
  const spinTimeoutRef = useRef(null);
  const videoRef = useRef(null);
  const revealPhaseRef = useRef(0);

  const selectedClip = pickedNumber
    ? clips.find((clip) => clip.id === pickedNumber)
    : null;

  useEffect(() => () => clearTimeout(spinTimeoutRef.current), []);

  useEffect(() => {
    if (stage !== "LOADING") return;
    const timer = setTimeout(() => setStage("REVEALING"), LOADING_DURATION_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "REVEALING") return;
    setLeadTeam("A");
    setPulseDuration(PULSE_DURATION_START);
    setFinalRevealed(false);
    revealPhaseRef.current = Math.random() * Math.PI * 2;
  }, [stage]);

  const handleSpin = () => {
    if (spinning) return;
    const result = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
    const segmentCenter =
      NUMBERS.indexOf(result) * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
    spinCountRef.current += 1;
    const rotation = spinCountRef.current * 360 * 4 + (360 - segmentCenter);

    setPickedNumber(null);
    setSpinning(true);
    setWheelRotation(rotation);

    spinTimeoutRef.current = setTimeout(() => {
      setPickedNumber(result);
      setSpinning(false);
    }, SPIN_DURATION_MS);
  };

  const handleStart = () => {
    setWatchProgress(0);
    setStage("WATCHING");
  };

  const handlePick = (teamCode) => {
    setUserPick(teamCode);
    setStage("LOADING");
  };

  const handleRevealProgress = (ratio) => {
    if (!selectedClip) return;
    const targetShare = selectedClip.scoreA / 100;
    const baseline = 0.5 + (targetShare - 0.5) * ratio;
    const swing =
      REVEAL_SWING_AMPLITUDE *
      ratio *
      (1 - ratio) *
      Math.sin(ratio * Math.PI * 2 * REVEAL_SWING_CYCLES + revealPhaseRef.current);
    const shareA = Math.min(1, Math.max(0, baseline + swing));
    setLeadTeam(shareA >= 0.5 ? "A" : "B");
    setPulseDuration(
      PULSE_DURATION_START - (PULSE_DURATION_START - PULSE_DURATION_END) * ratio,
    );
  };

  const handleRevealEnded = () => {
    if (!selectedClip) return;
    setLeadTeam(selectedClip.scoreA >= selectedClip.scoreB ? "A" : "B");
    setFinalRevealed(true);
  };

  const handleReplay = () => {
    setFinalRevealed(false);
    setLeadTeam("A");
    setPulseDuration(PULSE_DURATION_START);
    revealPhaseRef.current = Math.random() * Math.PI * 2;
    setReplayToken((n) => n + 1);
  };

  const handleReset = () => {
    clearTimeout(spinTimeoutRef.current);
    setStage("INTRO");
    setPickedNumber(null);
    setSpinning(false);
    setWatchProgress(0);
    setUserPick(null);
    setLeadTeam("A");
    setPulseDuration(PULSE_DURATION_START);
    setFinalRevealed(false);
    setReplayToken(0);
  };

  const isCorrect = selectedClip && userPick === selectedClip.answer;
  const winningTeam =
    selectedClip &&
    (selectedClip.answer === selectedClip.teamA.code
      ? selectedClip.teamA
      : selectedClip.teamB);

  return (
    <div className="quiz-page">
      <TopBar showBack={stage !== "INTRO"} onBack={handleReset} />
      <StepIndicator currentStep={STAGE_TO_STEP[stage]} />

      <main className="quiz-main">
        {stage === "INTRO" && (
          <section className="glass-panel intro">
            <h1>⚽ 점유율 퀴즈</h1>
            <p className="intro-sub">
              클립을 보고 어느 팀이 볼을 더 많이 점유했는지 맞혀보세요
            </p>

            {pickedNumber === null || spinning ? (
              <Wheel rotation={wheelRotation} spinning={spinning} onSpin={handleSpin} />
            ) : (
              <div className="match-reveal">
                <p className="match-reveal-pick">
                  <strong>{pickedNumber}</strong>번 클립이 선택되었어요
                </p>
                {selectedClip.matchTitle && (
                  <p className="match-reveal-title">{selectedClip.matchTitle}</p>
                )}
                <p className="match-reveal-vs">
                  <span>
                    {selectedClip.teamA.flag ? `${selectedClip.teamA.flag} ` : ""}
                    {selectedClip.teamA.label}
                  </span>
                  <span className="vs">VS</span>
                  <span>
                    {selectedClip.teamB.flag ? `${selectedClip.teamB.flag} ` : ""}
                    {selectedClip.teamB.label}
                  </span>
                </p>
                <button className="button primary large" onClick={handleStart}>
                  시작하기
                </button>
              </div>
            )}
          </section>
        )}

        {(stage === "WATCHING" || stage === "SELECTING" || stage === "REVEALING") &&
          selectedClip && (
            <div className="quiz-stage-wrap">
              <p className="quiz-instruction">
                {stage === "SELECTING"
                  ? "어느 팀이 볼을 더 오래 점유했을까요? 팀을 선택해주세요"
                  : stage === "REVEALING"
                    ? "결과 영상으로 실제 점유율을 확인해보세요"
                    : "영상을 보면서 점유율을 예측해보세요"}
              </p>
              <div className="video-row">
                <button
                  type="button"
                  className={`button large side-pick kr${
                    stage === "SELECTING" || stage === "REVEALING" ? " show" : ""
                  }${stage === "REVEALING" ? " reveal" : ""}${
                    stage === "REVEALING" && leadTeam === "A" ? " leading" : ""
                  }`}
                  style={{
                    "--team-color": selectedClip.teamA.color,
                    "--pulse-duration": `${pulseDuration}s`,
                  }}
                  disabled={stage === "REVEALING"}
                  onClick={() => handlePick(selectedClip.teamA.code)}
                >
                  {selectedClip.teamA.flag ? `${selectedClip.teamA.flag} ` : ""}
                  {selectedClip.teamA.label}
                </button>

                <div className="glass-panel video-card">
                  {stage === "REVEALING" ? (
                    <VideoStage
                      key={`reveal-${selectedClip.id}-${replayToken}`}
                      src={selectedClip.overlay}
                      simulateMs={REVEAL_SIMULATE_MS}
                      placeholderHint="점유율이 실시간으로 계산되고 있어요"
                      onProgress={handleRevealProgress}
                      onEnded={handleRevealEnded}
                    />
                  ) : (
                    <VideoStage
                      ref={videoRef}
                      src={selectedClip.original}
                      loop={stage === "SELECTING"}
                      simulateMs={WATCH_SIMULATE_MS}
                      placeholderHint="자동으로 다음 단계로 넘어가요"
                      onProgress={stage === "WATCHING" ? setWatchProgress : undefined}
                      onEnded={() => stage === "WATCHING" && setStage("SELECTING")}
                    />
                  )}

                  {stage === "WATCHING" && (
                    <div className="watch-progress">
                      <div
                        className="watch-progress-fill"
                        style={{ width: `${watchProgress * 100}%` }}
                      />
                    </div>
                  )}

                  {stage === "REVEALING" && (
                    <p className="reveal-prompt">과연 점유율을 더 많이 차지한 팀은?</p>
                  )}
                </div>

                <button
                  type="button"
                  className={`button large side-pick jp${
                    stage === "SELECTING" || stage === "REVEALING" ? " show" : ""
                  }${stage === "REVEALING" ? " reveal" : ""}${
                    stage === "REVEALING" && leadTeam === "B" ? " leading" : ""
                  }`}
                  style={{
                    "--team-color": selectedClip.teamB.color,
                    "--pulse-duration": `${pulseDuration}s`,
                  }}
                  disabled={stage === "REVEALING"}
                  onClick={() => handlePick(selectedClip.teamB.code)}
                >
                  {selectedClip.teamB.flag ? `${selectedClip.teamB.flag} ` : ""}
                  {selectedClip.teamB.label}
                </button>
              </div>
            </div>
          )}

        {stage === "LOADING" && (
          <section className="glass-panel loading-stage">
            <p>결과 영상을 확인해보겠습니다! 🎬</p>
            <div className="loading-dots">
              <span />
              <span />
              <span />
            </div>
          </section>
        )}

        {stage === "REVEALING" && finalRevealed && selectedClip && (
          <ResultModal
            isCorrect={isCorrect}
            winningTeam={winningTeam}
            teamA={selectedClip.teamA}
            teamB={selectedClip.teamB}
            scoreA={selectedClip.scoreA}
            scoreB={selectedClip.scoreB}
            onReset={handleReset}
            onReplay={handleReplay}
          />
        )}
      </main>
    </div>
  );
}
