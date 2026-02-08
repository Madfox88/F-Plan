import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import './AvatarCropperModal.css';

interface AvatarCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onConfirm: (blob: Blob) => void;
}

const CROP_SIZE = 280;
const OUTPUT_SIZE = 512;

export function AvatarCropperModal({ isOpen, imageSrc, onClose, onConfirm }: AvatarCropperModalProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });

  const baseScale = useMemo(() => {
    if (!imageSize) return 1;
    return Math.max(CROP_SIZE / imageSize.width, CROP_SIZE / imageSize.height);
  }, [imageSize]);

  const displayScale = baseScale * zoom;

  const clampPosition = (next: { x: number; y: number }) => {
    if (!imageSize) return next;
    const displayWidth = imageSize.width * displayScale;
    const displayHeight = imageSize.height * displayScale;
    const maxX = Math.max(0, (displayWidth - CROP_SIZE) / 2);
    const maxY = Math.max(0, (displayHeight - CROP_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  };

  useEffect(() => {
    setPosition((prev) => clampPosition(prev));
  }, [zoom, imageSize]);

  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [imageSrc]);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = event.clientX - dragStart.current.x;
      const dy = event.clientY - dragStart.current.y;
      setPosition(
        clampPosition({
          x: positionStart.current.x + dx,
          y: positionStart.current.y + dy,
        })
      );
    };

    const handleUp = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [displayScale, imageSize]);

  const handlePointerDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    dragStart.current = { x: event.clientX, y: event.clientY };
    positionStart.current = position;
  };

  const handleConfirm = async () => {
    if (!imageRef.current || !imageSize) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const displayWidth = imageSize.width * displayScale;
    const displayHeight = imageSize.height * displayScale;
    const centerX = CROP_SIZE / 2 + position.x;
    const centerY = CROP_SIZE / 2 + position.y;
    const imageLeft = centerX - displayWidth / 2;
    const imageTop = centerY - displayHeight / 2;

    const sx = (0 - imageLeft) / displayScale;
    const sy = (0 - imageTop) / displayScale;
    const sSize = CROP_SIZE / displayScale;

    ctx.drawImage(imageRef.current, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob((blob) => {
      if (blob) onConfirm(blob);
    }, 'image/jpeg', 0.9);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="avatar-cropper-modal modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Crop Avatar</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M18 6L6 18M6 6L18 18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="avatar-cropper-viewport" onMouseDown={handlePointerDown}>
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop preview"
              className="avatar-cropper-image"
              style={{
                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${displayScale})`,
              }}
              onLoad={(event) => {
                const target = event.currentTarget;
                setImageSize({ width: target.naturalWidth, height: target.naturalHeight });
              }}
              draggable={false}
            />
          </div>
          <div className="avatar-cropper-controls">
            <label htmlFor="avatar-zoom" className="avatar-cropper-label">Zoom</label>
            <input
              id="avatar-zoom"
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleConfirm}>Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
