import React, { useState, useRef } from 'react';

// types
interface SelectedIndices {
  [key: string]: boolean;
}

interface AnalysisResult {
  vegetationCoverage: number;
  vegetationPixels: number;
  totalPixels: number;
  indices: {
    vegetation: Record<string, number>;
    whole: Record<string, number>;
  };
}

interface Algorithm {
    name: string;
    calculate: (r: number, g: number, b: number) => number;
  }

type ThresholdMethod = 'otsu' | 'exg';
type Language = 'ja' | 'en';

// 植生指数の計算アルゴリズム
const ALGORITHMS: Record<string, Algorithm> = {
  INT: {
    name: "Intensity",
    calculate: (r: number, g: number, b: number) => (r + g + b) / 3
  },
  NRI: {
    name: "Normalized Red Index",
    calculate: (r: number, g: number, b: number) => {
      const total = r + g + b;
      return total > 0 ? r / total : 0;
    }
  },
  NGI: {
    name: "Normalized Green Index",
    calculate: (r: number, g: number, b: number) => {
      const total = r + g + b;
      return total > 0 ? g / total : 0;
    }
  },
  NBI: {
    name: "Normalized Blue Index",
    calculate: (r: number, g: number, b: number) => {
      const total = r + g + b;
      return total > 0 ? b / total : 0;
    }
  },
  RGRI: {
    name: "Red Green Ratio Index",
    calculate: (r: number, g: number, b: number) => g > 0 ? r / g : 0
  },
  ExR: {
    name: "Excess Red Index",
    calculate: (r: number, g: number, b: number) => 1.4 * r - g
  },
  ExG: {
    name: "Excess Green Index",
    calculate: (r: number, g: number, b: number) => 2 * g - r - b
  },
  ExB: {
    name: "Excess Blue Index",
    calculate: (r: number, g: number, b: number) => 1.4 * b - g
  },
  ExGR: {
    name: "Excess Green minus Red Index",
    calculate: (r: number, g: number, b: number) => (2 * g - r - b) - (1.4 * r - g)
  },
  GRVI: {
    name: "Green Red Vegetation Index",
    calculate: (r: number, g: number, b: number) => {
      const denom = g + r;
      return denom > 0 ? (g - r) / denom : 0;
    }
  },
  VARI: {
    name: "Visible Atmospherically Resistant Index",
    calculate: (r: number, g: number, b: number) => {
      const denom = g + r - b;
      return denom !== 0 ? (g - r) / denom : 0;
    }
  },
  GLI: {
    name: "Green Leaf Index",
    calculate: (r: number, g: number, b: number) => {
      const denom = 2 * g + r + b;
      return denom !== 0 ? (2 * g - r - b) / denom : 0;
    }
  },
  GLA: {
    name: "Green Leaf Algorithm",
    calculate: (r: number, g: number, b: number) => {
      const denom = 2 * g + r + b;
      return denom !== 0 ? (2 * g - r - b) / denom : 0;
    }
  },
  MGRVI: {
    name: "Modified Green Red Vegetation Index",
    calculate: (r: number, g: number, b: number) => {
      const g2 = g * g;
      const r2 = r * r;
      return (g2 - r2) / (g2 + r2);
    }
  },
  RGBVI: {
    name: "Red Green Blue Vegetation Index",
    calculate: (r: number, g: number, b: number) => {
      const g2 = g * g;
      const rb = r * b;
      return (g2 - rb) / (g2 + rb);
    }
  },
  VEG: {
    name: "Vegetativen",
    calculate: (r: number, g: number, b: number) => {
      const a = 0.667;
      return g / (Math.pow(r, a) * Math.pow(b, (1 - a)));
    }
  }
};

