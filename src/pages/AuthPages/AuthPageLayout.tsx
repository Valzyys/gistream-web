import React from "react";
import { Link } from "react-router";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";
import FaultyTerminal from "../../components/common/FaultyTerminal";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-brand-950 dark:bg-white/5 lg:grid overflow-hidden">
          <div className="relative flex items-center justify-center w-full h-full">

            {/* ===== Faulty Terminal Background ===== */}
            <div className="absolute inset-0 w-full h-full opacity-40">
              <FaultyTerminal
                scale={1.5}
                gridMul={[2, 1]}
                digitSize={1.2}
                timeScale={0.4}
                pause={false}
                scanlineIntensity={0.4}
                glitchAmount={0.6}
                flickerAmount={0.5}
                noiseAmp={1}
                chromaticAberration={0}
                dither={0}
                curvature={0.1}
                tint="#4f8ef7"
                mouseReact={true}
                mouseStrength={0.3}
                pageLoadAnimation={true}
                brightness={1}
              />
            </div>

            <div className="relative flex flex-col items-center max-w-xs z-10">
              <Link to="/" className="block mb-4">
                <img
                  width={231}
                  height={48}
                  src="/images/logo/auth-logo.svg"
                  alt="Logo"
                />
              </Link>
              <p className="text-center text-gray-400 dark:text-white/60">
                The Most Affordable Live Streaming Platform for JKT48 Theater
              </p>
            </div>
          </div>
        </div>
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
