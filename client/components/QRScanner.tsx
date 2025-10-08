import React, { useEffect, useRef } from "react";
import { Html5Qrcode, type Html5QrcodeCameraScanConfig } from "html5-qrcode";

interface Props {
  onScan: (text: string) => void;
  onError?: (err: string) => void;
  fps?: number;
}

export default function QRScanner({ onScan, onError, fps = 10 }: Props) {
  const idRef = useRef(`qr-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const start = async () => {
      try {
        const elmId = idRef.current;
        const scanner = new Html5Qrcode(elmId);
        scannerRef.current = scanner;
        const config: Html5QrcodeCameraScanConfig = {
          fps,
          qrbox: { width: 250, height: 250 },
        };
        const devices = await Html5Qrcode.getCameras();
        const cameraId = devices?.[0]?.id;
        if (!cameraId) throw new Error("No camera found");
        await scanner.start(
          cameraId,
          config,
          (decoded) => onScan(decoded),
          (err) => onError?.(String(err)),
        );
      } catch (e: any) {
        onError?.(String(e?.message || e));
      }
    };
    start();
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => undefined);
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div id={idRef.current} className="rounded border overflow-hidden" />;
}