// 言語設定
const translations = {
  ja: {
    title: "植生の解析",
    thresholdMethod: {
      label: "2値化方法",
      otsu: "大津の方法（自動）",
      exg: "ExGによる閾値指定"
    },
    threshold: "ExG閾値",
    algorithm: {
      label: "植生指数",
      ...Object.fromEntries(Object.entries(ALGORITHMS).map(([key, algo]) => [key, algo.name]))
    },
    singleAnalysis: "単一画像解析",
    batchProcessing: {
      title: "バッチ処理",
      start: "バッチ処理開始",
      processing: "処理中..."
    },
    images: {
      original: "元画像",
      processed: "2値化画像"
    },
    results: {
      title: "解析結果",
      coverage: "植生被覆率",
      vegetationPixels: "植生ピクセル数",
      totalPixels: "総ピクセル数",
      indices: "植生指数値",
      vegetationIndices: "植生部分の指数値",
      wholeIndices: "画像全体の指数値"
    },
    errors: {
      processing: "画像の処理中にエラーが発生しました",
      batch: "バッチ処理中にエラーが発生しました"
    },
    description: {
      title: "このツールについて",
      overview: {
        title: "概要",
        content: "このツールは、画像から植生領域を抽出し、様々な植生指数を計算します。"
      },
      usage: {
        title: "使い方",
        steps: [
          "使用したい植生指数のチェックボックスを選択します",
          "2値化方法を選択します（大津の方法：自動、ExG：手動閾値設定）",
          "画像をアップロードすると自動で解析が開始されます",
          "複数の画像を一括処理する場合は、バッチ処理機能を使用してください"
        ]
      }
    }
  },
  en: {
    title: "Vegetation Analysis",
    thresholdMethod: {
      label: "Thresholding Method",
      otsu: "Otsu's Method (Automatic)",
      exg: "ExG Threshold"
    },
    threshold: "ExG Threshold",
    algorithm: {
      label: "Vegetation Index",
      ...Object.fromEntries(Object.entries(ALGORITHMS).map(([key, algo]) => [key, algo.name]))
    },
    singleAnalysis: "Single Image Analysis",
    batchProcessing: {
      title: "Batch Processing",
      start: "Start Batch Processing",
      processing: "Processing..."
    },
    images: {
      original: "Original Image",
      processed: "Binary Image"
    },
    results: {
      title: "Analysis Results",
      coverage: "Vegetation Coverage",
      vegetationPixels: "Vegetation Pixels",
      totalPixels: "Total Pixels",
      indices: "Vegetation Indices",
      vegetationIndices: "Indices (Vegetation Area)",
      wholeIndices: "Indices (Whole Image)"
    },
    errors: {
      processing: "An error occurred while processing the image",
      batch: "An error occurred during batch processing"
    },
    description: {
      title: "About This Tool",
      overview: {
        title: "Overview",
        content: "This tool extracts vegetation areas from images and calculates various vegetation indices."
      },
      usage: {
        title: "How to Use",
        steps: [
          "Select the vegetation indices you want to calculate",
          "Choose the thresholding method (Otsu: automatic, ExG: manual threshold)",
          "Upload an image to start automatic analysis",
          "For multiple images, use the batch processing feature"
        ]
      }
    }
  }
};

// Helper Components
const IndicesSelector: React.FC<{
  selectedIndices: SelectedIndices;
  onSelect: (indices: SelectedIndices) => void;
  t: any;
}> = ({ selectedIndices, onSelect, t }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium">{t.algorithm.label}</label>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {Object.entries(ALGORITHMS).map(([key, algo]) => (
        <label key={key} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selectedIndices[key]}
            onChange={(e) => {
              onSelect({
                ...selectedIndices,
                [key]: e.target.checked
              });
            }}
            className="rounded"
          />
          <span className="text-sm">{algo.name}</span>
        </label>
      ))}
    </div>
  </div>
);

