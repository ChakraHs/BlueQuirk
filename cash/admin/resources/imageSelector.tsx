"use client";

import {
  useRecordContext,
  useDataProvider,
  useNotify,
  useInput,
} from "react-admin";
import { useEffect, useState } from "react";

// Modal component for selecting images
const MediaLibraryModal = ({
  open,
  onClose,
  images,
  selectedImages,
  toggleImage,
  backendUrl,
}: {
  open: boolean;
  onClose: () => void;
  images: any[];
  selectedImages: any[];
  toggleImage: (img: any) => void;
  backendUrl: string;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg w-4/5 max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Select Images</h2>
        <div className="grid grid-cols-4 gap-4">
          {images.map((img) => {
            const isSelected = selectedImages.some((sel) => sel.id === img.id);
            return (
              <div
                key={img.id}
                className={`border rounded-lg p-2 text-center cursor-pointer transition-transform hover:scale-105 ${
                  isSelected ? "border-blue-500 ring-2 ring-blue-400" : ""
                }`}
                onClick={() => toggleImage(img)}
              >
                <img
                  src={`${backendUrl}${img.url}`}
                  alt={img.fileName}
                  className="w-full h-24 object-cover rounded mb-2"
                />
                <p className="text-sm">{img.fileName}</p>
                <p className="text-xs text-gray-500">
                  {isSelected ? "✅ Selected" : "Click to select"}
                </p>
              </div>
            );
          })}
        </div>
        <button
          className="mt-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

const ImageSelector = () => {
  const record = useRecordContext();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const { field } = useInput({ source: "images" });

  const [allImages, setAllImages] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const BACKEND_URL = "http://localhost:8080";

  // Fetch all images from backend with auth
  const fetchImages = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const response = await fetch(`${BACKEND_URL}/api/images`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch images");
      const data = await response.json();
      setAllImages(data);
    } catch (err) {
      console.error(err);
      notify("Error fetching images", { type: "error" });
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  useEffect(() => {
    if (!record) return;

    const initialSelected =
      Array.isArray(field.value) && field.value.length > 0
        ? field.value
        : Array.isArray(record.images)
        ? record.images
        : [];

    setSelectedImages(initialSelected);
    field.onChange(initialSelected);
  }, [record]);

  // Update form field whenever selection changes
  useEffect(() => {
    field.onChange(selectedImages);
  }, [selectedImages]);

  const toggleImage = (img: any) => {
    const alreadySelected = selectedImages.some((sel) => sel.id === img.id);
    setSelectedImages((prev) =>
      alreadySelected
        ? prev.filter((sel) => sel.id !== img.id)
        : [...prev, { id: img.id, fileName: img.fileName, url: img.url }]
    );
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("access_token");

    try {
      const response = await fetch(`${BACKEND_URL}/api/images`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      if (!response.ok) throw new Error("Upload failed");

      const newImage = await response.json();
      notify("Image uploaded successfully", { type: "success" });

      setAllImages((prev) => [...prev, newImage]);
      setSelectedImages((prev) => [
        ...prev,
        { id: newImage.id, fileName: newImage.fileName, url: newImage.url },
      ]);
      setPreview(null);
    } catch (err) {
      console.error(err);
      notify("Image upload failed", { type: "error" });
    } finally {
      setUploading(false);
    }

    e.target.value = "";
  };

  if (!record) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold mt-6 mb-2">Images</h2>

      {/* Selected images */}
      <div className="flex flex-wrap gap-4 mb-4">
        {selectedImages.map((img) => (
          <div
            key={img.id}
            className="border rounded-lg p-2 relative w-32 h-32 flex flex-col items-center justify-center"
          >
            <img
              src={`${BACKEND_URL}${img.url}`}
              alt={img.fileName}
              className="w-full h-full object-cover rounded"
            />
            <button
              type="button"
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
              onClick={() => toggleImage(img)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Upload and Media Library */}
      <div className="flex gap-4">
        <label className="cursor-pointer px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
          {uploading ? "Uploading..." : "Upload New Image"}
          <input
            type="file"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>

        <button
          type="button"
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          onClick={() => setModalOpen(true)}
        >
          Select from Media Library
        </button>
      </div>

      {/* Media Library Modal */}
      <MediaLibraryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        images={allImages}
        selectedImages={selectedImages}
        toggleImage={toggleImage}
        backendUrl={BACKEND_URL}
      />
    </div>
  );
};

export default ImageSelector;
