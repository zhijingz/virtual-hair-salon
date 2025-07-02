import React, { useRef, useEffect, useState } from "react";
import { ImageSegmenter, FilesetResolver } from "@mediapipe/tasks-vision";

function RealTimeHairColor() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [color, setColor] = useState("#3bb3ff"); // sky blue default
  const colorRef = useRef(color);
  const [opacity, setOpacity] = useState(0.2);
  const segmenterRef = useRef(null);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    let animationId;
    let running = true;

    async function setupSegmenter() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      segmenterRef.current = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/hair_segmenter.tflite",
        },
        outputCategoryMask: true,
        runningMode: "VIDEO",
      });
    }

    async function startCamera() {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    }

    async function processFrame() {
      if (
        !segmenterRef.current ||
        !videoRef.current ||
        videoRef.current.readyState !== 4
      ) {
        animationId = requestAnimationFrame(processFrame);
        return;
      }
      const result = await segmenterRef.current.segmentForVideo(
        videoRef.current,
        performance.now()
      );
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const mask = result.categoryMask;
      if (mask && typeof mask.getAsUint8Array === "function") {
        const maskData = mask.getAsUint8Array();
        const maskWidth = mask.width;
        const maskHeight = mask.height;

        // Create the mask canvas
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = maskWidth;
        maskCanvas.height = maskHeight;
        const maskCtx = maskCanvas.getContext("2d");
        const maskImageData = maskCtx.createImageData(maskWidth, maskHeight);

        for (let i = 0; i < maskData.length; ++i) {
          if (maskData[i] === 1) {
            maskImageData.data[i * 4 + 0] = 255;
            maskImageData.data[i * 4 + 1] = 255;
            maskImageData.data[i * 4 + 2] = 255;
            maskImageData.data[i * 4 + 3] = 255;
          } else {
            maskImageData.data[i * 4 + 3] = 0;
          }
        }
        maskCtx.putImageData(maskImageData, 0, 0);

        // Create a temp canvas for coloring
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
        tempCtx.globalCompositeOperation = "source-in";
        tempCtx.globalAlpha = opacity;
        tempCtx.fillStyle = colorRef.current;
        tempCtx.fillRect(0, 0, canvas.width, canvas.height);

        // Overlay the colored mask onto the main canvas
        ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
      }
      if (running) animationId = requestAnimationFrame(processFrame);
    }

    setupSegmenter().then(() => {
      startCamera().then(() => {
        animationId = requestAnimationFrame(processFrame);
      });
    });

    return () => {
      running = false;
      if (animationId) cancelAnimationFrame(animationId);
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [opacity]);

  const handleTakePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "hair-color-photo.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div 
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(120deg,#eaf6ff 0%,#fdf6e3 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: '"DM Serif Display", serif',
      }}
    >
      <div
        style={{
          background: "#fffef9",
          borderRadius: 20,
          boxShadow: "0 4px 32px 0 rgba(60,120,180,0.07)",
          padding: 36,
          maxWidth: 540,
          width: "100%",
          textAlign: "center",
          border: "1.5px solid #e0eaf3",
        }}
      >
        <h2
          style={{
            color: "#3399cc",
            fontWeight: 700,
            marginBottom: 18,
            fontFamily: '"DM Serif Display", serif',
            fontSize: 28,
            letterSpacing: 1,
          }}
        >
          Your Virtual Hair Salon
        </h2>
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          style={{
            width: "100%",
            maxWidth: 480,
            borderRadius: 16,
            boxShadow: "0 2px 16px 0 rgba(52,152,219,0.09)",
            margin: "18px 0",
            background: "#eaf6ff",
            border: "1px solid #cbe7ff",
          }}
        />
        <video
          ref={videoRef}
          width={640}
          height={480}
          autoPlay
          muted
          style={{ display: "none" }}
        />
        <div style={{ marginTop: 18, marginBottom: 18 }}>
          <label
            style={{
              fontWeight: 500,
              fontFamily: '"DM Serif Display", serif',
              color: "#3399cc",
              fontSize: 18,
            }}
          >
            Pick a hair color:{" "}
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              style={{
                marginLeft: 12,
                width: 44,
                height: 44,
                border: "2px solid #b3e0fc",
                background: "#fff",
                borderRadius: 8,
                cursor: "pointer",
              }}
            />
          </label>
        </div>
        <div style={{ marginTop: 10, marginBottom: 10 }}>
          <label
            style={{
              fontWeight: 500,
              fontFamily: '"DM Serif Display", serif',
              color: "#3399cc",
              fontSize: 18,
            }}
          >
            Opacity:
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              style={{
                marginLeft: 12,
                width: 180,
                verticalAlign: "middle",
                accentColor: "#3bb3ff",
              }}
            />
            <span style={{ marginLeft: 10, fontSize: 16, color: "#666" }}>
              {Math.round(opacity * 100)}%
            </span>
          </label>
        </div>
        <button 
          onClick={handleTakePhoto}
          style={{
            marginTop: 18,
            background: "#3bb3ff",
            color: "#fff",
            fontWeight: 700,
            fontFamily: '"DM Serif Display", serif',
            fontSize: 18,
            border: "none",
            borderRadius: 12,
            padding: "12px 22px",
            cursor: "pointer",
            boxShadow: "0 2px 8px 0 rgba(52,152,219,0.10)",
            transition: "background 0.2s",
          }}
        >
          smile 📸 
        </button>
      </div>
    </div>
  );
}

export default RealTimeHairColor;
