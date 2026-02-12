import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, RotateCcw, Check } from 'lucide-react';

export const PhotoCapture = ({ onCapture, onClear }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState(null);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhoto(dataUrl);
      onCapture?.(dataUrl);
      stopCamera();
    }
  };

  const retakePhoto = () => {
    setPhoto(null);
    onClear?.();
    startCamera();
  };

  const clearPhoto = () => {
    setPhoto(null);
    onClear?.();
    stopCamera();
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] bg-slate-800 rounded-lg overflow-hidden">
        {!cameraActive && !photo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Camera className="w-12 h-12 text-slate-500 mb-3" />
            <Button
              onClick={startCamera}
              className="bg-teal-600 hover:bg-teal-700"
              data-testid="start-camera-btn"
            >
              <Camera className="w-4 h-4 mr-2" />
              Open Camera
            </Button>
            {error && (
              <p className="text-red-400 text-sm mt-3 text-center px-4">{error}</p>
            )}
          </div>
        )}
        
        {cameraActive && !photo && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
              <Button
                onClick={stopCamera}
                variant="outline"
                size="sm"
                className="bg-slate-900/70 border-slate-600"
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                onClick={capturePhoto}
                size="lg"
                className="bg-teal-600 hover:bg-teal-700 rounded-full w-16 h-16"
                data-testid="capture-photo-btn"
              >
                <Camera className="w-6 h-6" />
              </Button>
            </div>
          </>
        )}
        
        {photo && (
          <>
            <img src={photo} alt="Captured" className="w-full h-full object-cover" />
            <div className="absolute top-2 right-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearPhoto}
                className="bg-slate-900/70 border-slate-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
      
      <canvas ref={canvasRef} className="hidden" />
      
      {photo && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={retakePhoto}
            className="flex-1 border-slate-600"
            data-testid="retake-photo-btn"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Retake
          </Button>
          <Button
            size="sm"
            disabled
            className="flex-1 bg-green-600"
          >
            <Check className="w-4 h-4 mr-2" />
            Photo Captured
          </Button>
        </div>
      )}
    </div>
  );
};

export default PhotoCapture;
