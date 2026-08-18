import React from "react";

export default function LoadingOverlay({ loading }: { loading: boolean }) {
  if (!loading) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(255,255,255,0.5)",
        backdropFilter: "blur(2px)",
        zIndex: 9999,
        pointerEvents: "auto",
      }}
    />
  );
}