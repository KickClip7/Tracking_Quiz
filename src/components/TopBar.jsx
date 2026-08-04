import kickclipLogoUrl from "../assets/kickclip-login-logo.svg";

export default function TopBar({ showBack, onBack }) {
  return (
    <header className="quiz-topbar">
      {showBack ? (
        <button type="button" className="back-button" onClick={onBack} aria-label="뒤로가기">
          ‹ 뒤로
        </button>
      ) : (
        <span className="back-button-spacer" />
      )}
      <div className="quiz-brand">
        <img src={kickclipLogoUrl} alt="" className="quiz-brand-mark" />
        <span>KICKCLIP 점유율 퀴즈</span>
      </div>
      <span className="back-button-spacer" />
    </header>
  );
}
