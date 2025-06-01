import React, { useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/library';

const QRReader = () => {
  const [scanResult, setScanResult] = useState(null);

  const handleScan = (result) => {
    setScanResult(result);
  };

  const handleError = (error) => {
    console.error(error);
  };

  const startScan = () => {
    const codeReader = new BrowserQRCodeReader();
    codeReader
      .decodeOnceFromVideoDevice(null, 'video')
      .then(handleScan)
      .catch(handleError);
  };

  return (
    <div className="flex flex-col w-full h-full p-6 bg-black overflow-y-auto">
      <h1 className="text-4xl font-bold text-orange-500 mb-4">QR Code Scanner</h1>
      <p className="text-lg text-white mb-6">
        Scan a QR code using your camera. The result will be displayed below.
      </p>

      {/* QR Code Scanner */}
      <div className="mb-6">
        <video id="video" className="w-full h-auto border-2 border-gray-700 rounded-md shadow-lg"></video>
      </div>

      {/* Start Scan Button */}
      <button
        onClick={startScan}
        className="px-6 py-3 bg-orange-500 text-white font-bold rounded-md hover:bg-orange-400 transition duration-300"
      >
        Start Scanning
      </button>

      {/* Scan Result */}
      {scanResult && (
        <div className="mt-6 p-6 border-2 border-gray-700 rounded-2xl bg-gray-800 shadow-lg">
          <h2 className="text-xl text-white mb-4">Scan Result</h2>
          <p className="text-white">{scanResult.text}</p>
        </div>
      )}
    </div>
  );
};

export default QRReader;