const ThresholdControls: React.FC<{
  method: ThresholdMethod;
  threshold: number;
  onMethodChange: (method: ThresholdMethod) => void;
  onThresholdChange: (value: number) => void;
  t: any;
}> = ({ method, threshold, onMethodChange, onThresholdChange, t }) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <label className="block text-sm font-medium">{t.thresholdMethod.label}</label>
      <div className="flex gap-4">
        <label className="flex items-center">
          <input
            type="radio"
            value="otsu"
            checked={method === 'otsu'}
            onChange={(e) => onMethodChange(e.target.value as ThresholdMethod)}
            className="mr-2"
          />
          {t.thresholdMethod.otsu}
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            value="exg"
            checked={method === 'exg'}
            onChange={(e) => onMethodChange(e.target.value as ThresholdMethod)}
            className="mr-2"
          />
          {t.thresholdMethod.exg}
        </label>
      </div>
    </div>
    {method === 'exg' && (
      <div className="space-y-2">
        <label className="block text-sm font-medium">
          {t.threshold}: {threshold.toFixed(2)}
        </label>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.01"
          value={threshold}
          onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    )}
  </div>
);

// Main Component
const VegetationAnalysis: React.FC = () => {
  // State
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.2);
  const [thresholdMethod, setThresholdMethod] = useState<ThresholdMethod>('otsu');
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [language, setLanguage] = useState<Language>('ja');
  const [selectedIndices, setSelectedIndices] = useState<SelectedIndices>(() => {
    return Object.keys(ALGORITHMS).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as SelectedIndices);
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);

  const t = translations[language];

  // Continue with the rest of the implementation...
  // I'll provide the remaining code in the next part due to length limitations

    // 画像読み込みヘルパー関数
    const loadImage = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
    };

    // 大津の方法による閾値計算
    const calculateOtsuThreshold = (data: Uint8ClampedArray): number => {
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const exg = ((2 * g - r - b) + 510) / 4;
        histogram[Math.round(exg)]++;
    }

    let sumB = 0;
    let wB = 0;
    let wF = 0;
    let maxVar = 0;
    let threshold = 0;
    const total = histogram.reduce((acc, val) => acc + val, 0);
    const sum = histogram.reduce((acc, val, idx) => acc + idx * val, 0);

    for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        wF = total - wB;
        if (wF === 0) break;

        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const variance = wB * wF * Math.pow(mB - mF, 2);

        if (variance > maxVar) {
        maxVar = variance;
        threshold = t;
        }
    }

    return (threshold * 4 - 510) / 510;
    };

    // CSVファイルのダウンロード
    const downloadCSV = (results: Array<AnalysisResult & { filename: string }>) => {
        const selectedKeys = Object.entries(selectedIndices)
          .filter(([_, isSelected]) => isSelected)
          .map(([key]) => key);
        
        // ヘッダーの修正
        const headers = [
          'Filename',
          'Total Pixels',
          'Vegetation Pixels',
          'Vegetation Coverage (%)',
          'Threshold Method',
          'Threshold Value',
          // 植生部分の指数
          ...selectedKeys.map(key => `${ALGORITHMS[key as keyof typeof ALGORITHMS].name} (Vegetation)`),
          // 画像全体の指数
          ...selectedKeys.map(key => `${ALGORITHMS[key as keyof typeof ALGORITHMS].name} (Whole)`)
        ];
        
        // データ行の修正
        const rows = results.map(result => [
          result.filename,
          result.totalPixels,
          result.vegetationPixels,
          result.vegetationCoverage.toFixed(2),
          thresholdMethod,
          thresholdMethod === 'otsu' ? 'auto' : threshold.toFixed(3),
          // 植生部分の指数値
          ...selectedKeys.map(key => result.indices.vegetation[key].toFixed(4)),
          // 画像全体の指数値
          ...selectedKeys.map(key => result.indices.whole[key].toFixed(4))
        ]);
      
        // CSVコンテンツの作成
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.join(','))
        ].join('\n');
      
        // ファイルのダウンロード
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        link.href = URL.createObjectURL(blob);
        link.download = `vegetation_analysis_${date}.csv`;
        link.click();
      };

    // 正規化関数
    const normalizeRGB = (r: number, g: number, b: number): [number, number, number] => {
    const total = r + g + b;
    if (total === 0) return [0, 0, 0];
    return [r / total, g / total, b / total];
    };

    // メインの画像処理関数
    const processImage = async (img: HTMLImageElement, forBatch = false): Promise<AnalysisResult | null> => {
    const canvas = canvasRef.current;
    const originalCanvas = originalCanvasRef.current;
    if (!canvas || !originalCanvas) return null;
    
    const ctx = canvas.getContext('2d');
    const originalCtx = originalCanvas.getContext('2d');
    if (!ctx || !originalCtx) return null;
    
    canvas.width = img.width;
    canvas.height = img.height;
    originalCanvas.width = img.width;
    originalCanvas.height = img.height;
    
    originalCtx.drawImage(img, 0, 0);
    const imageData = originalCtx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let vegetationPixels = 0;
    const totalPixels = canvas.width * canvas.height;
    const vegetationMask: boolean[] = new Array(totalPixels).fill(false);
    
    const currentThreshold = thresholdMethod === 'otsu' 
        ? calculateOtsuThreshold(data)
        : threshold;
    
    const binaryImageData = ctx.createImageData(canvas.width, canvas.height);
    const binaryData = binaryImageData.data;

    const vegetationIndices: Record<string, number> = {};
    const wholeIndices: Record<string, number> = {};
    Object.keys(selectedIndices).forEach(key => {
        if (selectedIndices[key]) {
        vegetationIndices[key] = 0;
        wholeIndices[key] = 0;
        }
    });

    // 各ピクセルの処理
    for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        const pixelIndex = i / 4;
        
        const [normalizedR, normalizedG, normalizedB] = normalizeRGB(r, g, b);

        const exg = 2 * normalizedG - normalizedR - normalizedB;
        const isVegetation = exg >= currentThreshold;
        vegetationMask[pixelIndex] = isVegetation;

        if (isVegetation) {
        vegetationPixels++;
        binaryData[i] = 255;
        binaryData[i + 1] = 255;
        binaryData[i + 2] = 255;
        }
        binaryData[i + 3] = 255;

        Object.entries(selectedIndices).forEach(([key, isSelected]) => {
        if (isSelected) {
            const value = ALGORITHMS[key].calculate(normalizedR, normalizedG, normalizedB);
            wholeIndices[key] += value;
            if (isVegetation) {
            vegetationIndices[key] += value;
            }
        }
        });
    }

    // 平均値の計算
    Object.keys(wholeIndices).forEach(key => {
        wholeIndices[key] /= totalPixels;
        vegetationIndices[key] = vegetationPixels > 0 ? 
        vegetationIndices[key] / vegetationPixels : 0;
    });

    const result: AnalysisResult = {
        vegetationCoverage: (vegetationPixels / totalPixels) * 100,
        vegetationPixels,
        totalPixels,
        indices: {
        vegetation: vegetationIndices,
        whole: wholeIndices
        }
    };

    if (!forBatch) {
        ctx.putImageData(binaryImageData, 0, 0);
        setProcessedImage(canvas.toDataURL());
        setAnalysisResult(result);
    }

    return result;
    };

    // イベントハンドラー
    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        setIsProcessing(true);
        const img = await loadImage(file);
        setOriginalImage(img.src);
        await processImage(img);
    } catch (error) {
        console.error('Image processing error:', error);
        alert(t.errors.processing);
    } finally {
        setIsProcessing(false);
    }
    };

    const handleBatchUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setBatchFiles(files);
    };

    const processBatchImages = async () => {
    setIsProcessing(true);
    const results: Array<AnalysisResult & { filename: string }> = [];

    try {
        for (const file of batchFiles) {
        const img = await loadImage(file);
        const result = await processImage(img, true);
        if (result) {
            results.push({
            filename: file.name,
            ...result
            });
        }
        }
        downloadCSV(results);
    } catch (error) {
        console.error('Batch processing error:', error);
        alert(t.errors.batch);
    } finally {
        setIsProcessing(false);
    }
    };
    return (
        <div className="w-full max-w-6xl mx-auto p-4 space-y-6 bg-white rounded-lg shadow">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <button
              onClick={() => setLanguage(prev => prev === 'ja' ? 'en' : 'ja')}
              className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
            >
              {language === 'ja' ? 'English' : '日本語'}
            </button>
          </div>
    
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded">
              <h2 className="text-lg font-medium mb-2">{t.description.title}</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">{t.description.overview.title}</h3>
                  <p className="text-sm">{t.description.overview.content}</p>
                </div>
                <div>
                  <h3 className="font-medium">{t.description.usage.title}</h3>
                  <ol className="list-decimal list-inside text-sm space-y-1">
                    {t.description.usage.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
    
            <IndicesSelector
              selectedIndices={selectedIndices}
              onSelect={setSelectedIndices}
              t={t}
            />
    
            <ThresholdControls
              method={thresholdMethod}
              threshold={threshold}
              onMethodChange={setThresholdMethod}
              onThresholdChange={setThreshold}
              t={t}
            />
    
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">{t.singleAnalysis}</h3>
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
    
              <div>
                <h3 className="text-lg font-medium mb-2">{t.batchProcessing.title}</h3>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBatchUpload}
                  className="block w-full text-sm text-gray-500 mb-2
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                <button
                  onClick={processBatchImages}
                  disabled={isProcessing || batchFiles.length === 0}
                  className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
                >
                  {isProcessing ? t.batchProcessing.processing : t.batchProcessing.start}
                </button>
              </div>
            </div>
    
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {originalImage && (
                <div>
                  <h3 className="text-lg font-medium mb-2">{t.images.original}</h3>
                  <img
                    src={originalImage}
                    alt="Original"
                    className="w-full h-auto rounded shadow-md"
                  />
                </div>
              )}
              {processedImage && (
                <div>
                  <h3 className="text-lg font-medium mb-2">{t.images.processed}</h3>
                  <img
                    src={processedImage}
                    alt="Processed"
                    className="w-full h-auto rounded shadow-md"
                  />
                </div>
              )}
            </div>
    
            {analysisResult && (
              <div className="p-4 bg-gray-50 rounded">
                <h3 className="text-lg font-medium mb-2">{t.results.title}</h3>
                <div className="space-y-4">
                  <div>
                    <p>{t.results.coverage}: {analysisResult.vegetationCoverage.toFixed(2)}%</p>
                    <p>{t.results.vegetationPixels}: {analysisResult.vegetationPixels.toLocaleString()}</p>
                    <p>{t.results.totalPixels}: {analysisResult.totalPixels.toLocaleString()}</p>
                  </div>
    
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">{t.results.vegetationIndices}</h4>
                      {Object.entries(analysisResult.indices.vegetation)
                        .filter(([key]) => selectedIndices[key])
                        .map(([key, value]) => (
                          <p key={key} className="text-sm">
                            {ALGORITHMS[key].name}: {value.toFixed(4)}
                          </p>
                        ))}
                    </div>
    
                    <div>
                      <h4 className="font-medium mb-2">{t.results.wholeIndices}</h4>
                      {Object.entries(analysisResult.indices.whole)
                        .filter(([key]) => selectedIndices[key])
                        .map(([key, value]) => (
                          <p key={key} className="text-sm">
                            {ALGORITHMS[key].name}: {value.toFixed(4)}
                          </p>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
    
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <canvas ref={originalCanvasRef} style={{ display: 'none' }} />
        </div>
      );
    };
    
    export default VegetationAnalysis;