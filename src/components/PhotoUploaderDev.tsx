import { useState } from 'react';

export default function PhotoUploaderDev() {
  const [status, setStatus] = useState('');
  
  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded">
      <h2 className="text-lg font-semibold mb-2">Photo Uploader</h2>
      <p className="text-gray-600">Photo uploader component placeholder</p>
      {status && <p className="mt-2 text-sm">{status}</p>}
    </div>
  );
}