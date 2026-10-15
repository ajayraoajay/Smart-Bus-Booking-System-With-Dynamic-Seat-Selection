import { useEffect, useState } from "react";
import "./SplashScreen.css";

export default function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("show"), 100);
    const t2 = setTimeout(() => setPhase("exit"), 4000);
    const t3 = setTimeout(() => onFinish(), 4600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <div className={`splash-overlay splash-${phase}`}>
      <div className="splash-content">

        
        <div className="splash-logo">
          <div className="splash-logo-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="6" fill="#2563EB"/>
              <path d="M5 8C5 6.9 5.9 6 7 6H17C18.1 6 19 6.9 19 8V15C19 15.6 18.6 16 18 16H17V17.5C17 17.8 16.8 18 16.5 18H15.5C15.2 18 15 17.8 15 17.5V16H9V17.5C9 17.8 8.8 18 8.5 18H7.5C7.2 18 7 17.8 7 17.5V16H6C5.4 16 5 15.6 5 15V8Z" fill="white"/>
              <rect x="7" y="8.5" width="10" height="4" rx="1" fill="#2563EB"/>
              <circle cx="8.5" cy="14.5" r="1" fill="#2563EB"/>
              <circle cx="15.5" cy="14.5" r="1" fill="#2563EB"/>
            </svg>
          </div>
          <span className="splash-logo-text">BusGo</span>
        </div>

        <p className="splash-tagline">Your Journey, Our Priority</p>

        
        <div className="splash-road-wrap">
          <div className="splash-bus">🚌</div>
          <div className="splash-road">
            <div className="splash-road-dashes" />
          </div>
        </div>

        
        <div className="splash-dots">
          <span /><span /><span />
        </div>

      </div>
    </div>
  );
}
