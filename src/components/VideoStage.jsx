import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

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
  {
    src,
    loop = false,
    muted = false,
    simulateMs = 8000,
    onEnded,
    onProgress,
    onDuration,
    placeholderHint,
  },
  ref,
) {
  // "checking" | "ready" | "broken"
  const [status, setStatus] = useState(src ? "checking" : "broken");
  const [size, setSize] = useState(null);
  const rafRef = useRef(null);
  const containerRef = useRef(null);
  const videoElRef = useRef(null);
  // 시뮬레이션(폴백) 진행률 타이머의 시작 시각. restart()가 외부에서
  // 이 값을 리셋할 수 있도록 effect 지역 변수 대신 ref로 들고 있는다.
  const simStartRef = useRef(0);
  // 일시정지 중에는 시뮬레이션 진행률이 멈춰야 하므로, 멈춘 시각과 그동안
  // 누적된 정지 시간을 따로 들고 있다가 경과 시간 계산에서 빼준다.
  const simPausedRef = useRef(false);
  const simPausedAtRef = useRef(0);
  const simPauseOffsetRef = useRef(0);

  // 부모(App.jsx)가 실제 <video> DOM을 직접 다루지 않고도 재생을 제어할 수
  // 있도록 pause/play/restart를 노출한다. 실제 영상 파일이 없어 시뮬레이션
  // 중인 경우(파일 미존재 폴백)에도 동일하게 일시정지/재생/재시작이 되어야
  // 하므로 두 경로를 분기해서 처리한다.
  useImperativeHandle(
    ref,
    () => ({
      pause: () => {
        videoElRef.current?.pause?.();
        if (!simPausedRef.current) {
          simPausedRef.current = true;
          simPausedAtRef.current = performance.now();
        }
      },
      play: () => {
        videoElRef.current?.play?.()?.catch?.(() => {});
        if (simPausedRef.current) {
          simPauseOffsetRef.current += performance.now() - simPausedAtRef.current;
          simPausedRef.current = false;
        }
      },
      restart: () => {
        const video = videoElRef.current;
        if (video) {
          video.currentTime = 0;
          video.play?.()?.catch?.(() => {});
        }
        simStartRef.current = performance.now();
        simPauseOffsetRef.current = 0;
        simPausedRef.current = false;
      },
    }),
    [],
  );

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
  const onDurationRef = useRef(onDuration);
  onProgressRef.current = onProgress;
  onEndedRef.current = onEnded;
  onDurationRef.current = onDuration;

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
    onDurationRef.current?.(simulateMs / 1000);
    simStartRef.current = performance.now();
    simPauseOffsetRef.current = 0;
    simPausedRef.current = false;

    const tick = (now) => {
      if (simPausedRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const ratio = Math.min(
        1,
        (now - simStartRef.current - simPauseOffsetRef.current) / simulateMs,
      );
      onProgressRef.current?.(ratio);
      if (ratio >= 1) {
        if (loop) {
          simStartRef.current = now;
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

  const handleLoadedMetadata = (event) => {
    const { duration } = event.target;
    if (Number.isFinite(duration)) onDuration?.(duration);
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
            ref={videoElRef}
            key={src}
            src={src}
            autoPlay
            loop={loop}
            muted={muted}
            playsInline
            onEnded={onEnded}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={() => setStatus("broken")}
          />
        </div>
      )}
    </div>
  );
});

export default VideoStage;
