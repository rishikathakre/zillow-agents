import { useState } from "react";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PhotoGallery({ address, photos = [], onSavePhotos }) {
  const [lightbox, setLightbox] = useState(null);
  const [dragging, setDragging] = useState(false);

  async function processFiles(files) {
    const limited = Array.from(files).slice(0, 10 - photos.length);
    if (!limited.length) return;
    const encoded = await Promise.all(limited.map(readFileAsDataUrl));
    onSavePhotos(address || "__draft__", [...photos, ...encoded]);
  }

  function handleInput(e) {
    processFiles(e.target.files);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }

  function removePhoto(index) {
    const next = photos.filter((_, i) => i !== index);
    onSavePhotos(address || "__draft__", next);
  }

  return (
    <div className="space-y-5">
      {/* Upload zone */}
      <label
        className={`flex min-h-40 flex-col items-center justify-center rounded-2xl border-2 border-dashed cursor-pointer transition p-8 text-center
          ${dragging ? "border-green-500 bg-green-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <span className="text-3xl mb-2">📷</span>
        <p className="text-sm font-semibold text-slate-700">Drop photos here or click to upload</p>
        <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP — up to 10 photos</p>
        <input type="file" multiple accept="image/*" onChange={handleInput} className="hidden" />
      </label>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {photos.map((src, idx) => (
            <div
              key={idx}
              className={`relative overflow-hidden rounded-xl group cursor-pointer ${idx === 0 ? "md:row-span-2 h-72 md:h-auto" : "h-36"}`}
              onClick={() => setLightbox(src)}
            >
              <img src={src} alt={`Property ${idx + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePhoto(idx); }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
              >
                ✕
              </button>
              {idx === 0 && (
                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  Main Photo
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Full screen" className="max-h-[90vh] max-w-full rounded-2xl shadow-2xl" />
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center text-lg hover:bg-white/20 transition"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
