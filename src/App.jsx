import { useEffect, useRef, useState } from "react";
import TopBar from "./components/TopBar.jsx";
import StepIndicator from "./components/StepIndicator.jsx";
import Wheel from "./components/Wheel.jsx";
import VideoStage from "./components/VideoStage.jsx";
import CountdownBadge from "./components/CountdownBadge.jsx";
import ResultModal from "./components/ResultModal.jsx";
import { clips } from "./data/clips.js";

const NUMBERS = clips.map((clip) => clip.id);
const SEGMENT_ANGLE = 360 / NUMBERS.length;
const SPIN_DURATION_MS = 3200;
const WATCH_SIMULATE_MS = 8000;
const LOADING_DURATION_MS = 5000;
const REVEAL_SIMULATE_MS = 7000;
// 결과 공개 중 좌우 버튼이 번갈아 나타났다 사라지는 간격: 영상 초반엔
// 느긋하게 바뀌다가, 끝에 가까울수록 점점 빠르게 번갈아 바뀐다. 어느 팀이
// 실제로 이겼는지와는 무관한 순수 연출(서스펜스)이고, 클립마다 실제 영상
// 길이가 달라도 항상 같은 실시간 리듬으로 느껴지도록 (영상 진행률이 아니라)
// REVEALING 진입 후 경과한 실제 시간을 기준으로 계산한다.
const SWAP_INTERVAL_START_MS = 650;
const SWAP_INTERVAL_END_MS = 220;
const SWAP_HOLD_MS = 1000;
const SWAP_RAMP_MS = 3000;

// 로딩 화면에 타이핑 애니메이션으로 보여줄 설명 문구
const LOADING_LINES = [
  "선수 · 축구공 · 골키퍼 · 심판 · 스태프를 탐지하고 있어요 🔍",
  "선수와 공 사이의 거리를 계산해서 점유율을 계산해요 📊",
];
const LOADING_TYPE_START_DELAY_MS = 150;
const LOADING_LINE_GAP_MS = 300;
// 문구가 다 타이핑된 뒤 바로 결과 화면으로 넘어가지 않고, 다 읽을 시간을
// 주기 위해 잠시 더 머무른다.
const LOADING_TRAILING_HOLD_MS = 1500;

// 이모지(ZWJ 시퀀스 등)가 타이핑 도중 잘려서 깨지지 않도록 자소 단위로 분리
function splitGraphemes(text) {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    return Array.from(
      new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(text),
      (s) => s.segment,
    );
  }
  return Array.from(text);
}

const LOADING_GRAPHEMES = LOADING_LINES.map(splitGraphemes);
const LOADING_TOTAL_CHARS = LOADING_GRAPHEMES.reduce((sum, g) => sum + g.length, 0);
// 타이핑 예산을 전체 로딩 시간에서 역산해서, 문구를 나중에 바꿔도
// "다 치기 전에 로딩이 끝나거나" "다 친 뒤 너무 오래 노는" 문제가 안 생기게 한다.
const LOADING_TYPE_BUDGET_MS = Math.max(
  200,
  LOADING_DURATION_MS -
    LOADING_TYPE_START_DELAY_MS -
    LOADING_LINE_GAP_MS -
    LOADING_TRAILING_HOLD_MS,
);
const LOADING_CHAR_INTERVAL_MS = LOADING_TYPE_BUDGET_MS / LOADING_TOTAL_CHARS;

// "시작하기"를 누른 뒤 원본 영상이 재생되기 전, 마음의 준비를 할 수 있도록
// 보여주는 3-2-1 카운트다운. 문구는 로딩 화면과 같은 방식으로 타이핑된다.
const COUNTDOWN_START = 3;
const COUNTDOWN_STEP_MS = 1000;
const COUNTDOWN_TEXT = "영상이 곧 시작합니다";
const COUNTDOWN_GRAPHEMES = splitGraphemes(COUNTDOWN_TEXT);
const COUNTDOWN_CHAR_INTERVAL_MS = 55;

