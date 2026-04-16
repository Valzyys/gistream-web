import { useEffect, useRef } from "react";

export default function GridShape() {
  const shineRef1 = useRef<HTMLDivElement>(null);
  const shineRef2 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes shine-ltr {
        0% {
          transform: translateX(-100%) skewX(-15deg);
          opacity: 0;
        }
        10% {
          opacity: 1;
        }
        90% {
          opacity: 1;
        }
        100% {
          transform: translateX(400%) skewX(-15deg);
          opacity: 0;
        }
      }

      @keyframes shine-rtl {
        0% {
          transform: translateX(400%) skewX(-15deg);
          opacity: 0;
        }
        10% {
          opacity: 1;
        }
        90% {
          opacity: 1;
        }
        100% {
          transform: translateX(-100%) skewX(-15deg);
          opacity: 0;
        }
      }

      .shine-ltr {
        animation: shine-ltr 3.5s ease-in-out infinite;
        animation-delay: 0.5s;
      }

      .shine-rtl {
        animation: shine-rtl 3.5s ease-in-out infinite;
        animation-delay: 2s;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      {/* Top Right */}
      <div className="absolute right-0 top-0 -z-1 w-full max-w-[250px] xl:max-w-[450px] overflow-hidden">
        <img src="/images/shape/grid-01.svg" alt="grid" />
        {/* Shine overlay */}
        <div
          ref={shineRef1}
          className="shine-ltr pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
            width: "40%",
            height: "100%",
            top: 0,
            left: 0,
          }}
        />
      </div>

      {/* Bottom Left */}
      <div className="absolute bottom-0 left-0 -z-1 w-full max-w-[250px] rotate-180 xl:max-w-[450px] overflow-hidden">
        <img src="/images/shape/grid-01.svg" alt="grid" />
        {/* Shine overlay */}
        <div
          ref={shineRef2}
          className="shine-rtl pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
            width: "40%",
            height: "100%",
            top: 0,
            left: 0,
          }}
        />
      </div>
    </>
  );
}
