import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";

const ASPECT_W = 16;
const ASPECT_H = 9;

/**
 * 실제 영상이 있으면 timeupdate/ended 이벤트로 진행률을 알려주고,
 * 영상이 없거나 로드에 실패하면 동일한 onProgress/onEnded 콜백을
 * 내부 타이머(requestAnimationFrame)로 흉내내서 UI가 항상 같은 방식으로
 * 동작하게 만든다. (실제 영상이 나중에 추가돼도 App.jsx는 그대로 동작)
 *
 * 파일 존재 여부는 <video>의 error 이벤트가 아니라 HEAD 요청으로 먼저 확인한다.
 * Vite 개발 서버는 없는 경로도 SPA 폴백으로 200(index.html)을 돌려주기 때문에,
 * error 이벤트에만 의존하면 브라우저가 이걸 영상이 아니라고 판단할 때까지
 * 판정이 들쭉날쭉하게 늦어져서 시뮬레이션 시작이 지연된다.
 *
 * 크기는 CSS aspect-ratio가 아니라 ResizeObserver로 직접 잰다.
 * (grid/flex 안에서 aspect-ratio + max-width/max-height를 auto 사이징으로
 * 섞으면 브라우저마다 가로/세로 중 한쪽만 맞고 다른 쪽은 비율이 깨지는
 * 문제가 있어서, 남는 공간을 직접 측정해 16:9로 꽉 채우는 정확한
 * px 값을 계산하는 편이 훨씬 안정적이다.)
 */
const VideoStage = forwardRef(function VideoStage(
  { src, loop = false, muted = false, simulateMs = 8000, onEnded, onProgress, placeholderHint },
  ref,
) {
  // "checking" | "ready" | "broken"
  const [status, setStatus] = useState(src ? "checking" : "broken");
  const [size, setSize] = useState(null);
  const rafRef = useRef(null);
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      let w = width;
      let h = (w * ASPECT_H) / ASPECT_W;
      if (h > height) {
        h = height;
        w = (h * ASPECT_W) / ASPECT_H;
      }
      setSize({ width: Math.floor(w), height: Math.floor(h) });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // onProgress/onEnded는 부모가 렌더링될 때마다 새로 만들어지는 인라인 함수라
  // effect 의존성에 직접 넣으면 매 프레임마다 타이머가 재시작돼버린다.
  // ref로 최신 콜백만 들고 있고 effect 자체는 status/loop/simulateMs가
  // 바뀔 때만 재시작하도록 분리한다.
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  onProgressRef.current = onProgress;
  onEndedRef.current = onEnded;

  useEffect(() => {
    if (!src) {
      setStatus("broken");
      return undefined;
    }
    let cancelled = false;
    setStatus("checking");

    fetch(src, { method: "HEAD" })
      .then((res) => {
        if (cancelled) return;
        const contentType = res.headers.get("content-type") || "";
        setStatus(res.ok && contentType.startsWith("video/") ? "ready" : "broken");
      })
      .catch(() => {
        if (!cancelled) setStatus("broken");
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    if (status !== "broken") return undefined;
    let start = performance.now();

    const tick = (now) => {
      const ratio = Math.min(1, (now - start) / simulateMs);
      onProgressRef.current?.(ratio);
      if (ratio >= 1) {
        if (loop) {
          start = now;
          rafRef.current = requestAnimationFrame(tick);
        } else {
          onEndedRef.current?.();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, loop, simulateMs]);

  const handleTimeUpdate = (event) => {
    const video = event.target;
    if (!video.duration) return;
    onProgress?.(video.currentTime / video.duration);
  };

  const stageStyle = size ? { width: size.width, height: size.height } : { opacity: 0 };

  return (
    <div className="video-stage-fit" ref={containerRef}>
      {status !== "ready" ? (
        <div className="video-stage video-stage-empty" style={stageStyle}>
          <span className="video-stage-empty-icon">🎬</span>
          <p>영상 준비 중{placeholderHint ? ` · ${placeholderHint}` : ""}</p>
        </div>
      ) : (
        <div className="video-stage" style={stageStyle}>
          <video
            ref={ref}
            key={src}
            src={src}
            autoPlay
            loop={loop}
            muted={muted}
            playsInline
            onEnded={onEnded}
            onTimeUpdate={handleTimeUpdate}
            onError={() => setStatus("broken")}
          />
        </div>
      )}
    </div>
  );
});

export default VideoStage;