const STAGE_TO_STEP = {
  INTRO: 1,
  COUNTDOWN: 2,
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
  const [finalRevealed, setFinalRevealed] = useState(false);
  const [replayToken, setReplayToken] = useState(0);
  const [introPreviewIndex, setIntroPreviewIndex] = useState(0);
  const [line1Chars, setLine1Chars] = useState(0);
  const [line2Chars, setLine2Chars] = useState(0);
  // WATCHING(원본 영상)과 REVEALING(결과 영상)이 공유하는 카운트다운
  // 타이머 상태 — 두 단계가 동시에 활성화될 일이 없어 하나로 공유한다.
  const [videoDuration, setVideoDuration] = useState(null);
  const [videoRemaining, setVideoRemaining] = useState(null);
  const [videoElapsedRatio, setVideoElapsedRatio] = useState(0);
  const [countdownValue, setCountdownValue] = useState(COUNTDOWN_START);
  const [countdownTextChars, setCountdownTextChars] = useState(0);

  const spinCountRef = useRef(0);
  const spinTimeoutRef = useRef(null);
  const videoRef = useRef(null);
  const revealVideoRef = useRef(null);
  const finalRevealedRef = useRef(false);

  const selectedClip = pickedNumber
    ? clips.find((clip) => clip.id === pickedNumber)
    : null;

  useEffect(() => () => clearTimeout(spinTimeoutRef.current), []);

  useEffect(() => {
    if (stage !== "LOADING") return;
    const timer = setTimeout(() => setStage("REVEALING"), LOADING_DURATION_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  // 로딩 화면 설명 문구 타이핑 애니메이션: 한 글자씩 밀어 넣다가 첫 줄이
  // 끝나면 둘째 줄을 시작한다. 재귀 setTimeout을 쓰는 이유는 줄 사이 간격과
  // 글자당 간격이 달라 단일 setInterval로는 표현할 수 없기 때문.
  useEffect(() => {
    if (stage !== "LOADING") return undefined;
    setLine1Chars(0);
    setLine2Chars(0);

    let cancelled = false;
    let lineIndex = 0;
    let charIndex = 0;
    let timer = null;
    const setters = [setLine1Chars, setLine2Chars];

    const typeNext = () => {
      if (cancelled) return;
      const currentLine = LOADING_GRAPHEMES[lineIndex];
      if (charIndex >= currentLine.length) {
        lineIndex += 1;
        charIndex = 0;
        if (lineIndex >= LOADING_GRAPHEMES.length) return;
        timer = setTimeout(typeNext, LOADING_LINE_GAP_MS);
        return;
      }
      charIndex += 1;
      setters[lineIndex](charIndex);
      timer = setTimeout(typeNext, LOADING_CHAR_INTERVAL_MS);
    };

    timer = setTimeout(typeNext, LOADING_TYPE_START_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [stage]);

  // "영상이 곧 시작합니다" 타이핑 애니메이션 (카운트다운 화면 전용)
  useEffect(() => {
    if (stage !== "COUNTDOWN") return undefined;
    setCountdownTextChars(0);

    let cancelled = false;
    let charIndex = 0;
    let timer = null;

    const typeNext = () => {
      if (cancelled) return;
      if (charIndex >= COUNTDOWN_GRAPHEMES.length) return;
      charIndex += 1;
      setCountdownTextChars(charIndex);
      timer = setTimeout(typeNext, COUNTDOWN_CHAR_INTERVAL_MS);
    };

    timer = setTimeout(typeNext, COUNTDOWN_CHAR_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [stage]);

  // 3 → 2 → 1 숫자 카운트다운. 다 세면 원본 영상 시청(WATCHING)으로 넘어간다.
  useEffect(() => {
    if (stage !== "COUNTDOWN") return undefined;
    setCountdownValue(COUNTDOWN_START);

    let cancelled = false;
    let value = COUNTDOWN_START;
    let timer = null;

    const tick = () => {
      if (cancelled) return;
      value -= 1;
      if (value <= 0) {
        setWatchProgress(0);
        setVideoDuration(null);
        setVideoRemaining(null);
        setVideoElapsedRatio(0);
        setStage("WATCHING");
        return;
      }
      setCountdownValue(value);
      timer = setTimeout(tick, COUNTDOWN_STEP_MS);
    };

    timer = setTimeout(tick, COUNTDOWN_STEP_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [stage]);

  useEffect(() => {
    finalRevealedRef.current = finalRevealed;
  }, [finalRevealed]);

  // REVEALING 진입(및 "결과 영상 다시보기")마다 재시작되는 좌우 교대 타이머.
  // 어느 팀이 이길지와 무관하게, 실제 경과 시간을 기준으로 A/B를 번갈아
  // 보여준다 — 클립마다 실제 영상 길이가 달라도 항상 같은 실시간 리듬
  // (초반엔 느긋하게 → 후반엔 빠르게)으로 번갈아 바뀐다. 최종 정답은
  // handleRevealEnded/handleSkipReveal이 별도로 확정한다.
  useEffect(() => {
    if (stage !== "REVEALING") return undefined;

    setLeadTeam("A");
    setFinalRevealed(false);
    setVideoDuration(null);
    setVideoRemaining(null);
    setVideoElapsedRatio(0);

    const start = performance.now();
    let current = "A";
    let timer = null;

    const intervalAt = (elapsed) => {
      if (elapsed >= SWAP_HOLD_MS + SWAP_RAMP_MS) return SWAP_INTERVAL_END_MS;
      if (elapsed <= SWAP_HOLD_MS) return SWAP_INTERVAL_START_MS;
      const rampRatio = (elapsed - SWAP_HOLD_MS) / SWAP_RAMP_MS;
      return (
        SWAP_INTERVAL_START_MS - (SWAP_INTERVAL_START_MS - SWAP_INTERVAL_END_MS) * rampRatio
      );
    };

    const scheduleNext = () => {
      const elapsed = performance.now() - start;
      timer = setTimeout(() => {
        if (finalRevealedRef.current) return;
        current = current === "A" ? "B" : "A";
        setLeadTeam(current);
        scheduleNext();
      }, intervalAt(elapsed));
    };

    scheduleNext();
    return () => clearTimeout(timer);
  }, [stage, replayToken]);

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

  const handleRespin = () => {
    setPickedNumber(null);
  };

  const handleStart = () => {
    setStage("COUNTDOWN");
  };

  const handlePick = (teamCode) => {
    setUserPick(teamCode);
    setStage("LOADING");
  };

  const handleWatchProgress = (ratio) => {
    setWatchProgress(ratio);
    setVideoElapsedRatio(ratio);
    if (videoDuration != null) {
      setVideoRemaining(Math.max(0, Math.ceil(videoDuration * (1 - ratio))));
    }
  };

  const handleWatchReplay = () => {
    videoRef.current?.restart?.();
    setWatchProgress(0);
    setVideoElapsedRatio(0);
    if (videoDuration != null) setVideoRemaining(Math.ceil(videoDuration));
  };

  const handleRevealProgress = (ratio) => {
    if (!selectedClip) return;
    setVideoElapsedRatio(ratio);
    if (videoDuration != null) {
      setVideoRemaining(Math.max(0, Math.ceil(videoDuration * (1 - ratio))));
    }
  };

  const handleVideoDuration = (seconds) => {
    setVideoDuration(seconds);
    setVideoRemaining(Math.ceil(seconds));
  };

  const handleRevealEnded = () => {
    if (!selectedClip) return;
    setLeadTeam(selectedClip.scoreA >= selectedClip.scoreB ? "A" : "B");
    setFinalRevealed(true);
  };

  const handleSkipReveal = () => {
    revealVideoRef.current?.pause?.();
    handleRevealEnded();
  };

  const handleReplay = () => {
    setFinalRevealed(false);
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
          <div className="intro-layout">
            <div className="glass-panel intro-preview">
              <VideoStage
                key={`intro-preview-${introPreviewIndex}`}
                src={clips[introPreviewIndex].overlay}
                muted
                simulateMs={WATCH_SIMULATE_MS}
                placeholderHint="추적 결과 영상 예시"
                onEnded={() =>
                  setIntroPreviewIndex((i) => (i + 1) % clips.length)
                }
              />
              <p className="intro-preview-caption">
                실제 추적 결과 영상은 이렇게 보여요
              </p>
            </div>

            <section className="glass-panel intro">
              <h2>⚽ 점유율 퀴즈</h2>
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
                  <button type="button" className="button ghost" onClick={handleRespin}>
                    다시 뽑기
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {stage === "COUNTDOWN" && (
          <section className="glass-panel countdown-stage">
            <p className="countdown-caption">
              {COUNTDOWN_GRAPHEMES.slice(0, countdownTextChars).join("")}
              {countdownTextChars < COUNTDOWN_GRAPHEMES.length && (
                <span className="loading-caret" aria-hidden="true" />
              )}
            </p>
            <span key={countdownValue} className="countdown-number">
              {countdownValue}
            </span>
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
                  style={{ "--team-color": selectedClip.teamA.color }}
                  disabled={stage === "REVEALING"}
                  onClick={() => handlePick(selectedClip.teamA.code)}
                >
                  {selectedClip.teamA.flag ? `${selectedClip.teamA.flag} ` : ""}
                  {selectedClip.teamA.label}
                </button>

                <div className="glass-panel video-card">
                  {stage === "REVEALING" && !finalRevealed && (
                    <CountdownBadge remaining={videoRemaining} elapsedRatio={videoElapsedRatio} />
                  )}
                  {stage === "WATCHING" && (
                    <CountdownBadge remaining={videoRemaining} elapsedRatio={videoElapsedRatio} />
                  )}

                  {stage === "REVEALING" ? (
                    <VideoStage
                      ref={revealVideoRef}
                      key={`reveal-${selectedClip.id}-${replayToken}`}
                      src={selectedClip.overlay}
                      simulateMs={REVEAL_SIMULATE_MS}
                      placeholderHint="점유율이 실시간으로 계산되고 있어요"
                      onProgress={handleRevealProgress}
                      onDuration={handleVideoDuration}
                      onEnded={handleRevealEnded}
                    />
                  ) : (
                    <VideoStage
                      ref={videoRef}
                      src={selectedClip.original}
                      loop={stage === "SELECTING"}
                      simulateMs={WATCH_SIMULATE_MS}
                      placeholderHint="자동으로 다음 단계로 넘어가요"
                      onProgress={stage === "WATCHING" ? handleWatchProgress : undefined}
                      onDuration={handleVideoDuration}
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
                  style={{ "--team-color": selectedClip.teamB.color }}
                  disabled={stage === "REVEALING"}
                  onClick={() => handlePick(selectedClip.teamB.code)}
                >
                  {selectedClip.teamB.flag ? `${selectedClip.teamB.flag} ` : ""}
                  {selectedClip.teamB.label}
                </button>
              </div>

              {stage === "SELECTING" && (
                <button
                  type="button"
                  className="button ghost watch-replay-button"
                  onClick={handleWatchReplay}
                >
                  다시보기
                </button>
              )}

              {stage === "REVEALING" && !finalRevealed && (
                <button
                  type="button"
                  className="button ghost skip-reveal-button"
                  onClick={handleSkipReveal}
                >
                  결과 바로보기
                </button>
              )}
            </div>
          )}

        {stage === "LOADING" && (
          <section className="glass-panel loading-stage">
            <div className="loading-text">
              <p className="loading-line">
                {LOADING_GRAPHEMES[0].slice(0, line1Chars).join("")}
                {line1Chars < LOADING_GRAPHEMES[0].length && (
                  <span className="loading-caret" aria-hidden="true" />
                )}
              </p>
              {line1Chars >= LOADING_GRAPHEMES[0].length && (
                <p className="loading-line">
                  {LOADING_GRAPHEMES[1].slice(0, line2Chars).join("")}
                  {line2Chars < LOADING_GRAPHEMES[1].length && (
                    <span className="loading-caret" aria-hidden="true" />
                  )}
                </p>
              )}
            </div>
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
