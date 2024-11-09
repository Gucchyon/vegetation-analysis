import React, { useState, useRef } from 'react';

// 型定義
type Language = 'ja' | 'en';
type ThresholdMethod = 'otsu' | 'exg';

interface Translations {
  ja: TranslationData;
  en: TranslationData;
}

interface TranslationData {
  title: string;
  thresholdMethod: {
    label: string;
    otsu: string;
    exg: string;
  };
  upload: string;
  processing: string;
}

const translations: Translations = {
  ja: {
    title: "植生解析",
    thresholdMethod: {
      label: "2値化方法",
      otsu: "大津の方法（自動）",
      exg: "ExGによる閾値指定"
    },
    upload: "画像をアップロード",
    processing: "処理中..."
  },
  en: {
    title: "Vegetation Analysis",
    thresholdMethod: {
      label: "Thresholding Method",
      otsu: "Otsu's Method (Automatic)",
      exg: "ExG Threshold"
    },
    upload: "Upload Image",
    processing: "Processing..."
  }
};

const VegetationAnalysis: React.FC = () => {
  // ステート定義
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<number>(0.2);
  const [thresholdMethod, setThresholdMethod] = useState<ThresholdMethod>('otsu');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>('ja');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const t = translations[language];

  // 画像処理関数
  const processImage = async (img: HTMLImageElement): Promise<void> => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 簡単な植生解析の例（緑色の強調）
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // ExG (Excess Green) インデックスの計算
      const exg = 2 * g - r - b;
      
      // 2値化
      const isVegetation = exg > threshold * 255;
      
      data[i] = isVegetation ? 255 : 0;     // R
      data[i + 1] = isVegetation ? 255 : 0; // G
      data[i + 2] = isVegetation ? 255 : 0; // B
    }

    ctx.putImageData(imageData, 0, 0);
    setProcessedImage(canvas.toDataURL());
  };

  // ファイルアップロードハンドラ
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsProcessing(true);
    
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result;
      if (typeof result !== 'string') return;

      const img = new Image();
      img.onload = () => {
        setOriginalImage(result);
        processImage(img).finally(() => setIsProcessing(false));
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <button
          onClick={() => setLanguage(prev => prev === 'ja' ? 'en' : 'ja')}
          className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200"
        >
          {language === 'ja' ? 'English' : '日本語'}
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            {t.thresholdMethod.label}
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="otsu"
                checked={thresholdMethod === 'otsu'}
                onChange={(e) => setThresholdMethod(e.target.value as ThresholdMethod)}
                className="mr-2"
              />
              {t.thresholdMethod.otsu}
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="exg"
                checked={thresholdMethod === 'exg'}
                onChange={(e) => setThresholdMethod(e.target.value as ThresholdMethod)}
                className="mr-2"
              />
              {t.thresholdMethod.exg}
            </label>
          </div>
        </div>

        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {originalImage && (
            <div>
              <h3 className="text-lg font-medium mb-2">Original Image</h3>
              <img
                src={originalImage}
                alt="Original"
                className="w-full h-auto rounded shadow-md"
              />
            </div>
          )}
          {processedImage && (
            <div>
              <h3 className="text-lg font-medium mb-2">Processed Image</h3>
              <img
                src={processedImage}
                alt="Processed"
                className="w-full h-auto rounded shadow-md"
              />
            </div>
          )}
        </div>
      </div>
      
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={originalCanvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default VegetationAnalysis;