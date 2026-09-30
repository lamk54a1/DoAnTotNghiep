'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from 'antd';
import { BulbOutlined, CameraOutlined, CloseOutlined } from '@ant-design/icons';
import jsQR from 'jsqr';

interface MobileQrScannerProps {
  disabled?: boolean;
  feedback?: { status: 'info' | 'success' | 'warning' | 'error'; message: string };
  onDetected: (value: string) => Promise<void>;
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
};

export default function MobileQrScanner({ disabled, feedback, onDetected }: MobileQrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const disabledRef = useRef(Boolean(disabled));
  const onDetectedRef = useRef(onDetected);
  const lastScanRef = useRef({ value: '', at: 0 });
  const lastFrameAtRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);

  const stopCamera = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    setActive(false);
    setTorchAvailable(false);
    setTorchEnabled(false);
  };

  const scanFrame = async (frameAt: number) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;

    if (!disabledRef.current && !processingRef.current && frameAt - lastFrameAtRef.current >= 120 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      lastFrameAtRef.current = frameAt;
      const maxWidth = 960;
      const scale = Math.min(1, maxWidth / video.videoWidth);
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = context?.getImageData(0, 0, canvas.width, canvas.height);
      const value = image ? jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })?.data.trim() : '';

      if (value) {
        const duplicate = lastScanRef.current.value === value && frameAt - lastScanRef.current.at < 4000;
        if (!duplicate) {
          lastScanRef.current = { value, at: frameAt };
          processingRef.current = true;
          try {
            await onDetectedRef.current(value);
          } finally {
            window.setTimeout(() => { processingRef.current = false; }, 1200);
          }
        }
      }
    }

    frameRef.current = requestAnimationFrame((timestamp) => { void scanFrame(timestamp); });
  };

  const startCamera = async () => {
    if (disabled) return;
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return stopCamera();
      video.srcObject = stream;
      await video.play();
      const track = stream.getVideoTracks()[0];
      const capabilities = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
      setTorchAvailable(Boolean(capabilities?.torch));
      wakeLockRef.current = await (navigator as NavigatorWithWakeLock).wakeLock?.request('screen').catch(() => null) || null;
      setActive(true);
      frameRef.current = requestAnimationFrame((timestamp) => { void scanFrame(timestamp); });
    } catch {
      stopCamera();
      setError('Không mở được camera. Hãy cho phép quyền Camera trong trình duyệt hoặc nhập mã vé thủ công.');
    }
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchEnabled;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchEnabled(next);
    } catch {
      setTorchAvailable(false);
    }
  };

  useEffect(() => {
    disabledRef.current = Boolean(disabled);
    onDetectedRef.current = onDetected;
  }, [disabled, onDetected]);

  useEffect(() => stopCamera, []);

  return (
    <div className="overflow-hidden rounded-2xl bg-slate-950 shadow-xl">
      <div className="relative aspect-[3/4] max-h-[68vh] w-full bg-black sm:aspect-video">
        <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${active ? 'block' : 'hidden'}`} />
        <canvas ref={canvasRef} className="hidden" />
        {!active && (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-white">
            <CameraOutlined className="text-6xl text-[#edbb00]" />
            <p className="m-0 text-sm text-slate-300">Dùng camera sau và giữ mã QR nằm trọn trong khung.</p>
            <Button type="primary" size="large" icon={<CameraOutlined />} disabled={disabled} onClick={() => void startCamera()}>
              Mở camera quét vé
            </Button>
            {error && <p className="m-0 text-sm font-semibold text-red-300">{error}</p>}
          </div>
        )}
        {active && (
          <>
            <div className="pointer-events-none absolute inset-[14%] rounded-3xl border-4 border-[#edbb00] shadow-[0_0_0_9999px_rgba(0,0,0,.38)]" />
            <div className="absolute left-3 right-3 top-3 flex justify-between">
              <span className="rounded-full bg-black/70 px-3 py-2 text-xs font-bold text-white">Đang quét liên tục</span>
              <div className="flex gap-2">
                {torchAvailable && (
                  <Button shape="circle" icon={<BulbOutlined />} type={torchEnabled ? 'primary' : 'default'} onClick={() => void toggleTorch()} />
                )}
                <Button shape="circle" danger icon={<CloseOutlined />} onClick={stopCamera} />
              </div>
            </div>
            <div className={`absolute bottom-3 left-3 right-3 rounded-xl px-3 py-3 text-center text-sm font-black text-white shadow-lg ${
              feedback?.status === 'success'
                ? 'bg-green-600/95'
                : feedback?.status === 'warning'
                  ? 'bg-amber-500/95 text-slate-950'
                  : feedback?.status === 'error'
                    ? 'bg-red-600/95'
                    : 'bg-black/70'
            }`}>
              {feedback?.message || 'Đưa QR vào khung — hệ thống tự động soát'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
